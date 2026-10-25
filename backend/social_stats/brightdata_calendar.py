"""Bounded Instagram post discovery through Bright Data's asynchronous REST API."""
import math
import os
import re
from urllib.parse import urlsplit

import requests
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from social_stats.egress.router import gateway_key, gateway_url, outbound_request
from social_stats.instagram_calendar import InstagramReadError, normalize_username

ORIGIN = 'https://api.brightdata.com'
DATASET_ID = 'gd_lk5ns7kz21pck8jpis'


def calendar_provider():
    provider = os.getenv('INSTAGRAM_CALENDAR_PROVIDER', 'instagrapi').strip().lower()
    if provider not in {'instagrapi', 'brightdata'}:
        raise InstagramReadError('provider_invalid')
    return provider


def post_limit():
    try:
        return max(1, min(50, int(os.getenv('BRIGHTDATA_CALENDAR_POST_LIMIT', '5'))))
    except ValueError:
        raise InstagramReadError('brightdata_not_configured') from None


def _request(method, path, **kwargs):
    token = os.getenv('BRIGHTDATA_API_KEY', '').strip()
    if not token:
        raise InstagramReadError('brightdata_not_configured')
    try:
        if not gateway_key() or not gateway_url():
            raise InstagramReadError('gateway_required')
        response = outbound_request(
            'brightdata', method, ORIGIN + path, mode='gateway',
            headers={'Authorization': f'Bearer {token}'},
            allow_redirects=False, timeout=(10, 45), proxies={}, verify=True, **kwargs,
        )
    except InstagramReadError:
        raise
    except (requests.RequestException, ValueError, RuntimeError):
        raise InstagramReadError('brightdata_unavailable') from None
    try:
        if response.status_code == 429:
            raise InstagramReadError('rate_limited')
        if response.status_code in {401, 403}:
            raise InstagramReadError('brightdata_access_denied')
        if response.status_code == 402:
            raise InstagramReadError('brightdata_quota')
        if not 200 <= response.status_code < 300:
            raise InstagramReadError('brightdata_unavailable')
        try:
            return response.json()
        except ValueError:
            raise InstagramReadError('brightdata_invalid_response') from None
    finally:
        response.close()


def start_discovery(username):
    username = normalize_username(username)
    limit = post_limit()
    payload = _request('POST', '/datasets/v3/trigger', params={
        'dataset_id': DATASET_ID, 'type': 'discover_new', 'discover_by': 'url',
        'limit_per_input': limit, 'include_errors': 'true', 'format': 'json',
    }, json=[{'url': f'https://www.instagram.com/{username}/', 'num_of_posts': limit}])
    snapshot = payload.get('snapshot_id') if isinstance(payload, dict) else None
    if not isinstance(snapshot, str) or not re.fullmatch(r's_[A-Za-z0-9_-]{1,100}', snapshot):
        raise InstagramReadError('brightdata_invalid_response')
    return snapshot


def fetch_snapshot(snapshot, username):
    if not re.fullmatch(r's_[A-Za-z0-9_-]{1,100}', snapshot):
        raise InstagramReadError('brightdata_invalid_response')
    progress = _request('GET', f'/datasets/v3/progress/{snapshot}')
    status = progress.get('status') if isinstance(progress, dict) else None
    if status in {'starting', 'running'}:
        return None
    if status != 'ready':
        raise InstagramReadError('brightdata_collection_failed')
    rows = _request('GET', f'/datasets/v3/snapshot/{snapshot}', params={'format': 'json'})
    return normalize_posts(rows, username)


def normalize_posts(rows, username):
    if not isinstance(rows, list):
        raise InstagramReadError('brightdata_invalid_response')
    posts = []
    for row in rows[:50]:
        if not isinstance(row, dict) or row.get('error') or row.get('error_code'):
            raise InstagramReadError('brightdata_collection_failed')
        if str(row.get('user_posted', '')).lower().lstrip('@') != username.lower():
            raise InstagramReadError('brightdata_invalid_response')
        try:
            url = urlsplit(str(row.get('url') or ''))
            port = url.port
        except ValueError:
            raise InstagramReadError('brightdata_invalid_response') from None
        match = re.fullmatch(r'/(p|reel|tv)/([A-Za-z0-9_-]+)/?', url.path)
        if (url.scheme != 'https' or url.hostname not in {'instagram.com', 'www.instagram.com'}
                or url.username or url.password or port not in {None, 443} or not match):
            raise InstagramReadError('brightdata_invalid_response')
        date_value = row.get('date_posted')
        try:
            published = parse_datetime(date_value) if isinstance(date_value, str) else None
        except ValueError:
            published = None
        if published is None or timezone.is_naive(published):
            raise InstagramReadError('brightdata_invalid_response')
        metrics = {}
        for target, field in [('likes', 'likes'), ('comments', 'num_comments'), ('video_views', 'video_view_count')]:
            value = row.get(field)
            if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and value >= 0:
                metrics[target] = int(value)
        photos = row.get('photos') or []
        videos = row.get('videos') or []
        kind = ('reel' if match[1] == 'reel' or row.get('product_type') == 'clips' else
                'carousel' if isinstance(photos, list) and len(photos) > 1 else
                'video' if videos else 'image')
        thumbnail = row.get('thumbnail') or (photos[0] if isinstance(photos, list) and photos else '')
        thumbnail = thumbnail if isinstance(thumbnail, str) and thumbnail.startswith('https://') else ''
        external_id = str(row.get('pk') or row.get('post_id') or match[2])
        if len(external_id) > 300:
            raise InstagramReadError('brightdata_invalid_response')
        posts.append({
            # Instagram's numeric PK matches instagrapi; shortcode is a safe fallback.
            'external_id': external_id,
            'caption': str(row.get('description') or ''), 'post_type': kind,
            'post_url': f'https://www.instagram.com/{match[1]}/{match[2]}/',
            'media_url': thumbnail, 'published_at': published, 'metrics': metrics,
        })
    return posts
