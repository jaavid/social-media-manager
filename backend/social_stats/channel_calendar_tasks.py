"""Channel calendar sync, serialized per workspace reader session."""
import json
import logging
from datetime import timedelta

from celery import shared_task
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from social_stats.instagram_calendar import build_reader, fetch_public_posts, InstagramReadError
from social_stats.models import CalendarSource, ChannelCalendarPost, InstagramReaderSession, ChannelPostObservation
from social_stats import brightdata_calendar

logger = logging.getLogger(__name__)


@shared_task(soft_time_limit=240, time_limit=300)
def sync_calendar_source(source_id, snapshot_id=None):
    now = timezone.now()
    source = CalendarSource.objects.filter(pk=source_id, is_active=True).first()
    if not source or not source.client.is_active or source.client.is_processing_paused:
        return
    # Delayed deliveries from an older collection must not start a new paid job.
    if snapshot_id and snapshot_id != source.provider_snapshot_id:
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
        if snapshot_id:
            sync_calendar_source.apply_async(args=[source_id], kwargs={'snapshot_id': snapshot_id}, countdown=60)
            return
        CalendarSource.objects.filter(pk=source_id).update(sync_status='error', error_code='reader_busy')
        return
    try:
        source.refresh_from_db()
        if snapshot_id and snapshot_id != source.provider_snapshot_id:
            return
        if not source.provider_snapshot_id and source.last_attempt_at and source.last_attempt_at > now - timedelta(minutes=15):
            return
        updates = {'sync_status': 'syncing', 'error_code': ''}
        if not source.provider_snapshot_id:
            updates['last_attempt_at'] = now
        CalendarSource.objects.filter(pk=source_id).update(**updates)
        used_session = False
        if source.provider_snapshot_id or brightdata_calendar.calendar_provider() == 'brightdata':
            if source.provider_snapshot_id:
                if not source.provider_started_at or source.provider_started_at < now - timedelta(minutes=30):
                    raise InstagramReadError('brightdata_timeout')
                posts = brightdata_calendar.fetch_snapshot(source.provider_snapshot_id, source.username)
            else:
                source.provider_snapshot_id = brightdata_calendar.start_discovery(source.username)
                CalendarSource.objects.filter(pk=source_id).update(
                    provider_snapshot_id=source.provider_snapshot_id, provider_started_at=now,
                )
                posts = None
            if posts is None:
                sync_calendar_source.apply_async(args=[source_id], kwargs={
                    'snapshot_id': source.provider_snapshot_id,
                }, countdown=60)
                logger.info('calendar_sync_pending', extra={'source_id': source_id})
                return
        else:
            reader = build_reader()
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
                # Provider switches can use a shortcode instead of a numeric PK.
                shortcode = post['post_url'].rstrip('/').rsplit('/', 1)[-1]
                existing = ChannelCalendarPost.objects.filter(
                    source=current, post_url__endswith=f'/{shortcode}/',
                ).first()
                if existing:
                    external_id = existing.external_id
                saved_post, _ = ChannelCalendarPost.objects.update_or_create(
                    source=current, external_id=external_id, defaults=post,
                )
                ChannelPostObservation.objects.create(
                    post=saved_post, metrics=post['metrics'],
                    provider='brightdata' if source.provider_snapshot_id else 'instagrapi',
                )
            if used_session:
                InstagramReaderSession.objects.filter(pk=session.pk).update(
                    settings_json=json.dumps(reader.get_settings()),
                )
            CalendarSource.objects.filter(pk=source_id).update(
                last_synced_at=timezone.now(), sync_status='ok', error_code='',
                provider_snapshot_id='', provider_started_at=None,
            )
        logger.info('calendar_sync_completed', extra={'source_id': source_id, 'post_count': len(posts)})
    except Exception as exc:
        # Do not log SDK exceptions: they can contain cookies, tokens and raw responses.
        code = exc.code if isinstance(exc, InstagramReadError) else 'fetch_failed'
        CalendarSource.objects.filter(pk=source_id).update(sync_status='error', error_code=code)
        # Keep the snapshot on transient failures so a later attempt downloads the
        # same collection instead of submitting another potentially billable job.
        if code in {'brightdata_timeout', 'brightdata_collection_failed', 'brightdata_invalid_response'}:
            CalendarSource.objects.filter(pk=source_id).update(provider_snapshot_id='', provider_started_at=None)
        logger.warning('calendar_sync_failed', extra={'source_id': source_id, 'error_code': code})
    finally:
        InstagramReaderSession.objects.filter(
            client_id=source.client_id, locked_until=lease_until,
        ).update(locked_until=None)


@shared_task
def sync_calendar_sources():
    # Spread reads across the day instead of bursting one reader's requests.
    for index, source_id in enumerate(CalendarSource.objects.filter(
        is_active=True, client__is_active=True, client__is_processing_paused=False,
    ).values_list('id', flat=True)):
        sync_calendar_source.apply_async(args=[source_id], countdown=index * 60)
