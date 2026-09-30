"""Platform provider contracts and the central provider registry."""

from .base import (
    BasePlatformProvider, ConnectionResult, InboxResult, ProviderCapabilities,
    ProviderError, ProviderResult, StatsResult,
)
from .registry import get_provider, iter_providers, register_provider

__all__ = [
    'BasePlatformProvider', 'ConnectionResult', 'InboxResult',
    'ProviderCapabilities', 'ProviderError', 'ProviderResult', 'StatsResult',
    'get_provider', 'iter_providers', 'register_provider',
]
