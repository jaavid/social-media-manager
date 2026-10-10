from social_stats.platforms.base import ProviderCapabilities
from social_stats.platforms.registry import register_provider
from social_stats.publishers.telegram import TelegramPublisher
from ._bot import BotPlatformProvider


@register_provider
class TelegramProvider(BotPlatformProvider):
    key = 'telegram'
    label = 'Telegram'
    api_base_url = 'https://api.telegram.org'
    egress_service = 'telegram'
    publisher = TelegramPublisher()
    capabilities = ProviderCapabilities(
        connect=True, publish=True, revoke=True,
        media_types=TelegramPublisher.SUPPORTED_TYPES,
        features=frozenset({'media_group', 'mixed_media_group', 'rich_message', 'polls', 'forum_topics'}),
    )

    def connection_identity(self, result):
        destination = result.data['destination']
        return (str(destination.get('chat_id') or result.destination_id),
                destination['name'], {'bot_id': result.account_id})

    def connected(self, account, result):
        from social_stats.models import TelegramIntegration
        config, _ = TelegramIntegration.objects.get_or_create(
            account=account, defaults={'destination_context': {
                'destination_type': result.data['destination'].get('type') or 'channel'}},
        )

        if result.data.get('auth_method') == 'managed_bot':
            # An old per-account webhook must not authenticate updates for the shared bot.
            config.webhook_enabled = False
            config.webhook_secret = ''
            config.assistant_enabled = False
            config.save(update_fields=['webhook_enabled', 'webhook_secret', 'assistant_enabled'])

    def disconnected(self, account):
        from social_stats.models import TelegramIntegration
        TelegramIntegration.objects.filter(account=account).update(
            webhook_enabled=False, assistant_enabled=False,
        )

    def validate_publish(self, media_type, content, options):
        from social_stats.publishers.telegram_content import validate_post
        validate_post(media_type, content, options, assets=True)

    def prepare_publish(self, post, resolve_media):
        from copy import deepcopy
        from social_stats.publishers.base import PublishError
        kwargs = deepcopy(super().prepare_publish(post, resolve_media))

        def resolve(value):
            if isinstance(value, dict):
                for key, item in value.items():
                    if key == 'media' and isinstance(item, str) and item.startswith('asset:'):
                        urls = resolve_media(post, [item])
                        if (not isinstance(urls, (list, tuple)) or len(urls) != 1
                                or not isinstance(urls[0], str) or not urls[0].strip()
                                or urls[0] == item):
                            raise PublishError('Media asset is missing from this workspace', code='media_invalid')
                        value[key] = urls[0]
                    else:
                        resolve(item)
            elif isinstance(value, list):
                for item in value:
                    resolve(item)
        resolve(kwargs)
        return kwargs
