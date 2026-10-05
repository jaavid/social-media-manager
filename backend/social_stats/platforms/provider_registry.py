"""Deterministic provider discovery; no platform names in the loader."""
from __future__ import annotations

import importlib
import pkgutil
import threading

from .base import BasePlatformProvider, ProviderCapabilities
from .manifest import PlatformManifest

_PROVIDERS: dict[str, type[BasePlatformProvider]] = {}
_MANIFESTS: dict[str, PlatformManifest] = {}
_LOADED = False
_LOAD_LOCK = threading.RLock()


def register_provider(provider_cls: type[BasePlatformProvider]):
    if not issubclass(provider_cls, BasePlatformProvider):
        raise TypeError('provider must subclass BasePlatformProvider')
    from .definitions import PLATFORM_REGISTRY
    manifest = getattr(provider_cls, 'manifest', None)
    if manifest is None:
        manifest = next((m for m in PLATFORM_REGISTRY if m.output_service == provider_cls.key), None)
    if not isinstance(manifest, PlatformManifest):
        raise ValueError('registration.manifest: validated PlatformManifest required')
    if manifest.legacy_adapter and not any(manifest is m for m in PLATFORM_REGISTRY):
        raise ValueError('registration.legacy: reserved for built-in compatibility adapters')
    if provider_cls.key != manifest.output_service:
        raise ValueError('registration.key: provider and manifest differ')
    reserved = {value for item in PLATFORM_REGISTRY for value in (item.key, item.output_service)}
    if (manifest.key in reserved or manifest.output_service in reserved) and not any(manifest is m for m in PLATFORM_REGISTRY):
        raise ValueError('registration.duplicate: builtin key or alias is reserved')
    with _LOAD_LOCK:
        if (provider_cls.key in _PROVIDERS or manifest.key in _MANIFESTS
                or manifest.key in _PROVIDERS or provider_cls.key in _MANIFESTS):
            raise ValueError(f'registration.duplicate: {manifest.key}')
        provider_cls.manifest = manifest
        if not manifest.legacy_adapter:
            provider_cls.capabilities = ProviderCapabilities.from_manifest(manifest)
        _PROVIDERS[provider_cls.key] = provider_cls
        _MANIFESTS[manifest.key] = manifest
    return provider_cls


def discover_modules(package_name):
    package = importlib.import_module(package_name)
    return tuple(sorted(
        item.name for item in pkgutil.iter_modules(package.__path__, package.__name__ + '.')
        if not item.name.rsplit('.', 1)[1].startswith('_')
        and item.name.rsplit('.', 1)[1] != 'base'
    ))


def _autoload() -> None:
    global _LOADED
    if _LOADED:
        return
    with _LOAD_LOCK:
        if _LOADED:
            return
        from django.conf import settings
        for package in ('social_stats.publishers', 'social_stats.platforms.providers'):
            for module in discover_modules(package):
                importlib.import_module(module)
        for module in sorted(getattr(settings, 'PLATFORM_PROVIDER_MODULES', ())):
            importlib.import_module(module)
        from social_stats.publishers.base import _REGISTRY
        from .definitions import PLATFORM_REGISTRY
        for manifest in PLATFORM_REGISTRY:
            if manifest.key in _MANIFESTS:
                continue
            publisher_cls = _REGISTRY.get(manifest.key) or _REGISTRY.get(manifest.output_service)
            publisher = publisher_cls() if publisher_cls else None
            adapter = type(
                f'{manifest.key.title()}Provider', (BasePlatformProvider,),
                {'key': manifest.output_service, 'label': manifest.title_en,
                 'manifest': manifest, 'publisher': publisher,
                 'capabilities': ProviderCapabilities(
                     publish=bool(publisher and publisher.SUPPORTED_TYPES),
                     media_types=frozenset(publisher.SUPPORTED_TYPES) if publisher else frozenset(),
                 )},
            )
            register_provider(adapter)
        _LOADED = True


def get_provider(platform: str) -> BasePlatformProvider:
    _autoload()
    key = (platform or '').lower()
    manifest = _MANIFESTS.get(key)
    cls = _PROVIDERS.get(manifest.output_service if manifest else key)
    if cls is None:
        raise NotImplementedError('No provider registered for requested platform')
    return cls()


def iter_providers(*, capability: str | None = None):
    _autoload()
    providers = [cls() for _, cls in sorted(_PROVIDERS.items())]
    if capability:
        providers = [p for p in providers if getattr(p.capabilities, capability, False)]
    return tuple(providers)


def iter_manifests():
    _autoload()
    from .definitions import PLATFORM_REGISTRY
    builtin = {item.key for item in PLATFORM_REGISTRY}
    return (*PLATFORM_REGISTRY, *(_MANIFESTS[key] for key in sorted(_MANIFESTS) if key not in builtin))
