"""Platform capability support matrix and public platform metadata.

``social_stats.platforms.registry`` owns platform identity, labels, category and
authentication metadata. This module owns support status and implementation
dependencies. The public metadata endpoint combines both without exposing
provider URLs, credentials, or implementation paths.
"""
from __future__ import annotations

from dataclasses import dataclass

from .platforms.registry import CATEGORY_REGISTRY, PLATFORM_REGISTRY
from .platforms.bot_features import bot_feature_metadata
from .platforms.manifest import (
    CAPABILITIES as CAPABILITIES, CAPABILITY_STATUSES as CAPABILITY_STATUSES,
    ENABLED_STATUSES as ENABLED_STATUSES,
)




# Historical support API remains a derived view of the manifest catalogue.
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


def _caps(**overrides):
    values = dict.fromkeys(CAPABILITIES, 'not_available')
    values.update(overrides)
    return values


PLATFORMS = {
    item.key: PlatformDefinition(item.key, item.title_en, dict(item.support),
                                 item.publisher, item.egress_service, item.connection_handler)
    for item in PLATFORM_REGISTRY if any(s != 'not_available' for s in item.support.values())
}


def frontend_metadata() -> dict[str, dict]:
    """Serializable support-status subset used by the legacy frontend guard."""
    return {
        key: {'label': item.label, 'capabilities': item.capabilities,
              'features': bot_feature_metadata(key)}
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
    from .platforms.provider_registry import iter_manifests
    for catalogue in iter_manifests():
        per_category_order[catalogue.category] = per_category_order.get(catalogue.category, 0) + 1
        capabilities = dict(catalogue.support) if catalogue.support else _caps()
        platforms.append({
            'key': catalogue.key,
            'titles': {'fa': catalogue.title_fa, 'en': catalogue.title_en},
            'category': catalogue.category,
            'order': per_category_order[catalogue.category] * 10,
            'auth_type': catalogue.auth_type,
            'rollout_status': catalogue.status,
            'capabilities': capabilities,
            'features': bot_feature_metadata(catalogue.key),
            'contract': catalogue.public_contract(),
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
