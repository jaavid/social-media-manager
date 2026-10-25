"""One bounded BoxAPI Data request; no Instagram credentials or project imports."""
import argparse
from datetime import datetime, timezone
import getpass
import json
import os
import re

import httpx


def report(**values):
    print(json.dumps(values, ensure_ascii=False), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('username', nargs='?', default='n5worldiran')
    args = parser.parse_args()
    if not re.fullmatch(r'[A-Za-z0-9_.]{1,30}', args.username):
        parser.error('Pass an Instagram username, not a URL.')
    token = (os.getenv('BOXAPI_TOKEN') or getpass.getpass('BoxAPI token (hidden): ')).strip()
    if not token:
        parser.error('A BoxAPI Data token is required.')
    report(event='start', provider='boxapi', username=args.username, request_limit=1)
    try:
        with httpx.Client(trust_env=False, follow_redirects=False, timeout=60) as client:
            response = client.post(
                'https://boxapi.ir/api/instagram/user/get_media_by_username',
                headers={'Authorization': 'Bearer ' + token},
                json={'username': args.username, 'count': 5},
            )
    except httpx.HTTPError as exc:
        report(event='error', error_type=type(exc).__name__)
        return
    report(event='http', status=response.status_code)
    try:
        envelope = response.json()
    except ValueError:
        report(event='error', reason='non_json_response')
        return
    if not isinstance(envelope, dict):
        report(event='error', reason='unexpected_response_shape')
        return
    status = envelope.get('status')
    status = status if status in ('done', 'pending', 'processing', 'error', 'failed', 'success') else 'other'
    wrapped = envelope.get('response')
    wrapped = wrapped if isinstance(wrapped, dict) else {}
    upstream_status = wrapped.get('status_code')
    report(event='provider', status=status,
           upstream_status=upstream_status if isinstance(upstream_status, int) else None)
    if not response.is_success or (isinstance(upstream_status, int) and upstream_status >= 400):
        report(event='error', reason='http_or_provider_error')
        return
    body = wrapped.get('body')
    if not isinstance(body, dict) or not isinstance(body.get('items'), list):
        report(event='error', reason='posts_not_returned', automatic_retry=False)
        return
    posts = body['items']
    report(event='result', count=len(posts), has_next_page=bool(body.get('next_max_id')),
           more_available=body.get('more_available') is True)
    valid_dates = 0
    for post in posts[:5]:
        if not isinstance(post, dict):
            continue
        date = None
        timestamp = post.get('taken_at')
        if isinstance(timestamp, (int, float)) and not isinstance(timestamp, bool):
            try:
                date = datetime.fromtimestamp(timestamp, timezone.utc).isoformat()
                valid_dates += 1
            except (ValueError, OverflowError, OSError):
                pass
        code = post.get('code')
        code = code if isinstance(code, str) and re.fullmatch(r'[A-Za-z0-9_-]{1,100}', code) else None
        metrics = {}
        for field in ('like_count', 'comment_count', 'view_count', 'play_count'):
            value = post.get(field)
            if isinstance(value, (int, float)) and not isinstance(value, bool) and value >= 0:
                metrics[field] = value
        report(event='post', code=code, published_at=date, metrics=metrics,
               has_caption=bool(post.get('caption')),
               has_media=bool(post.get('image_versions2') or post.get('video_versions') or post.get('carousel_media')))
    report(event='calendar_check', dated_posts=valid_dates,
           status='usable_sample' if valid_dates else 'no_dated_posts')


if __name__ == '__main__':
    main()
