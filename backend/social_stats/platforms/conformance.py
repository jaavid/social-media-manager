"""Offline structural conformance checks, selected by each manifest's capabilities.

Behavioral tests use the same boundary with fake transports; this checker never
connects to a live network or upgrades an integration's rollout status.
"""

from .base import BasePlatformProvider
from .manifest import PlatformManifest
from .provider_registry import iter_providers
from social_stats.publishers.base import BasePublisher


def conformance_errors(provider):
    errors = []
    manifest = getattr(provider, 'manifest', None)
    if not isinstance(manifest, PlatformManifest):
        return [f'{provider.key}: registration.manifest: validated manifest required']
    prefix = manifest.key
    if provider.key != manifest.output_service:
        errors.append(f'{prefix}: registration.key: runtime alias differs')
    for capability in ('publish_text', 'publish_image', 'publish_video'):
        if not manifest.capability(capability).enabled:
            continue
        media_type = capability.removeprefix('publish_')
        if not provider.capabilities.supports_media(media_type):
            errors.append(
                f'{prefix}: publishing.{capability}: runtime media support missing'
            )
        publisher = provider.publisher
        if (publisher is None and type(provider).publish_request is BasePlatformProvider.publish_request) or (
            publisher is not None and getattr(type(publisher), capability, None) is getattr(BasePublisher, capability)
        ):
            errors.append(f'{prefix}: publishing.{capability}: adapter method missing')
    for method in (
        'connect',
        'disconnect',
        'refresh',
        'publish_request',
        'sync',
        'ingest',
        'reply',
        'analytics',
        'health',
    ):
        if not callable(getattr(provider, method, None)):
            errors.append(f'{prefix}: lifecycle.{method}: callable contract missing')
    if (
        provider.capabilities.connect
        and type(provider).validate_credentials
        is BasePlatformProvider.validate_credentials
    ):
        errors.append(f'{prefix}: lifecycle.connect: credential validation missing')
    if (
        provider.capabilities.revoke
        and type(provider).revoke is BasePlatformProvider.revoke
    ):
        errors.append(f'{prefix}: lifecycle.disconnect: revoke implementation missing')
    if not manifest.legacy_adapter:
        selected = {
            'analytics': 'sync_stats',
            'webhooks': 'ingest',
            'inbox': 'reply',
            'comments': 'reply',
            'reviews': 'reply',
        }
        for capability, method in selected.items():
            if manifest.capability(capability).enabled and getattr(
                type(provider), method
            ) is getattr(BasePlatformProvider, method):
                errors.append(
                    f'{prefix}: {capability}.{method}: enabled capability requires an adapter'
                )
        if (
            manifest.capability('connection').enabled
            and not provider.capabilities.connect
        ):
            errors.append(f'{prefix}: lifecycle.connect: runtime capability missing')
        if (
            manifest.capability('disconnect').enabled
            and not provider.capabilities.revoke
        ):
            errors.append(f'{prefix}: lifecycle.disconnect: runtime capability missing')
    if (
        manifest.resilience.mutation_retry == 'idempotent'
        and manifest.resilience.idempotency == 'none'
    ):
        errors.append(
            f'{prefix}: publishing.retry: idempotent mutation requires idempotency'
        )
    return errors


def registered_conformance_errors():
    providers = iter_providers()
    errors = []
    keys = [p.manifest.key for p in providers]
    if len(keys) != len(set(keys)):
        errors.append('registration.duplicate: canonical keys must be unique')
    for provider in providers:
        errors.extend(conformance_errors(provider))
    return errors
