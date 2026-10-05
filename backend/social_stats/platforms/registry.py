"""Compatibility catalogue facade; manifests own platform metadata."""
from .definitions import CATEGORY_REGISTRY, PLATFORM_REGISTRY, PlatformDefinition as PlatformDefinition

PLATFORMS_BY_KEY = {platform.key: platform for platform in PLATFORM_REGISTRY}
if len(PLATFORMS_BY_KEY) != len(PLATFORM_REGISTRY):
    raise ValueError('Duplicate platform key in PLATFORM_REGISTRY')

PLATFORM_CHOICES = [(platform.key, platform.title_en) for platform in PLATFORM_REGISTRY]
ACTIVE_PLATFORM_CHOICES = [
    (platform.key, platform.title_en) for platform in PLATFORM_REGISTRY if platform.is_active
]


def grouped_platform_choices():
    """Return Django-compatible optgroups, preserving registry order."""
    groups = {}
    for platform in PLATFORM_REGISTRY:
        category = CATEGORY_REGISTRY[platform.category]
        group = f"{category['title_fa']} / {category['title_en']}"
        groups.setdefault(group, []).append((platform.key, f'{platform.title_fa} / {platform.title_en}'))
    return [(title, choices) for title, choices in groups.items()]


from .provider_registry import (  # noqa: E402  (provider layer depends on base only)
    get_provider as _get_registered_provider,
    iter_providers as iter_providers,
    register_provider as register_provider,
)


def get_provider(platform: str):
    """Resolve a canonical platform key to its concrete runtime provider."""
    key = (platform or '').lower()
    definition = PLATFORMS_BY_KEY.get(key)
    runtime_key = definition.output_service if definition else key
    return _get_registered_provider(runtime_key)
