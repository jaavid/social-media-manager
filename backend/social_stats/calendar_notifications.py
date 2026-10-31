"""Persist user-facing calendar collection failures in the notification bell.

Only currently authorized workspace participants receive a notification.
Back-end provider error codes stay in structured metadata, not notification
copy. Identical failures are deduplicated for six hours per user/source/code.
"""
import logging
from datetime import timedelta

from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from social_stats.authorization import accessible_workspaces, evaluate
from social_stats.models import (CalendarSource, Notification, WorkspaceMemberPolicy,
                                 AgencyMembership, StaffClientAssignment)
from social_stats.notification_dispatcher import dispatch, is_channel_enabled

logger = logging.getLogger(__name__)


def notify_calendar_source_failure(source_id: int, error_code: str) -> int:
    """Best-effort side effect; never abort the collection task."""
    try:
        return _notify_calendar_source_failure(source_id, error_code)
    except Exception:
        logger.exception('calendar_failure_notification_failed', extra={'source_id': source_id})
        return 0


def _notify_calendar_source_failure(source_id: int, error_code: str) -> int:
    source = CalendarSource.objects.select_related('client').filter(
        pk=source_id, is_active=True,
    ).first()
    if not source:
        return 0

    agency_members = AgencyMembership.objects.filter(
        is_active=True, agency__managed_clients__client_id=source.client_id,
        agency__managed_clients__status='active',
    ).values('user_id')
    assigned_staff = StaffClientAssignment.objects.filter(
        client_id=source.client_id,
    ).values('staff_profile__user_id')
    participants = User.objects.filter(is_active=True).filter(
        Q(profile__role='superadmin')
        | Q(id__in=agency_members)
        | Q(id__in=assigned_staff)
        | Q(id=source.client.owner_user_id)
        | Q(profile__client_id=source.client_id)
        | Q(profile__assigned_clients__id=source.client_id)
        | Q(id__in=WorkspaceMemberPolicy.objects.filter(
            workspace_id=source.client_id, is_active=True,
        ).values('user_id'))
    ).distinct()
    cutoff = timezone.now() - timedelta(hours=6)
    count = 0
    for user in participants.iterator():
        if not accessible_workspaces(user).filter(pk=source.client_id).exists():
            continue
        if not evaluate(user, source.client, 'view_posts', account=source.social_account).allowed:
            continue
        if not is_channel_enabled(user, 'calendar_sync_failed', 'in_app'):
            continue
        try:
            # Lock a stable recipient row so concurrent Celery workers cannot
            # both pass the dedup check for this user/source/error combination.
            with transaction.atomic():
                User.objects.select_for_update().get(pk=user.pk)
                if Notification.objects.filter(
                    user=user, client_id=source.client_id, created_at__gte=cutoff,
                    data__calendar_source_id=source.pk, data__error_code=error_code,
                ).exists():
                    continue
                note = dispatch(
                    user, event_type='calendar_sync_failed',
                    title='دریافت محتوای کانال انجام نشد',
                    body=f'دریافت پست‌های @{source.username} ناموفق بود. بعداً دوباره تلاش کنید.',
                    data={'calendar_source_id': source.pk, 'error_code': error_code,
                          'workspace_id': source.client_id},
                    channels=['in_app'],
                )
                if note:
                    Notification.objects.filter(pk=note.pk).update(client_id=source.client_id)
                    count += 1
        except Exception:
            # Notification delivery must not abort the collection task or cause
            # duplicate billable requests on retry.
            logger.exception('calendar_failure_notification_failed', extra={'source_id': source.pk})
    return count
