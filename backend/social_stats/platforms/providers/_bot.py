"""Provider implementation shared by Bot API compatible networks."""
from __future__ import annotations

from social_stats.platforms.base import (
    BasePlatformProvider,
    ConnectionResult,
    ProviderCapabilities,
    ProviderResult,
)
from social_stats.publishers._bot_api_client import BotAPIClient
from social_stats.publishers.base import PublishError


class BotPlatformProvider(BasePlatformProvider):
    api_base_url = ''
    egress_service = ''
    capabilities = ProviderCapabilities(
        connect=True, publish=True, revoke=True,
        media_types=frozenset({'text', 'image', 'video', 'carousel'}),
        features=frozenset({'media_group'}),
    )

    def _client(self, token: str) -> BotAPIClient:
        return BotAPIClient(token, self.api_base_url, service=self.egress_service)

    def validate_credentials(self, credentials) -> ConnectionResult:
        managed = self.manifest.auth_type == 'managed_bot'
        if managed:
            from social_stats.platforms.managed_bots import managed_token
            if credentials.get('token') or credentials.get('api_key'):
                raise PublishError('Custom bots are not supported', code='invalid_credentials')
            token = managed_token(self.key)
        else:
            token = str(credentials.get('token') or '').strip()
        destination = str(credentials.get('destination_id') or '').strip()
        if not token or not destination:
            raise PublishError('token and destination_id are required', code='invalid_credentials')
        if managed:
            from social_stats.platforms.managed_bots import verify_channel
            ownership_code = credentials.get('ownership_code')
            if not ownership_code:
                raise PublishError('Channel verification is required', code='channel_verification_required')
            bot, chat = verify_channel(self._client(token), destination, ownership_code=ownership_code)
            destination = str(chat['id'])
        else:
            bot = self._client(token).get_me()
            chat = self._client(token).get_chat(destination)
        bot_name = bot.get('username') or bot.get('first_name') or str(bot.get('id') or '')
        chat_name = chat.get('title') or chat.get('username') or destination
        return ConnectionResult(
            account_id=str(bot.get('id') or ''), account_name=bot_name,
            destination_type=('channel' if chat.get('type') == 'channel' else
                              'group' if chat.get('type') in {'group', 'supergroup'} else 'profile'),
            destination_id=destination, scope=f'bot:{chat_name}', access_token=token,
            data={'auth_method': 'managed_bot' if managed else 'manual_token', 'bot': {'id': bot.get('id'), 'name': bot_name},
                  'destination': {'id': destination, 'name': chat_name, 'chat_id': chat.get('id'),
                                  'type': 'forum_supergroup' if chat.get('is_forum') and chat.get('type') == 'supergroup' else chat.get('type')}},
        )

    def health(self, credential):
        result = super().health(credential)
        if not result.ready or getattr(credential, 'auth_method', '') != 'managed_bot':
            return result
        from social_stats.platforms.managed_bots import managed_token, verify_channel
        verify_channel(self._client(managed_token(self.key)), credential.platform_user_id)
        return result

    def revoke(self, credential) -> ProviderResult:
        # Bot APIs have no token-revoke operation; removing our stored token is
        # nevertheless a complete local disconnect.
        return ProviderResult(data={'remote_revocation': False})

    def prepare_publish(self, post, resolve_media):
        overrides = (getattr(post, 'platform_overrides', None) or {}).get(self.key, {}) or {}
        return {key: overrides[key] for key in (
            'destination_context', 'media_items', 'rich_message', 'rich_fallback', 'poll', 'buttons',
        ) if key in overrides}
