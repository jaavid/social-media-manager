"""Central registry for platform integrations and their capabilities."""
from __future__ import annotations

import importlib

from .base import BasePlatformProvider

_PROVIDERS: dict[str, type[BasePlatformProvider]] = {}
_LOADED = False


def register_provider(provider_cls: type[BasePlatformProvider]):
    if not issubclass(provider_cls, BasePlatformProvider):
        raise TypeError('provider must subclass BasePlatformProvider')
    if not provider_cls.key:
        raise ValueError('provider key is required')
    _PROVIDERS[provider_cls.key] = provider_cls
    return provider_cls


def _autoload() -> None:
    global _LOADED
    if _LOADED:
        return
    _LOADED = True
    for name in ('telegram', 'bale', 'eitaa', 'aparat'):
        importlib.import_module(f'social_stats.platforms.providers.{name}')
    # Existing first-party publishers participate through the same provider
    # contract. Their connection flows remain OAuth-specific, so ``connect`` is
    # explicitly false rather than implied by the existence of a publisher.
    from social_stats.publishers.base import _REGISTRY
    for name in ('facebook', 'instagram', 'youtube', 'linkedin', 'gmb'):
        importlib.import_module(f'social_stats.publishers.{name}')
    from .base import ProviderCapabilities
    for key, publisher_cls in tuple(_REGISTRY.items()):
        if key in _PROVIDERS:
            continue
        publisher = publisher_cls()
        adapter = type(
            f'{publisher_cls.__name__}Provider',
            (BasePlatformProvider,),
            {
                'key': key,
                'label': key.replace('_', ' ').title(),
                'publisher': publisher,
                'capabilities': ProviderCapabilities(
                    publish=bool(publisher.SUPPORTED_TYPES),
                    media_types=frozenset(publisher.SUPPORTED_TYPES),
                ),
            },
        )
        _PROVIDERS[key] = adapter


def get_provider(platform: str) -> BasePlatformProvider:
    _autoload()
    cls = _PROVIDERS.get((platform or '').lower())
    if cls is None:
        raise NotImplementedError(f'No provider registered for platform={platform}')
    return cls()


def iter_providers(*, capability: str | None = None):
    _autoload()
    providers = [cls() for cls in _PROVIDERS.values()]
    if capability:
        providers = [p for p in providers if getattr(p.capabilities, capability, False)]
    return tuple(providers)
