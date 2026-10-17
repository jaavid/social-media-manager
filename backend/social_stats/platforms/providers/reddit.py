"""Reddit OAuth, subreddit publishing, account mail and comment ingestion."""
import re
from datetime import datetime, timedelta, timezone as dt_timezone

from django.conf import settings
from django.utils import timezone

from social_stats.platforms.base import (
    BasePlatformProvider, ConnectionResult, InboxResult, ProviderError, ProviderResult, StatsResult,
)
from social_stats.platforms.registry import register_provider
from social_stats.publishers.base import BasePublisher, PublishResult
from ._community import request_json, required_object

SCOPES = ('identity', 'read', 'submit', 'privatemessages')


def token_data(payload, *, require_refresh=False):
    required_object(payload, 'access_token', 'expires_in')
    if (not isinstance(payload['access_token'], str) or type(payload['expires_in']) is not int
            or payload['expires_in'] <= 0
            or ('scope' in payload and not isinstance(payload['scope'], str))
            or ('refresh_token' in payload and not isinstance(payload['refresh_token'], str))
            or (require_refresh and not payload.get('refresh_token'))):
        raise ProviderError('Invalid OAuth response', code='invalid_response')
    return payload


def subreddit(value):
    value = str(value or '').removeprefix('r/')
    if not re.fullmatch(r'[A-Za-z0-9_]{2,21}', value):
        raise ProviderError('Invalid subreddit', code='invalid_destination')
    return value


def fullname(value, kinds=('t1', 't3', 't4')):
    if not isinstance(value, str) or not re.fullmatch(r't[134]_[a-z0-9]+', value) or value[:2] not in kinds:
        raise ProviderError('Invalid Reddit identifier', code='invalid_destination')
    return value


def oauth_request(data, path='/api/v1/access_token'):
    app_id = getattr(settings, 'REDDIT_CLIENT_ID', '')
    secret = getattr(settings, 'REDDIT_CLIENT_SECRET', '')
    if not app_id or not secret:
        raise ProviderError('Reddit app is not configured', code='missing_config')
    return required_object(request_json('reddit_oauth', 'POST', f'https://www.reddit.com{path}',
        auth=(app_id, secret), headers={'User-Agent': settings.REDDIT_USER_AGENT}, data=data))


class RedditClient:
    def __init__(self, token):
        if not token:
            raise ProviderError('Reddit token required', code='invalid_credentials')
        self.token = token

    def request(self, method, path, **kwargs):
        data = request_json('reddit', method, f'https://oauth.reddit.com{path}',
            headers={'Authorization': f'Bearer {self.token}', 'User-Agent': settings.REDDIT_USER_AGENT}, **kwargs)
        if isinstance(data, dict) and data.get('json', {}).get('errors'):
            errors = data['json']['errors']
            code = 'rate_limited' if any(e[0] == 'RATELIMIT' for e in errors) else 'permission_denied'
            from social_stats.publishers.base import RateLimitError
            if code == 'rate_limited':
                raise RateLimitError(retry_after=600)
            raise ProviderError('Reddit rejected the operation', code=code)
        return data

    def listing(self, path, *, cursor=''):
        params = {'limit': 100, 'raw_json': 1}
        if cursor:
            params['after'] = fullname(cursor)
        payload = required_object(self.request('GET', path, params=params), 'data')
        data = required_object(payload['data'])
        children = data.get('children')
        if not isinstance(children, list):
            raise ProviderError('Invalid Reddit listing', code='invalid_response')
        rows = [required_object(row.get('data'), 'name') for row in children if isinstance(row, dict)]
        return rows, data.get('after') or ''


def post_options(content, options):
    if not isinstance(options, dict) or set(options) - {'title', 'url', 'flair_id', 'nsfw', 'spoiler'}:
        raise ProviderError('Invalid Reddit post options', code='media_invalid')
    title = options.get('title') or (content.splitlines()[0] if content else '')
    if not isinstance(title, str) or not title.strip() or len(title) > 300:
        raise ProviderError('Reddit title must contain 1 to 300 characters', code='media_invalid')
    url = options.get('url', '')
    if not isinstance(url, str):
        raise ProviderError('Invalid link', code='media_invalid')
    if url:
        from social_stats.security.ssrf import check_url, UnsafeURLError
        try:
            check_url(url, allowed_schemes=('https',))
        except (UnsafeURLError, ValueError):
            raise ProviderError('Invalid link', code='media_invalid') from None
    flair = options.get('flair_id', '')
    if not isinstance(flair, str) or (flair and not re.fullmatch(r'[a-zA-Z0-9-]{1,100}', flair)):
        raise ProviderError('Invalid flair identifier', code='media_invalid')
    if any(type(options.get(key, False)) is not bool for key in ('nsfw', 'spoiler')):
        raise ProviderError('Invalid post flags', code='media_invalid')
    return {'title': title.strip(), 'kind': 'link' if url else 'self',
            **({'url': url} if url else {'text': content}), 'flair_id': flair,
            'nsfw': options.get('nsfw', False), 'spoiler': options.get('spoiler', False)}


class RedditPublisher(BasePublisher):
    platform = 'reddit'
    MAX_TEXT_LENGTH = 40000
    SUPPORTED_TYPES = frozenset({'text'})

    def publish_text(self, credential, content, **kwargs):
        options = post_options(content, kwargs.get('reddit') or {})
        payload = RedditClient(credential.access_token).request('POST', '/api/submit', data={
            'api_type': 'json', 'sr': subreddit(credential.platform_user_id),
            'resubmit': False, 'sendreplies': True, **options,
        })
        data = required_object(required_object(payload, 'json')['json'].get('data'), 'name', 'url')
        return PublishResult(success=True, platform_post_id=fullname(data['name'], ('t3',)),
                             platform_url=data['url'])


@register_provider
class RedditProvider(BasePlatformProvider):
    key = 'reddit'
    label = 'Reddit'
    publisher = RedditPublisher()

    def validate_credentials(self, credentials):
        token = credentials.get('access_token', '')
        sr = subreddit(credentials.get('subreddit'))
        client = RedditClient(token)
        user = required_object(client.request('GET', '/api/v1/me'), 'id', 'name')
        community = required_object(client.request('GET', f'/r/{sr}/about'), 'data')['data']
        required_object(community, 'display_name')
        granted = credentials.get('scope', '')
        if not set(SCOPES) <= set(granted.split()):
            raise ProviderError('Required Reddit permissions missing', code='permission_denied')
        return ConnectionResult(account_id=user['name'], account_name=f"u/{user['name']} · r/{community['display_name']}",
            destination_id=community['display_name'], access_token=token,
            refresh_token=credentials.get('refresh_token', ''), scope=granted,
            expires_at=credentials.get('expires_at'))

    def connection_identity(self, result):
        return f'{result.account_id.lower()}:{result.destination_id.lower()}', result.account_name, {}

    def refresh(self, credential, destination, request=None):
        from django.db import transaction
        from social_stats.models import PlatformCredential
        with transaction.atomic():
            stored = PlatformCredential.objects.select_for_update().get(pk=credential.pk,
                client_id=destination.workspace_id, social_account_id=destination.account_id,
                platform=self.key, is_active=True)
            if stored.is_expired:
                if not stored.refresh_token:
                    raise ProviderError('Refresh token required', code='token_expired')
                payload = token_data(oauth_request({'grant_type': 'refresh_token',
                    'refresh_token': stored.refresh_token}))
                if 'scope' in payload:
                    stored.scope = payload['scope']
                stored.access_token = payload['access_token']
                stored.expires_at = timezone.now() + timedelta(seconds=int(payload['expires_in']))
                stored.refresh_token = payload.get('refresh_token') or stored.refresh_token
                stored.save()
            credential.access_token = stored.access_token
            credential.refresh_token = stored.refresh_token
            credential.expires_at = stored.expires_at
            credential.scope = stored.scope
        return ConnectionResult(access_token=credential.access_token, expires_at=credential.expires_at)

    def ensure_credentials(self, credential, destination):
        if credential.is_expired:
            self.refresh(credential, destination)

    def health(self, credential):
        from social_stats.platforms.contracts import HealthResult
        result = super().health(credential)
        if (result.state == 'expired' and credential.refresh_token and credential.access_token and credential.is_active
                and credential.social_account.is_active and not credential.auth_failure_code):
            return HealthResult(True, 'ready')
        return result

    def revoke(self, credential):
        # Tokens may serve several connected subreddits for this same Reddit account.
        # Disconnect removes only this destination; do not invalidate sibling accounts.
        return ProviderResult(data={'remote_revocation': False})

    def validate_publish(self, media_type, content, options):
        # Empty drafts are valid; publish_text still requires a real title.
        post_options(content or 'Draft', (options.get('extensions') or {}).get('reddit') or {})

    def sync_stats(self, credential, *, remote_id=''):
        client = RedditClient(credential.access_token)
        if remote_id:
            rows, _ = client.listing('/api/info?id=' + fullname(remote_id, ('t3',)))
            row = rows[0] if rows else {}
            return StatsResult(metrics={k: row[k] for k in ('score', 'num_comments', 'upvote_ratio') if type(row.get(k)) in (int, float)})
        user = required_object(client.request('GET', '/api/v1/me'))
        community = required_object(client.request('GET', f'/r/{subreddit(credential.platform_user_id)}/about'), 'data')['data']
        return StatsResult(metrics={**{k: user[k] for k in ('link_karma', 'comment_karma') if type(user.get(k)) in (int, float)},
            **({'subscribers': community['subscribers']} if type(community.get('subscribers')) is int else {})})

    def fetch_inbox(self, credential, *, cursor=''):
        rows, after = RedditClient(credential.access_token).listing('/message/inbox', cursor=cursor)
        items = []
        for row in rows:
            name = fullname(row['name'], ('t1', 't4'))
            if name.startswith('t1_') and row.get('subreddit', '').lower() != credential.platform_user_id.lower():
                continue
            author = row.get('author') or '[deleted]'
            items.append({'id': name, 'thread_id': name, 'type': 'comment' if name.startswith('t1_') else 'dm',
                'author': author, 'author_name': author, 'content': row.get('body', ''),
                'sent_at': datetime.fromtimestamp(row['created_utc'], dt_timezone.utc)})
        return InboxResult(items=items, cursor=after)

    def fetch_comments(self, credential, *, remote_id='', cursor=''):
        sr = subreddit(credential.platform_user_id)
        rows, after = RedditClient(credential.access_token).listing(f'/r/{sr}/comments', cursor=cursor)
        items = []
        for row in rows:
            if remote_id and row.get('link_id') != fullname(remote_id, ('t3',)):
                continue
            if row.get('subreddit', '').lower() != sr.lower():
                raise ProviderError('Unexpected comment subreddit', code='invalid_response')
            # Import only comments on our own posts or replies directly addressed to us.
            identity = credential.social_account.metadata['account_identity']
            if row.get('link_author', '').lower() != identity.lower():
                continue
            name = fullname(row['name'], ('t1',))
            author = row.get('author') or '[deleted]'
            if author.lower() == identity.lower():
                continue
            items.append({'id': name, 'thread_id': name, 'type': 'comment',
                'author': author, 'author_name': author, 'content': row.get('body', ''),
                'sent_at': datetime.fromtimestamp(row['created_utc'], dt_timezone.utc)})
        return InboxResult(items=items, cursor=after)

    def reply(self, credential, destination, request=None):
        from social_stats.models import Conversation, Message
        name = fullname(request.thread_id, ('t1', 't4'))
        known = Conversation.objects.filter(client_id=destination.workspace_id,
            social_account_id=destination.account_id, platform=self.key)
        if not (known.filter(platform_thread_id=name).exists() or
                Message.objects.filter(conversation__in=known, platform_message_id=name, direction='inbound').exists()):
            raise ProviderError('Unknown account thread', code='permission_denied')
        if (request.kind == 'comments') != name.startswith('t1_'):
            raise ProviderError('Reply kind mismatch', code='permission_denied')
        payload = RedditClient(credential.access_token).request('POST', '/api/comment', data={
            'api_type': 'json', 'thing_id': name, 'text': request.content})
        data = required_object(required_object(payload, 'json')['json'], 'data')['data']
        things = data.get('things') or []
        if not things:
            raise ProviderError('Missing reply identifier', code='invalid_response')
        message_id = fullname(required_object(things[0].get('data'), 'name')['name'], ('t1', 't4'))
        return ProviderResult(data={'message_id': message_id})
