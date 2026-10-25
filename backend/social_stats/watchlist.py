"""Shared public-account identity and collection enrollment, scoped to a workspace."""
import logging

from django.db import transaction

from .instagram_calendar import normalize_username
from .models import CalendarSource, SocialAccount, Client

logger = logging.getLogger(__name__)


def enqueue_source(source_id):
    from .channel_calendar_tasks import sync_calendar_source
    try:
        sync_calendar_source.delay(source_id)
    except Exception:
        # Enrollment is durable; the daily sweep will retry broker failures.
        logger.warning('watchlist_enqueue_failed', extra={'source_id': source_id})


def enroll_instagram(workspace, username, *, account=None, competitor=None):
    if not isinstance(username, str):
        raise ValueError('Instagram handle must be a string')
    username = normalize_username(username)
    with transaction.atomic():
        Client.objects.select_for_update().get(pk=workspace.pk)
        source, created = CalendarSource.objects.get_or_create(client=workspace, username=username)
        if account is None:
            account = source.social_account or SocialAccount.objects.filter(
                client=workspace, platform='instagram', username__iexact=username,
            ).order_by('pk').first()
        if account is None:
            account, _ = SocialAccount.objects.get_or_create(
                client=workspace, platform='instagram', external_id=f'public:{username}',
                defaults={'username': username, 'display_name': username},
            )
        if account.client_id != workspace.pk or account.platform != 'instagram':
            raise ValueError('Account does not belong to this workspace/platform')
        changed = source.social_account_id != account.pk
        source.social_account = account
        if competitor is not None:
            if competitor.client_id != workspace.pk:
                raise ValueError('Competitor does not belong to this workspace')
            source.competitor = competitor
        source.save(update_fields=['social_account', 'competitor'])
        if (created or changed) and source.is_active:
            transaction.on_commit(lambda: enqueue_source(source.pk))
        return source
