from ._bot_publisher import BotPublisher
from .base import register_publisher


class TelegramPublisher(BotPublisher):
    platform = 'telegram'
    API_BASE_URL = 'https://api.telegram.org'


register_publisher('telegram', TelegramPublisher)
