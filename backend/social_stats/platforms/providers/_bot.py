"""Provider implementation shared by Bot API compatible networks."""
from __future__ import annotations

from social_stats.publishers._bot_api_client import BotAPIClient
from social_stats.platforms.base import (
    BasePlatformProvider, ConnectionResult, ProviderCapabilities, ProviderResult,
)


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
        token = str(credentials.get('token') or '').strip()
        destination = str(credentials.get('destination_id') or '').strip()
        if not token or not destination:
            from social_stats.publishers.base import PublishError
            raise PublishError('token and destination_id are required', code='invalid_credentials')
        bot = self._client(token).get_me()
        chat = self._client(token).get_chat(destination)
        bot_name = bot.get('username') or bot.get('first_name') or str(bot.get('id') or '')
        chat_name = chat.get('title') or chat.get('username') or destination
        return ConnectionResult(
            account_id=str(bot.get('id') or ''), account_name=bot_name,
            destination_type=('channel' if chat.get('type') == 'channel' else
                              'group' if chat.get('type') in {'group', 'supergroup'} else 'profile'),
            destination_id=destination, scope=f'bot:{chat_name}', access_token=token,
            data={'bot': {'id': bot.get('id'), 'name': bot_name},
                  'destination': {'id': destination, 'name': chat_name, 'chat_id': chat.get('id'),
                                  'type': 'forum_supergroup' if chat.get('is_forum') and chat.get('type') == 'supergroup' else chat.get('type')}},
        )

    def revoke(self, credential) -> ProviderResult:
        # Bot APIs have no token-revoke operation; removing our stored token is
        # nevertheless a complete local disconnect.
        return ProviderResult(data={'remote_revocation': False})

    def prepare_publish(self, post, resolve_media):
        overrides = (getattr(post, 'platform_overrides', None) or {}).get(self.key, {}) or {}
        return {key: overrides[key] for key in (
            'destination_context', 'media_items', 'rich_message', 'rich_fallback', 'poll', 'buttons',
        ) if key in overrides}
