"""Eitaa provider; endpoints and media policy live exclusively here."""
from social_stats.platforms.registry import register_provider
from social_stats.publishers._bot_publisher import BotPublisher
from social_stats.publishers.base import register_publisher
from ._bot import BotPlatformProvider


class EitaaPublisher(BotPublisher):
    platform = 'eitaa'
    API_BASE_URL = 'https://eitaayar.ir/api'
    MAX_TEXT_LENGTH = 4096
    MAX_CAPTION_LENGTH = 1024
    MAX_IMAGE_BYTES = 10 * 1024 * 1024
    MAX_VIDEO_BYTES = 50 * 1024 * 1024
    MAX_MEDIA_GROUP_ITEMS = 10

    def _client(self, credential):
        from social_stats.publishers._bot_api_client import BotAPIClient
        return BotAPIClient(credential.access_token, self.API_BASE_URL,
                            service='eitaa', token_prefix='')


register_publisher('eitaa', EitaaPublisher)


@register_provider
class EitaaProvider(BotPlatformProvider):
    key = 'eitaa'
    label = 'Eitaa'
    api_base_url = EitaaPublisher.API_BASE_URL
    egress_service = 'eitaa'
    publisher = EitaaPublisher()

    def _client(self, token):
        from social_stats.publishers._bot_api_client import BotAPIClient
        return BotAPIClient(token, self.api_base_url, service='eitaa', token_prefix='')
