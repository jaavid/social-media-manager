"""Channel calendar sync, serialized per workspace reader session."""
import json
from datetime import timedelta

from celery import shared_task
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from social_stats.instagram_calendar import build_reader, fetch_public_posts, InstagramReadError
from social_stats.models import CalendarSource, ChannelCalendarPost, InstagramReaderSession


@shared_task(soft_time_limit=240, time_limit=300)
def sync_calendar_source(source_id):
    now = timezone.now()
    source = CalendarSource.objects.filter(pk=source_id, is_active=True).first()
    if not source:
        return
    lease_until = now + timedelta(minutes=6)
    # A blank encrypted row is only a workspace lease, not a login session.
    session, _ = InstagramReaderSession.objects.get_or_create(
        client_id=source.client_id, defaults={'settings_json': ''},
    )
    claimed = InstagramReaderSession.objects.filter(pk=session.pk).filter(
        Q(locked_until__isnull=True) | Q(locked_until__lte=now),
    ).update(locked_until=lease_until)
    if not claimed:
        CalendarSource.objects.filter(pk=source_id).update(sync_status='error', error_code='reader_busy')
        return
    try:
        source.refresh_from_db()
        if source.last_attempt_at and source.last_attempt_at > now - timedelta(minutes=15):
            return
        CalendarSource.objects.filter(pk=source_id).update(
            last_attempt_at=now, sync_status='syncing', error_code='',
        )
        reader = build_reader()
        used_session = False
        try:
            posts = fetch_public_posts(reader, source.username, anonymous=True)
        except InstagramReadError as error:
            if error.code not in {'session_required', 'anonymous_unavailable'}:
                raise
            if not session.settings_json:
                raise InstagramReadError('session_required') from None
            reader = build_reader(session.settings_json)
            posts = fetch_public_posts(reader, source.username)
            used_session = True
        with transaction.atomic():
            # Do not recreate content if its source was removed/disabled during I/O.
            current = CalendarSource.objects.select_for_update().filter(pk=source_id, is_active=True).first()
            if not current:
                return
            for post in posts:
                external_id = post.pop('external_id')
                ChannelCalendarPost.objects.update_or_create(
                    source=current, external_id=external_id, defaults=post,
                )
            if used_session:
                InstagramReaderSession.objects.filter(pk=session.pk).update(
                    settings_json=json.dumps(reader.get_settings()),
                )
            CalendarSource.objects.filter(pk=source_id).update(
                last_synced_at=timezone.now(), sync_status='ok', error_code='',
            )
    except Exception as exc:
        # Do not log SDK exceptions: they can contain cookies, tokens and raw responses.
        code = exc.code if isinstance(exc, InstagramReadError) else 'fetch_failed'
        CalendarSource.objects.filter(pk=source_id).update(sync_status='error', error_code=code)
    finally:
        InstagramReaderSession.objects.filter(
            client_id=source.client_id, locked_until=lease_until,
        ).update(locked_until=None)


@shared_task
def sync_calendar_sources():
    # Spread reads across the day instead of bursting one reader's requests.
    for index, source_id in enumerate(CalendarSource.objects.filter(
        is_active=True,
    ).values_list('id', flat=True)):
        sync_calendar_source.apply_async(args=[source_id], countdown=index * 60)
