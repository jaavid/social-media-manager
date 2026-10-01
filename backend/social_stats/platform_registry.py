"""Platform capability support matrix and public platform metadata.

``social_stats.platforms.registry`` owns platform identity, labels, category and
authentication metadata. This module owns support status and implementation
dependencies. The public metadata endpoint combines both without exposing
provider URLs, credentials, or implementation paths.
"""
from __future__ import annotations

from dataclasses import dataclass

from .platforms.registry import CATEGORY_REGISTRY, PLATFORM_REGISTRY, PLATFORMS_BY_KEY


CAPABILITIES = (
    'connection', 'disconnect', 'publish_text', 'publish_image',
    'publish_video', 'scheduling', 'analytics', 'inbox', 'comments',
    'reviews', 'webhooks',
)
CAPABILITY_STATUSES = frozenset({'supported', 'beta', 'planned', 'not_available'})
ENABLED_STATUSES = frozenset({'supported', 'beta'})


@dataclass(frozen=True)
class PlatformDefinition:
    key: str
    label: str
    capabilities: dict[str, str]
    publisher: str | None = None
    egress_service: str | None = None
    connection_handler: str | None = None

    def enabled(self, capability: str) -> bool:
        return self.capabilities[capability] in ENABLED_STATUSES


def _caps(**overrides: str) -> dict[str, str]:
    values = dict.fromkeys(CAPABILITIES, 'not_available')
    values.update(overrides)
    return values


def _definition(key, capabilities, publisher=None, egress_service=None, connection_handler=None):
    return PlatformDefinition(
        key,
        PLATFORMS_BY_KEY[key].title_en,
        capabilities,
        publisher,
        egress_service,
        connection_handler,
    )


PLATFORMS: dict[str, PlatformDefinition] = {
    'facebook': _definition('facebook', _caps(
        connection='supported', disconnect='supported', publish_text='supported',
        publish_image='supported', publish_video='supported', scheduling='supported',
        analytics='supported', inbox='supported', comments='supported',
        reviews='not_available', webhooks='supported'),
        'social_stats.publishers.facebook.FacebookPublisher', 'meta',
        'social_stats.oauth_views.oauth_disconnect'),
    'instagram': _definition('instagram', _caps(
        connection='supported', disconnect='supported', publish_text='not_available',
        publish_image='supported', publish_video='supported', scheduling='supported',
        analytics='supported', inbox='supported', comments='supported',
        reviews='not_available', webhooks='supported'),
        'social_stats.publishers.instagram.InstagramPublisher', 'meta',
        'social_stats.oauth_views.oauth_disconnect'),
    'youtube': _definition('youtube', _caps(
        connection='supported', disconnect='supported', publish_video='supported',
        scheduling='supported', analytics='supported', comments='supported',
        webhooks='beta'), 'social_stats.publishers.youtube.YouTubePublisher', 'google',
        'social_stats.oauth_views.oauth_disconnect'),
    'linkedin': _definition('linkedin', _caps(
        connection='supported', disconnect='supported', publish_text='supported',
        publish_image='supported', publish_video='supported', scheduling='supported',
        analytics='beta', comments='beta'),
        'social_stats.publishers.linkedin.LinkedInPublisher', 'linkedin',
        'social_stats.oauth_views.oauth_disconnect'),
    'google_my_business': _definition('google_my_business', _caps(
        connection='supported', disconnect='supported', publish_text='supported',
        publish_image='supported', scheduling='supported', analytics='supported',
        reviews='supported'), 'social_stats.publishers.gmb.GMBPublisher', 'google',
        'social_stats.oauth_views.oauth_disconnect'),
    'telegram': _definition('telegram', _caps(
        connection='supported', disconnect='supported', publish_text='supported',
        publish_image='supported', publish_video='supported', scheduling='supported',
        analytics='not_available', inbox='planned', comments='not_available',
        reviews='not_available', webhooks='planned'),
        'social_stats.publishers.telegram.TelegramPublisher', 'telegram',
        'social_stats.bot_channel_views.bot_channel_connection'),
    'bale': _definition('bale', _caps(
        connection='supported', disconnect='supported', publish_text='supported',
        publish_image='supported', publish_video='supported', scheduling='supported',
        analytics='not_available', inbox='planned', comments='not_available',
        reviews='not_available', webhooks='planned'),
        'social_stats.publishers.bale.BalePublisher', 'bale',
        'social_stats.bot_channel_views.bot_channel_connection'),
    'eitaa': _definition('eitaa', _caps(
        connection='planned', disconnect='planned', publish_text='planned',
        publish_image='planned', publish_video='planned', scheduling='planned',
        analytics='not_available', inbox='planned', comments='not_available',
        reviews='not_available', webhooks='planned')),
    'aparat': _definition('aparat', _caps(
        connection='planned', disconnect='planned', publish_video='planned',
        scheduling='planned', analytics='planned', comments='planned',
        webhooks='planned')),
}


def frontend_metadata() -> dict[str, dict]:
    """Serializable support-status subset used by the legacy frontend guard."""
    return {
        key: {'label': item.label, 'capabilities': item.capabilities}
        for key, item in PLATFORMS.items()
    }


def public_registry() -> dict[str, list[dict]]:
    """Return ordered, JSON-safe platform metadata without implementation details."""
    categories = [
        {'key': key, **metadata}
        for key, metadata in sorted(
            CATEGORY_REGISTRY.items(),
            key=lambda item: item[1]['order'],
        )
    ]

    per_category_order: dict[str, int] = {}
    platforms = []
    for catalogue in PLATFORM_REGISTRY:
        per_category_order[catalogue.category] = per_category_order.get(catalogue.category, 0) + 1
        support = PLATFORMS.get(catalogue.key)
        capabilities = support.capabilities if support else _caps()
        platforms.append({
            'key': catalogue.key,
            'titles': {'fa': catalogue.title_fa, 'en': catalogue.title_en},
            'category': catalogue.category,
            'order': per_category_order[catalogue.category] * 10,
            'auth_type': catalogue.auth_type,
            'rollout_status': catalogue.status,
            'capabilities': capabilities,
        })

    category_order = {item['key']: item['order'] for item in categories}
    platforms.sort(key=lambda item: (category_order[item['category']], item['order']))
    return {'categories': categories, 'platforms': platforms}


def markdown_matrix() -> str:
    """Render the canonical Markdown table used by PLATFORM_SUPPORT.md."""
    headings = ('Platform', 'Connection', 'Disconnect', 'Text', 'Image', 'Video',
                'Scheduling', 'Analytics', 'Inbox', 'Comments', 'Reviews', 'Webhooks')
    capability_order = CAPABILITIES
    lines = [
        '| ' + ' | '.join(headings) + ' |',
        '|' + '|'.join(['---'] * len(headings)) + '|',
    ]
    for item in PLATFORMS.values():
        statuses = [item.capabilities[name] for name in capability_order]
        lines.append('| ' + ' | '.join([item.label, *statuses]) + ' |')
    return '\n'.join(lines)
