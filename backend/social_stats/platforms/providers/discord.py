"""Discord bot integration, scoped to one explicitly connected guild channel."""
import json
import re
from datetime import datetime

import requests

from social_stats.platforms.base import (
    BasePlatformProvider, ConnectionResult, InboxResult, ProviderError, ProviderResult, StatsResult,
)
from social_stats.platforms.registry import register_provider
from social_stats.publishers.base import BasePublisher, PublishResult
from ._community import request_json, required_object


def snowflake(value):
    value = str(value or '')
    if not re.fullmatch(r'[0-9]{1,20}', value):
        raise ProviderError('Invalid Discord identifier', code='invalid_destination')
    return value


class DiscordClient:
    def __init__(self, token):
        if not token:
            raise ProviderError('Bot token required', code='invalid_credentials')
        self.token = token

    def request(self, method, path, **kwargs):
        return request_json('discord', method, f'https://discord.com/api/v10{path}',
                            headers={'Authorization': f'Bot {self.token}'}, **kwargs)

    def messages(self, channel, *, before=''):
        params = {'limit': 100}
        if before:
            params['before'] = snowflake(before)
        result = self.request('GET', f'/channels/{snowflake(channel)}/messages', params=params)
        if not isinstance(result, list):
            raise ProviderError('Invalid message list', code='invalid_response')
        return result

    def require_message_content(self):
        app = required_object(self.request('GET', '/applications/@me'), 'id')
        try:
            flags = int(app.get('flags_new', app.get('flags', 0)))
        except (TypeError, ValueError):
            raise ProviderError('Invalid application flags', code='invalid_response') from None
        if not flags & ((1 << 18) | (1 << 19)):
            raise ProviderError('Message Content access is required', code='permission_denied')


def attachment(url, media_type):
    """Bounded public HTTPS download; never forward bot credentials to media hosts."""
    from social_stats.security.ssrf import check_url, safe_request, UnsafeURLError
    try:
        check_url(url, allowed_schemes=('https',))
        with safe_request('GET', url, stream=True, timeout=(10, 45)) as response:
            mime = response.headers.get('Content-Type', '').split(';')[0].lower()
            allowed = {'image': {'image/jpeg', 'image/png', 'image/gif', 'image/webp'},
                       'video': {'video/mp4', 'video/webm'}}
            if not response.ok or mime not in allowed[media_type]:
                raise ProviderError('Invalid media response', code='media_invalid')
            data = bytearray()
            for chunk in response.iter_content(64 * 1024):
                data.extend(chunk)
                if len(data) > 10 * 1024 * 1024:
                    raise ProviderError('Attachment too large', code='media_too_large')
            if not data:
                raise ProviderError('Empty attachment', code='media_invalid')
            suffix = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
                      'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm'}[mime]
            return f'media.{suffix}', bytes(data), mime
    except (UnsafeURLError, ValueError):
        raise ProviderError('Unsafe media URL', code='media_invalid') from None
    except requests.RequestException:
        raise ProviderError('Media download failed', code='network_error') from None


class DiscordPublisher(BasePublisher):
    platform = 'discord'
    SUPPORTED_TYPES = frozenset({'text', 'image', 'video'})
    MAX_TEXT_LENGTH = 2000

    def send(self, credential, content, *, media_url='', media_type='text', reply_to=''):
        channel = snowflake(credential.platform_user_id)
        payload = {'content': content, 'allowed_mentions': {'parse': [], 'replied_user': False}}
        if not isinstance(content, str) or len(content) > 2000 or (not content.strip() and not media_url):
            raise ProviderError('Invalid message content', code='media_invalid')
        if reply_to:
            payload['message_reference'] = {'message_id': snowflake(reply_to), 'fail_if_not_exists': True}
        kwargs = {'json': payload}
        if media_url:
            file = attachment(media_url, media_type)
            payload['attachments'] = [{'id': 0, 'filename': file[0]}]
            kwargs = {'data': {'payload_json': json.dumps(payload)}, 'files': {'files[0]': file}}
        data = required_object(DiscordClient(credential.access_token).request(
            'POST', f'/channels/{channel}/messages', **kwargs), 'id', 'channel_id')
        if str(data['channel_id']) != channel:
            raise ProviderError('Unexpected message channel', code='invalid_response')
        message_id = snowflake(data['id'])
        guild = (credential.social_account.metadata or {}).get('guild_id', '@me')
        return PublishResult(success=True, platform_post_id=message_id,
                             platform_url=f'https://discord.com/channels/{guild}/{channel}/{message_id}')

    def publish_text(self, credential, content, **kwargs):
        return self.send(credential, content)

    def publish_image(self, credential, content, image_urls, **kwargs):
        if len(image_urls) != 1:
            raise ProviderError('Select one attachment', code='media_invalid')
        return self.send(credential, content, media_url=image_urls[0], media_type='image')

    def publish_video(self, credential, content, video_url, **kwargs):
        return self.send(credential, content, media_url=video_url, media_type='video')


@register_provider
class DiscordProvider(BasePlatformProvider):
    key = 'discord'
    label = 'Discord'
    publisher = DiscordPublisher()

    def validate_credentials(self, credentials):
        token = credentials.get('token', '')
        channel_id = snowflake(credentials.get('destination_id'))
        client = DiscordClient(token)
        bot = required_object(client.request('GET', '/users/@me'), 'id', 'username')
        if bot.get('bot') is not True:
            raise ProviderError('A bot account is required', code='invalid_credentials')
        channel = required_object(client.request('GET', f'/channels/{channel_id}'), 'id', 'guild_id')
        if str(channel['id']) != channel_id or channel.get('type') not in (0, 5, 10, 11, 12):
            raise ProviderError('Select a guild text channel or thread', code='invalid_destination')
        client.require_message_content()
        client.messages(channel_id)  # Verify read/history permissions before saving.
        return ConnectionResult(account_id=snowflake(bot['id']), account_name=channel.get('name') or channel_id,
            destination_id=channel_id, destination_type='channel', access_token=token,
            data={'guild_id': snowflake(channel['guild_id'])})

    def connection_identity(self, result):
        return result.destination_id, result.account_name, {'guild_id': result.data['guild_id']}

    def revoke(self, credential):
        # Do not remove a shared bot from the server or rotate its global token.
        return ProviderResult(data={'remote_revocation': False})

    def sync_stats(self, credential, *, remote_id=''):
        client = DiscordClient(credential.access_token)
        if remote_id:
            message = required_object(client.request('GET', f'/channels/{snowflake(credential.platform_user_id)}/messages/{snowflake(remote_id)}'), 'id')
            rows = [message]
        else:
            rows = client.messages(credential.platform_user_id)
        return StatsResult(metrics={'messages_sampled': len(rows),
            'reactions_sampled': sum(r.get('count', 0) for m in rows for r in m.get('reactions', []))})

    def fetch_inbox(self, credential, *, cursor=''):
        client = DiscordClient(credential.access_token)
        client.require_message_content()
        rows = client.messages(credential.platform_user_id, before=cursor)
        items = []
        for row in rows:
            required_object(row, 'id', 'author', 'timestamp')
            if str(row.get('channel_id')) != credential.platform_user_id:
                raise ProviderError('Unexpected inbox channel', code='invalid_response')
            author = required_object(row['author'], 'id')
            if author.get('bot') or row.get('webhook_id'):
                continue
            reference = (row.get('message_reference') or {}) if row.get('type') == 19 else {}
            items.append({'id': snowflake(row['id']),
                'thread_id': snowflake(reference.get('message_id') or row['id']),
                'type': 'comment' if reference else 'dm',
                'author': str(author['id']), 'author_name': author.get('global_name') or author.get('username', ''),
                'content': row.get('content', ''), 'sent_at': datetime.fromisoformat(row['timestamp']),
                'media_urls': [a['url'] for a in row.get('attachments', []) if a.get('url')]})
        return InboxResult(items=items, cursor=str(rows[-1]['id']) if len(rows) == 100 else '')

    def poll_comments(self, credential, destination, request=None):
        # Channel polling already imports message replies alongside messages.
        return InboxResult()

    def fetch_comments(self, credential, *, remote_id, cursor=''):
        # Discord uses message replies, not a separate comment endpoint.
        snowflake(remote_id)
        result = self.fetch_inbox(credential, cursor=cursor)
        ids = {str(row.get('id')) for row in DiscordClient(credential.access_token).messages(credential.platform_user_id, before=cursor)
               if str((row.get('message_reference') or {}).get('message_id')) == remote_id}
        result.items = [item for item in result.items if item['id'] in ids]
        return result

    def reply(self, credential, destination, request=None):
        from social_stats.models import Conversation, Message
        known = Conversation.objects.filter(client_id=destination.workspace_id,
            social_account_id=destination.account_id, platform=self.key)
        if not (known.filter(platform_thread_id=request.thread_id).exists() or
                Message.objects.filter(conversation__in=known, platform_message_id=request.thread_id, direction='inbound').exists()):
            raise ProviderError('Unknown account thread', code='permission_denied')
        result = self.publisher.send(credential, request.content, reply_to=request.thread_id)
        return ProviderResult(data={'message_id': result.platform_post_id})
