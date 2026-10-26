"""Official SDK Instagram discovery with durable polling and mandatory gateway egress."""
import asyncio
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


def valid_snapshot_id(value):
    # Bright Data returns both s_ and sd_ scraper snapshot identifiers.
    return isinstance(value, str) and re.fullmatch(r's(?:d)?_[A-Za-z0-9_-]{1,100}', value) is not None


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


def _send(method, path, **kwargs):
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
    except Exception:
        response.close()
        raise
    return response


def _request(method, path, **kwargs):
    """Safe read-only diagnostics and recovery; collection uses the official SDK."""
    response = _send(method, path, **kwargs)
    try:
        return response.json()
    except ValueError:
        raise InstagramReadError('brightdata_invalid_response') from None
    finally:
        response.close()


def _sdk_components():
    try:
        from brightdata.scrapers.api_client import DatasetAPIClient
        from brightdata.scrapers.instagram.search import InstagramSearchScraper
        from brightdata.exceptions import DataNotReadyError
        from social_stats.egress.brightdata_sdk import GatewayEngine, DurableDiscoveryWorkflow
    except ImportError:
        raise InstagramReadError('dependency_missing') from None
    return DatasetAPIClient, InstagramSearchScraper, DataNotReadyError, GatewayEngine, DurableDiscoveryWorkflow


def start_discovery(username, *, amount=None):
    username = normalize_username(username)
    limit = post_limit()
    if amount is not None:
        if not isinstance(amount, int) or isinstance(amount, bool) or amount < 1:
            raise InstagramReadError('brightdata_not_configured')
        limit = min(limit, amount)
    token = os.getenv('BRIGHTDATA_API_KEY', '').strip()
    if not token:
        raise InstagramReadError('brightdata_not_configured')
    _, Search, _, Engine, Workflow = _sdk_components()

    async def trigger():
        async with Search(bearer_token=token, engine=Engine(_send)) as search:
            search.workflow_executor = Workflow(
                api_client=search.api_client, platform_name='instagram',
                cost_per_record=search.COST_PER_RECORD, limit=limit,
            )
            return await search.posts(url=f'https://www.instagram.com/{username}/', num_of_posts=limit)

    try:
        result = asyncio.run(trigger())
    except (AttributeError, TypeError, ValueError):
        raise InstagramReadError('brightdata_invalid_response') from None
    snapshot = result.snapshot_id if result.success else None
    if not valid_snapshot_id(snapshot):
        raise InstagramReadError('brightdata_invalid_response')
    return snapshot


def fetch_snapshot(snapshot, username):
    rows = download_snapshot(snapshot)
    return None if rows is None else normalize_posts(rows, username)


def download_snapshot(snapshot):
    if not valid_snapshot_id(snapshot):
        raise InstagramReadError('brightdata_invalid_response')
    APIClient, _, NotReady, Engine, _ = _sdk_components()

    async def download():
        api = APIClient(Engine(_send))
        status = await api.get_status(snapshot)
        if status in {'starting', 'running'}:
            return None
        if status != 'ready':
            raise InstagramReadError('brightdata_collection_failed')
        try:
            return await api.fetch_result(snapshot)
        except NotReady:
            return None

    return asyncio.run(download())


def normalize_posts(rows, username):
    if not isinstance(rows, list):
        raise InstagramReadError('brightdata_invalid_response')
    if not rows:
        # A finished collection with no records is not a successful content sync.
        raise InstagramReadError('brightdata_empty_result')
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
