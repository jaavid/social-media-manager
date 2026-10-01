from social_stats.platforms.registry import register_provider
from social_stats.publishers.bale import BalePublisher
from ._bot import BotPlatformProvider


@register_provider
class BaleProvider(BotPlatformProvider):
    key = 'bale'
    label = 'Bale'
    api_base_url = 'https://tapi.bale.ai'
    egress_service = 'bale'
    publisher = BalePublisher()
