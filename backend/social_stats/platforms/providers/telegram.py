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
