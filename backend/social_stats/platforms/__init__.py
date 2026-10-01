"""Canonical platform metadata plus runtime provider contracts."""

from .base import (
    BasePlatformProvider,
    ConnectionResult,
    InboxResult,
    ProviderCapabilities,
    ProviderError,
    ProviderResult,
    StatsResult,
)
from .registry import (
    ACTIVE_PLATFORM_CHOICES,
    PLATFORM_CHOICES,
    PLATFORM_REGISTRY,
    PLATFORMS_BY_KEY,
    get_provider,
    grouped_platform_choices,
    iter_providers,
    register_provider,
)

__all__ = [
    'ACTIVE_PLATFORM_CHOICES',
    'PLATFORM_CHOICES',
    'PLATFORM_REGISTRY',
    'PLATFORMS_BY_KEY',
    'BasePlatformProvider',
    'ConnectionResult',
    'InboxResult',
    'ProviderCapabilities',
    'ProviderError',
    'ProviderResult',
    'StatsResult',
    'get_provider',
    'grouped_platform_choices',
    'iter_providers',
    'register_provider',
]
