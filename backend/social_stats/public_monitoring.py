"""Shared public cache, durable batches and workspace-scoped projections."""
import copy
import math
import os
from datetime import timedelta
from urllib.parse import urlsplit

from celery import shared_task
from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from social_stats import brightdata_calendar as provider
from social_stats.instagram_calendar import InstagramReadError, normalize_username
from social_stats.models import (CalendarSource, ChannelCalendarPost, ChannelPostObservation,
                                 PublicCollection, PublicObservation, PublicProfile, PublicSyncControl, PublicPostRecord)

REFRESH = timedelta(hours=48)
ACTIVE = ('queued', 'submitting', 'running')


def can_read_competitor_instagram(user, competitor):
    from social_stats.authorization import evaluate
    sources = competitor.calendar_sources.filter(platform='instagram', is_active=True).select_related('social_account')
    return any(evaluate(user, competitor.client, 'view_posts', account=source.social_account).allowed for source in sources)


def active_sources():
    return CalendarSource.objects.filter(platform='instagram', is_active=True,
        client__is_active=True, client__is_processing_paused=False)


def attach_source(source):
    profile, _ = PublicProfile.objects.get_or_create(platform='instagram', username=normalize_username(source.username))
    CalendarSource.objects.filter(pk=source.pk).update(public_profile=profile)
    source.public_profile = profile
    return profile


def number(value):
    return (value if isinstance(value, (int, float)) and not isinstance(value, bool)
            and math.isfinite(value) and value >= 0 else None)


def safe_url(value):
    if not isinstance(value, str):
        return ''
    try:
        url = urlsplit(value)
        return value if url.scheme == 'https' and url.hostname and not url.username and not url.password else ''
    except ValueError:
        return ''


def profile_data(row, username):
    if row.get('error') or row.get('error_code'):
        raise InstagramReadError('brightdata_collection_failed')
    if row.get('is_private') is not False:
        raise InstagramReadError('private_profile')
    result = {'username': username, 'url': f'https://www.instagram.com/{username}/'}
    for key in ('id', 'full_name', 'biography', 'business_category_name', 'category_name'):
        value = row.get(key)
        if isinstance(value, (str, int)) and not isinstance(value, bool):
            result[key] = str(value)[:5000]
    for key in ('followers', 'following', 'posts_count'):
        value = number(row.get(key))
        if value is not None:
            result[key] = int(value)
    for key in ('is_verified', 'is_business_account', 'is_professional_account'):
        if isinstance(row.get(key), bool):
            result[key] = row[key]
    for key in ('profile_image_link', 'external_url'):
        result[key] = safe_url(row.get(key))
    return result


def post_details(row):
    result = {}
    for key in ('hashtags', 'tagged_users'):
        if isinstance(row.get(key), list):
            result[key] = [str(value)[:300] for value in row[key][:100] if isinstance(value, (str, int))]
    for key in ('location', 'content_type', 'product_type'):
        if isinstance(row.get(key), str):
            result[key] = row[key][:500]
    for key in ('photos', 'videos'):
        if isinstance(row.get(key), list):
            result[key] = [url for value in row[key][:50] if (url := safe_url(value))]
    return result


def project_source(source, profile):
    """Copy only public facts to an authorized workspace's existing read models."""
    with transaction.atomic():
        source = active_sources().select_for_update().filter(pk=source.pk, public_profile=profile).first()
        if not source:
            return
        stored = list(profile.stored_posts.all())
        records = [(item.data, item.observed_at) for item in stored] or [(item, profile.posts_fetched_at) for item in profile.posts]
        for item, observed_at in records:
            post = copy.deepcopy(item)
            post['published_at'] = parse_datetime(post['published_at'])
            external_id = post.pop('external_id')
            shortcode = post['post_url'].rstrip('/').rsplit('/', 1)[-1]
            existing = ChannelCalendarPost.objects.filter(source=source, post_url__endswith=f'/{shortcode}/').first()
            if existing:
                external_id = existing.external_id
            previous = existing.observed_at if existing else None
            if existing and previous and observed_at and previous >= observed_at:
                continue
            saved, _ = ChannelCalendarPost.objects.update_or_create(source=source, external_id=external_id,
                defaults={**post, 'observed_at': observed_at})
            if previous != observed_at:
                observation = ChannelPostObservation.objects.create(post=saved, provider='brightdata', metrics=saved.metrics)
                ChannelPostObservation.objects.filter(pk=observation.pk).update(observed_at=observed_at)
        if profile.posts_fetched_at:
            CalendarSource.objects.filter(pk=source.pk).update(last_synced_at=profile.posts_fetched_at)
        if source.competitor_id and profile.profile_fetched_at:
            # Unknown public metrics stay absent; do not manufacture owned analytics.
            from social_stats.models import CompetitorSnapshot
            data = profile.profile
            stats = sample_metrics(profile)
            if data.get('followers') is not None:
                CompetitorSnapshot.objects.update_or_create(competitor_id=source.competitor_id, platform='instagram',
                    date=profile.profile_fetched_at.date(), defaults={
                        'followers': data['followers'], 'posts_count': data.get('posts_count'),
                        'engagement_rate': stats['engagement_rate'], 'avg_likes': stats['avg_likes'], 'avg_comments': stats['avg_comments'],
                        'raw': {'public_profile': data, 'observed_at': profile.profile_fetched_at.isoformat()},
                    })
                from social_stats.models import Competitor
                competitor = Competitor.objects.select_for_update().get(pk=source.competitor_id)
                history = dict(competitor.follower_history or {})
                day = profile.profile_fetched_at.date().isoformat()
                series = [item for item in history.get('instagram', []) if item.get('date') != day]
                history['instagram'] = (series + [{'date': day, 'n': data['followers']}])[-365:]
                Competitor.objects.filter(pk=competitor.pk).update(follower_history=history, last_synced_at=profile.profile_fetched_at)


def sample_metrics(profile):
    metrics = [post.get('metrics', {}) for post in profile.posts]
    likes = [row['likes'] for row in metrics if number(row.get('likes')) is not None]
    comments = [row['comments'] for row in metrics if number(row.get('comments')) is not None]
    interactions = [row['likes'] + row['comments'] for row in metrics
                    if number(row.get('likes')) is not None and number(row.get('comments')) is not None]
    followers = profile.profile.get('followers')
    return {'sample_size': len(metrics), 'avg_likes': sum(likes) / len(likes) if likes else None,
            'avg_comments': sum(comments) / len(comments) if comments else None,
            'engagement_rate': (sum(interactions) / len(interactions) / followers * 100
                                if interactions and followers else None)}


def profile_summary(profile):
    if not profile:
        return None
    if (not profile.profile and not profile.posts_fetched_at
            and not profile.profile_collection_id and not profile.posts_collection_id):
        try:
            if provider.calendar_provider() != 'brightdata':
                return None
        except InstagramReadError:
            return None
    jobs = [profile.profile_collection, profile.posts_collection]
    pending = any(job and job.status in ACTIVE for job in jobs)
    errors = [error for error in (profile.profile_error, profile.posts_error) if error]
    errors += [job.error_code for job in jobs if job and job.error_code]
    dates = [date for date in (profile.profile_fetched_at, profile.posts_fetched_at) if date]
    return {'profile': profile.profile, 'sample_metrics': sample_metrics(profile), 'profile_fetched_at': profile.profile_fetched_at,
            'posts_fetched_at': profile.posts_fetched_at,
            'next_refresh_at': min(dates) + REFRESH if len(dates) == 2 else None,
            'status': 'syncing' if pending else 'error' if errors else 'ok' if len(dates) == 2 else 'partial' if dates else 'idle',
            'error_code': errors[0] if errors else '', 'refresh_hours': 48}


@shared_task
def dispatch_public_collections():
    if provider.calendar_provider() != 'brightdata':
        return
    # Backfill links without paid I/O. Source creation also links immediately.
    for source in active_sources().filter(public_profile__isnull=True).iterator():
        attach_source(source)
    for source in active_sources().select_related('public_profile').iterator():
        project_source(source, source.public_profile)
    for job in PublicCollection.objects.filter(status__in=ACTIVE).values_list('pk', flat=True):
        collect_public_batch.delay(job)
    now = timezone.now()
    cutoff = now - REFRESH
    batch_size = max(1, min(100, int(os.getenv('BRIGHTDATA_BATCH_SIZE', '25'))))
    daily_limit = max(0, int(os.getenv('BRIGHTDATA_DAILY_RECORD_LIMIT', '2000')))
    PublicSyncControl.objects.get_or_create(pk=1)
    jobs = []
    with transaction.atomic():
        PublicSyncControl.objects.select_for_update().get(pk=1)
        reserved = PublicCollection.objects.filter(created_at__gte=now.replace(hour=0, minute=0, second=0, microsecond=0)).aggregate(
            total=Sum('reserved_records'))['total'] or 0
        remaining = max(0, daily_limit - reserved)
        for kind in ('profile', 'posts'):
            relation = f'{kind}_collection'
            fetched = 'profile_fetched_at' if kind == 'profile' else 'posts_fetched_at'
            limit = 1 if kind == 'profile' else provider.post_limit()
            candidates = PublicProfile.objects.filter(pk__in=active_sources().values('public_profile_id')).exclude(
                pk__in=active_sources().exclude(provider_snapshot_id='').values('public_profile_id'),
            ).filter(
                Q(**{f'{fetched}__isnull': True}) | Q(**{f'{fetched}__lte': cutoff}),
            ).filter(Q(**{f'{relation}__isnull': True}) | (
                Q(**{f'{relation}__created_at__lte': cutoff}) & ~Q(**{f'{relation}__status__in': ACTIVE})),
            ).order_by('pk')
            ids = list(candidates.values_list('pk', flat=True)[:remaining // limit])
            for start in range(0, len(ids), batch_size):
                group = ids[start:start + batch_size]
                job = PublicCollection.objects.create(kind=kind, reserved_records=len(group) * limit,
                                                      post_limit=provider.post_limit())
                PublicProfile.objects.filter(pk__in=group).update(**{relation: job})
                jobs.append(job.pk)
                remaining -= len(group) * limit
    for job_id in jobs:
        collect_public_batch.delay(job_id)


@shared_task(soft_time_limit=240, time_limit=300)
def collect_public_batch(job_id):
    now = timezone.now()
    lease = now + timedelta(minutes=6)
    claimed = PublicCollection.objects.filter(pk=job_id, status__in=ACTIVE).filter(
        Q(locked_until__isnull=True) | Q(locked_until__lte=now),
    ).update(locked_until=lease)
    if not claimed:
        return
    job = PublicCollection.objects.get(pk=job_id)
    relation = 'profile_collection' if job.kind == 'profile' else 'posts_collection'
    targets = list(PublicProfile.objects.filter(**{relation: job}))
    try:
        if job.status == 'submitting' and not job.snapshot_id:
            # A worker may have died after a paid POST. Never blindly resubmit it.
            raise InstagramReadError('brightdata_submission_unknown')
        if now - job.created_at > timedelta(hours=2):
            raise InstagramReadError('brightdata_timeout')
        if not job.snapshot_id:
            usernames = [target.username for target in targets if active_sources().filter(public_profile=target).exists()]
            if not usernames:
                PublicCollection.objects.filter(pk=job_id).update(status='cancelled')
                return
            PublicCollection.objects.filter(pk=job_id).update(status='submitting')
            snapshot = provider.start_batch(usernames, job.kind, limit=job.post_limit)
            PublicCollection.objects.filter(pk=job_id).update(snapshot_id=snapshot, status='running')
            job.snapshot_id = snapshot
            collect_public_batch.apply_async(args=[job_id], countdown=60)
            return
        rows = provider.download_snapshot(job.snapshot_id)
        if rows is None:
            collect_public_batch.apply_async(args=[job_id], countdown=60)
            return
        if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
            raise InstagramReadError('brightdata_invalid_response')
        grouped = {target.username: [] for target in targets}
        for row in rows:
            owner = row.get('account') if job.kind == 'profile' else row.get('user_posted')
            # Error rows may only carry the original input URL.
            if not owner and isinstance(row.get('input'), dict):
                owner = row['input'].get('url')
            try:
                owner = normalize_username(owner)
            except (ValueError, TypeError):
                raise InstagramReadError('brightdata_invalid_response') from None
            if owner not in grouped:
                raise InstagramReadError('brightdata_invalid_response')
            grouped[owner].append(row)
        for target in targets:
            records = grouped[target.username]
            observation, _ = PublicObservation.objects.get_or_create(profile=target, collection=job, defaults={'raw': records})
            if observation.applied:
                continue
            try:
                if not records:
                    raise InstagramReadError('brightdata_empty_result')
                with transaction.atomic():
                    if job.kind == 'profile':
                        if len(records) != 1:
                            raise InstagramReadError('brightdata_invalid_response')
                        target.profile = profile_data(records[0], target.username)
                        target.profile_fetched_at = now
                        target.save(update_fields=['profile', 'profile_fetched_at'])
                        # Retain usable embedded content even if the separate posts job fails.
                        # A profile sample never overwrites richer post metrics or marks a full posts sync successful.
                        try:
                            sample = provider.normalize_posts(records, target.username)
                        except InstagramReadError:
                            sample = []
                        for post in sample:
                            post['published_at'] = post['published_at'].isoformat()
                            existing = target.stored_posts.filter(data__post_url=post['post_url']).exists()
                            if not existing:
                                PublicPostRecord.objects.get_or_create(profile=target, external_id=post['external_id'],
                                    defaults={'data': post, 'observed_at': now})
                    else:
                        posts = provider.normalize_posts(records[:job.post_limit], target.username)
                        for post, row in zip(posts, records):
                            post['published_at'] = post['published_at'].isoformat()
                            post['details'] = post_details(row)
                        for post in posts:
                            saved = target.stored_posts.filter(data__post_url=post['post_url']).first()
                            PublicPostRecord.objects.update_or_create(profile=target,
                                external_id=saved.external_id if saved else post['external_id'],
                                defaults={'data': post, 'observed_at': now})
                        target.posts = posts
                        target.posts_fetched_at = now
                        target.save(update_fields=['posts', 'posts_fetched_at'])
                    for source in active_sources().filter(public_profile=target):
                        project_source(source, target)
                    PublicProfile.objects.filter(pk=target.pk).update(**{f'{job.kind}_error': ''})
                    target.refresh_from_db()
                    errors = [error for error in (target.profile_error, target.posts_error) if error]
                    active_sources().filter(public_profile=target).update(sync_status='error' if errors else 'ok', error_code=errors[0] if errors else '')
                    PublicObservation.objects.filter(pk=observation.pk).update(applied=True)
            except InstagramReadError as error:
                PublicProfile.objects.filter(pk=target.pk).update(**{f'{job.kind}_error': error.code})
                active_sources().filter(public_profile=target).update(sync_status='error', error_code=error.code)
                # Keep successful targets usable even if another target failed.
                continue
        PublicCollection.objects.filter(pk=job_id).update(status='ok', error_code='')
    except Exception as exc:
        code = exc.code if isinstance(exc, InstagramReadError) else 'fetch_failed'
        # Transient download failures retain the snapshot and are retried by the sweep.
        transient = bool(job.snapshot_id and code in {'brightdata_unavailable', 'rate_limited', 'fetch_failed'})
        PublicCollection.objects.filter(pk=job_id).update(status='running' if transient else 'error', error_code=code)
        completed = PublicObservation.objects.filter(collection=job, applied=True).values('profile_id')
        active_sources().filter(public_profile__in=targets).exclude(public_profile_id__in=completed).update(sync_status='error', error_code=code)
    finally:
        PublicCollection.objects.filter(pk=job_id, locked_until=lease).update(locked_until=None)
