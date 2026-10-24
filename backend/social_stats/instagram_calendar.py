"""Bounded, read-only instagrapi adapter. No passwords or SDK errors in API output."""
import json
import os
import re
from urllib.parse import urlparse

from django.utils import timezone


class InstagramReadError(Exception):
    def __init__(self, code):
        self.code = code
        super().__init__(code)


def normalize_username(value):
    value = value.strip()
    if '://' in value:
        parsed = urlparse(value)
        if (parsed.scheme != 'https' or parsed.hostname not in {'instagram.com', 'www.instagram.com'}
                or parsed.username or parsed.password or parsed.port not in {None, 443}):
            raise ValueError('Enter an Instagram username or HTTPS profile URL.')
        value = parsed.path.strip('/')
    value = value.lstrip('@').lower()
    if not re.fullmatch(r'[a-z0-9_](?:[a-z0-9_.]{0,28}[a-z0-9_])?', value) or '..' in value:
        raise ValueError('Enter a valid Instagram username.')
    if value in {'p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'direct'}:
        raise ValueError('Enter a profile, not a post or Instagram navigation URL.')
    return value


def build_reader(settings_json):
    try:
        from instagrapi import Client
    except ImportError:
        raise InstagramReadError('dependency_missing') from None
    try:
        reader = Client()
        reader.set_settings(json.loads(settings_json))
        # Restore the existing session only. Never silently log in with a password.
        if not reader.user_id:
            raise InstagramReadError('session_required')
        reader.request_timeout = 20
        proxy = os.getenv('INSTAGRAPI_PROXY_URL', '').strip()
        if proxy:
            reader.set_proxy(proxy)
        # Background workers cannot prompt for email/SMS verification codes.
        def stop_for_challenge(*args, **kwargs):
            raise InstagramReadError('challenge_required')
        reader.challenge_resolve = stop_for_challenge
        reader.challenge_code_handler = stop_for_challenge
        return reader
    except InstagramReadError:
        raise
    except Exception:
        raise InstagramReadError('session_invalid') from None


def fetch_public_posts(reader, username, amount=50):
    try:
        user = reader.user_info_by_username_v1(username)
        # A reader following a private profile must not make it publicly watchable.
        if user.is_private:
            raise InstagramReadError('private_profile')
        media = reader.user_medias_v1(user.pk, amount=min(amount, 50))
        posts = []
        for item in media:
            if not item.taken_at or not item.code:
                continue
            published_at = item.taken_at
            if timezone.is_naive(published_at):
                from datetime import timezone as dt_timezone
                published_at = published_at.replace(tzinfo=dt_timezone.utc)
            metrics = {}
            for target, attr in [('likes', 'like_count'), ('comments', 'comment_count'),
                                 ('video_views', 'view_count')]:
                value = getattr(item, attr, None)
                if target == 'video_views' and item.media_type != 2:
                    continue
                if value is not None and value >= 0:
                    metrics[target] = int(value)
            if getattr(item, 'like_and_view_counts_disabled', False):
                metrics.pop('likes', None)
                metrics.pop('video_views', None)
            posts.append({
                'external_id': str(item.pk),
                'caption': item.caption_text or '',
                'post_type': ('carousel' if item.media_type == 8 else
                              'reel' if item.product_type == 'clips' else
                              'video' if item.media_type == 2 else 'image'),
                'post_url': f'https://www.instagram.com/p/{item.code}/',
                'media_url': str(item.thumbnail_url or ''),
                'published_at': published_at,
                'metrics': metrics,
            })
        return posts
    except InstagramReadError:
        raise
    except Exception as exc:
        name = type(exc).__name__
        code = {
            'ChallengeRequired': 'challenge_required', 'ChallengeUnknownStep': 'challenge_required',
            'TwoFactorRequired': 'challenge_required', 'LoginRequired': 'session_expired',
            'ClientLoginRequired': 'session_expired', 'ClientUnauthorizedError': 'session_expired',
            'PleaseWaitFewMinutes': 'rate_limited', 'ClientThrottledError': 'rate_limited',
            'FeedbackRequired': 'rate_limited', 'UserNotFound': 'profile_not_found',
        }.get(name, 'fetch_failed')
        raise InstagramReadError(code) from None


def calendar_channel_posts(request, workspace, month=None, year=None, platform=None):
    """Return external posts in the calendar wire format, never owned metrics."""
    from social_stats.authorization import evaluate
    from social_stats.models import ChannelCalendarPost
    if platform and platform != 'instagram':
        return []
    if not evaluate(request.user, workspace, 'view_posts').allowed:
        return []
    qs = ChannelCalendarPost.objects.filter(source__client=workspace).select_related('source')
    if month and year:
        qs = qs.filter(published_at__month=int(month), published_at__year=int(year))
    source_id = request.query_params.get('source_id')
    if source_id:
        qs = qs.filter(source_id=source_id)
    results = []
    for post in qs:
        results.append({
            'id': f'channel:{post.pk}', 'client': workspace.pk, 'platform': post.source.platform,
            'source_id': post.source_id, 'source_username': post.source.username,
            'is_external': True, 'status': 'published', 'post_type': post.post_type,
            'title': f'@{post.source.username}', 'caption': post.caption, 'hashtags': '',
            'post_url': post.post_url, 'media_url': post.media_url,
            'scheduled_at': None, 'published_at': timezone.localtime(post.published_at).isoformat(),
            'external_id': post.external_id, 'fetched_at': post.fetched_at.isoformat(),
            'performance_score': None,
            **{key: post.metrics.get(key) for key in ['likes', 'comments', 'video_views',
                                                     'impressions', 'reach', 'shares', 'saves']},
        })
    return results
