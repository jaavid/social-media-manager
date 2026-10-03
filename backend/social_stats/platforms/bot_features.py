"""Public Bot API feature contract, separate from cross-platform capabilities.

Planned features must stay disabled until their complete product flow ships.
Destination metadata describes API semantics, never grants workspace access.
"""
from copy import deepcopy
from dataclasses import dataclass

from social_stats.publishers.base import PublishError


FEATURE_KEYS = (
    'media_group', 'mixed_media_group', 'rich_message', 'rich_slideshow',
    'rich_collage', 'interactive_buttons', 'inbound_updates',
    'channel_direct_messages', 'suggested_posts', 'forum_topics',
    'streamed_drafts', 'polls',
)
DESTINATION_TYPES = (
    'channel', 'group', 'supergroup', 'forum_supergroup',
    'channel_direct_messages', 'private', 'private_forum',
)


def bot_feature_metadata(platform):
    if platform not in ('telegram', 'bale'):
        return {}
    statuses = dict.fromkeys(FEATURE_KEYS, 'planned' if platform == 'telegram' else 'not_available')
    statuses['media_group'] = 'supported'
    if platform == 'telegram':
        statuses.update(dict.fromkeys(FEATURE_KEYS, 'supported'))
    return deepcopy({
        'support': statuses,
        'media_group': {'min_items': 2, 'max_items': 10, 'media_types': ['photo', 'video'] if platform == 'telegram' else ['photo'],
                        'caption': 'first_item', 'fallback': 'single_image'},
        'destinations': {
            kind: {
                'message_thread_id': platform == 'telegram' and kind in ('forum_supergroup', 'private_forum'),
                'direct_messages_topic_id': platform == 'telegram' and kind == 'channel_direct_messages',
                'streamed_drafts': platform == 'telegram' and kind in ('private', 'private_forum'),
            }
            for kind in DESTINATION_TYPES
        },
        'fallback': 'explicit_only',
    })


def require_bot_feature(platform, feature):
    status = bot_feature_metadata(platform).get('support', {}).get(feature, 'not_available')
    if status not in ('supported', 'beta'):
        raise PublishError(
            f'{platform} feature {feature} is {status}; use a supported publishing mode',
            code='unsupported_feature', supported=False,
        )


@dataclass(frozen=True)
class BotDestinationContext:
    destination_type: str = 'channel'
    message_thread_id: int | None = None
    direct_messages_topic_id: int | None = None

    @classmethod
    def from_dict(cls, value):
        if value is None:
            return cls()
        if not isinstance(value, dict) or set(value) - {
            'destination_type', 'message_thread_id', 'direct_messages_topic_id',
        }:
            raise PublishError('Invalid destination context fields', code='invalid_destination')
        context = cls(**value)
        if context.destination_type not in DESTINATION_TYPES:
            raise PublishError('Unknown destination type', code='invalid_destination')
        for field in ('message_thread_id', 'direct_messages_topic_id'):
            number = getattr(context, field)
            if number is not None and (type(number) is not int or number <= 0):
                raise PublishError(f'{field} must be a positive integer', code='invalid_destination')
        return context

    def validated_options(self, platform):
        if self.message_thread_id is not None:
            if self.destination_type not in ('forum_supergroup', 'private_forum'):
                raise PublishError('Topics require a forum supergroup or forum-enabled private bot chat',
                                   code='invalid_destination')
            require_bot_feature(platform, 'forum_topics')
        if self.direct_messages_topic_id is not None:
            if self.destination_type != 'channel_direct_messages':
                raise PublishError('DM topics require a channel direct-messages chat', code='invalid_destination')
            require_bot_feature(platform, 'channel_direct_messages')
        if self.destination_type == 'channel_direct_messages':
            require_bot_feature(platform, 'channel_direct_messages')
        return {
            field: value for field, value in (
                ('message_thread_id', self.message_thread_id),
                ('direct_messages_topic_id', self.direct_messages_topic_id),
            ) if value is not None
        }


def validated_bot_options(platform, kwargs):
    context = BotDestinationContext.from_dict(kwargs.get('destination_context'))
    # Reject loose Bot API fields: callers must use the validated DTO.
    for key in ('message_thread_id', 'direct_messages_topic_id'):
        if key in kwargs:
            raise PublishError(f'Use destination_context for {key}', code='invalid_destination')
    for field, feature in (
        ('rich_message', 'rich_message'), ('reply_markup', 'interactive_buttons'),
        ('suggested_post_parameters', 'suggested_posts'), ('poll', 'polls'),
        ('media_items', 'mixed_media_group'),
    ):
        if field in kwargs:
            require_bot_feature(platform, feature)
    return context.validated_options(platform)
