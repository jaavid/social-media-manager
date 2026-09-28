from ._bot_publisher import BotPublisher
from .base import register_publisher


class BalePublisher(BotPublisher):
    platform = 'bale'
    API_BASE_URL = 'https://tapi.bale.ai'


register_publisher('bale', BalePublisher)
