"""Canonical platform capability and integration dependency registry.

All product surfaces must derive from, or be checked against, this module.  A
capability status is deliberately more expressive than a boolean: ``beta`` is
usable but not generally available, while ``planned`` and ``not_available``
must never be exposed as working UI.
"""
from __future__ import annotations

from dataclasses import dataclass


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


PLATFORMS: dict[str, PlatformDefinition] = {
    'facebook': PlatformDefinition('facebook', 'Facebook', _caps(
        connection='supported', disconnect='supported', publish_text='supported',
        publish_image='supported', publish_video='supported', scheduling='supported',
        analytics='supported', inbox='supported', comments='supported',
        reviews='not_available', webhooks='supported'),
        'social_stats.publishers.facebook.FacebookPublisher', 'meta',
        'social_stats.oauth_views.oauth_disconnect'),
    'instagram': PlatformDefinition('instagram', 'Instagram', _caps(
        connection='supported', disconnect='supported', publish_text='not_available',
        publish_image='supported', publish_video='supported', scheduling='supported',
        analytics='supported', inbox='supported', comments='supported',
        reviews='not_available', webhooks='supported'),
        'social_stats.publishers.instagram.InstagramPublisher', 'meta',
        'social_stats.oauth_views.oauth_disconnect'),
    'youtube': PlatformDefinition('youtube', 'YouTube', _caps(
        connection='supported', disconnect='supported', publish_video='supported',
        scheduling='supported', analytics='supported', comments='supported',
        webhooks='beta'), 'social_stats.publishers.youtube.YouTubePublisher', 'google',
        'social_stats.oauth_views.oauth_disconnect'),
    'linkedin': PlatformDefinition('linkedin', 'LinkedIn', _caps(
        connection='supported', disconnect='supported', publish_text='supported',
        publish_image='supported', publish_video='supported', scheduling='supported',
        analytics='beta', comments='beta'),
        'social_stats.publishers.linkedin.LinkedInPublisher', 'linkedin',
        'social_stats.oauth_views.oauth_disconnect'),
    'google_my_business': PlatformDefinition('google_my_business', 'Google My Business', _caps(
        connection='supported', disconnect='supported', publish_text='supported',
        publish_image='supported', scheduling='supported', analytics='supported',
        reviews='supported'), 'social_stats.publishers.gmb.GMBPublisher', 'google',
        'social_stats.oauth_views.oauth_disconnect'),
    'telegram': PlatformDefinition('telegram', 'Telegram', _caps(
        connection='supported', disconnect='supported', publish_text='supported',
        publish_image='supported', publish_video='supported', scheduling='supported',
        analytics='not_available', inbox='planned', comments='not_available',
        reviews='not_available', webhooks='planned'),
        'social_stats.publishers.telegram.TelegramPublisher', 'telegram',
        'social_stats.bot_channel_views.bot_channel_connection'),
    'bale': PlatformDefinition('bale', 'Bale', _caps(
        connection='supported', disconnect='supported', publish_text='supported',
        publish_image='supported', publish_video='supported', scheduling='supported',
        analytics='not_available', inbox='planned', comments='not_available',
        reviews='not_available', webhooks='planned'),
        'social_stats.publishers.bale.BalePublisher', 'bale',
        'social_stats.bot_channel_views.bot_channel_connection'),
    'eitaa': PlatformDefinition('eitaa', 'Eitaa', _caps(
        connection='planned', disconnect='planned', publish_text='planned',
        publish_image='planned', publish_video='planned', scheduling='planned',
        analytics='not_available', inbox='planned', comments='not_available',
        reviews='not_available', webhooks='planned')),
    'aparat': PlatformDefinition('aparat', 'Aparat', _caps(
        connection='planned', disconnect='planned', publish_video='planned',
        scheduling='planned', analytics='planned', comments='planned',
        webhooks='planned')),
}


def frontend_metadata() -> dict[str, dict]:
    """Serializable subset consumed by the web application."""
    return {
        key: {'label': item.label, 'capabilities': item.capabilities}
        for key, item in PLATFORMS.items()
    }


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
