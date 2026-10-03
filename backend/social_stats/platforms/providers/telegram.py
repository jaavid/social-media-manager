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
