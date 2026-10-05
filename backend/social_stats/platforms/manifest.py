"""Validated, secret-free definition shared by catalogue and runtime discovery."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from types import MappingProxyType
from typing import Mapping

CAPABILITIES = (
    'connection',
    'disconnect',
    'publish_text',
    'publish_image',
    'publish_video',
    'scheduling',
    'analytics',
    'inbox',
    'comments',
    'reviews',
    'webhooks',
)
CAPABILITY_STATUSES = frozenset({'supported', 'beta', 'planned', 'not_available'})
ENABLED_STATUSES = frozenset({'supported', 'beta'})


@dataclass(frozen=True)
class Capability:
    status: str = 'not_available'
    media_types: tuple[str, ...] = ()
    destination_types: tuple[str, ...] = ()
    scopes: tuple[str, ...] = ()
    max_items: int | None = None
    max_bytes: int | None = None
    max_characters: int | None = None

    def __post_init__(self):
        if self.status not in CAPABILITY_STATUSES:
            raise ValueError('capability.status: invalid status')
        for name in ('max_items', 'max_bytes', 'max_characters'):
            value = getattr(self, name)
            if value is not None and (type(value) is not int or value <= 0):
                raise ValueError(f'capability.{name}: must be a positive integer')

    @property
    def enabled(self):
        return self.status in ENABLED_STATUSES


@dataclass(frozen=True)
class ResiliencePolicy:
    retry_after: bool = True
    max_attempts: int = 3
    mutation_retry: str = 'reconcile_first'
    idempotency: str = 'local'
    reconciliation: str = 'manual'

    def __post_init__(self):
        if not 1 <= self.max_attempts <= 10:
            raise ValueError('resilience.max_attempts: must be between 1 and 10')
        if self.mutation_retry not in {'never', 'reconcile_first', 'idempotent'}:
            raise ValueError('resilience.mutation_retry: invalid policy')
        if self.idempotency not in {'local', 'remote', 'none'}:
            raise ValueError('resilience.idempotency: invalid policy')
        if self.reconciliation not in {'manual', 'remote_lookup'}:
            raise ValueError('resilience.reconciliation: invalid policy')


@dataclass(frozen=True)
class PlatformManifest:
    key: str
    title_fa: str
    title_en: str
    category: str
    category_title_fa: str
    auth_type: str
    capabilities: frozenset[str]
    output_service: str
    status: str
    support: Mapping[str, str] = field(default_factory=dict)
    constraints: Mapping[str, Capability] = field(default_factory=dict)
    publisher: str | None = None
    egress_service: str | None = None
    connection_handler: str | None = None
    destination_types: tuple[str, ...] = ('profile',)
    icon: str = ''
    brand_color: str = ''
    extensions: tuple[str, ...] = ()
    inbound: str = 'none'
    legacy_adapter: bool = False
    resilience: ResiliencePolicy = field(default_factory=ResiliencePolicy)

    def __post_init__(self):
        if not re.fullmatch(r'[a-z][a-z0-9_]{1,29}', self.key):
            raise ValueError('manifest.key: invalid key')
        if not self.title_fa or not self.title_en:
            raise ValueError('manifest.titles: both locales are required')
        if self.category not in {
            'messaging',
            'video',
            'social_content',
            'location',
            'general_social',
            'professional',
        }:
            raise ValueError('manifest.category: invalid category')
        if self.status not in {
            'discovery',
            'planned',
            'experimental',
            'beta',
            'active',
            'blocked',
            'deprecated',
        }:
            raise ValueError('manifest.status: invalid rollout status')
        if self.auth_type not in {
            'oauth2',
            'oidc',
            'api_key',
            'bot_token',
            'custom',
            'unsupported',
        }:
            raise ValueError('manifest.auth_type: invalid strategy')
        if self.inbound not in {'none', 'webhook', 'polling', 'both'}:
            raise ValueError('manifest.inbound: invalid transport')
        if not self.support:
            object.__setattr__(
                self, 'support', dict.fromkeys(CAPABILITIES, 'not_available')
            )
        if set(self.support) != set(CAPABILITIES):
            raise ValueError('manifest.support: incomplete capability schema')
        if set(self.support.values()) - CAPABILITY_STATUSES:
            raise ValueError('manifest.support: invalid status')
        if set(self.constraints) - set(self.support):
            raise ValueError('manifest.constraints: unknown capability')
        for key, constraint in self.constraints.items():
            if (
                not isinstance(constraint, Capability)
                or constraint.status != self.support[key]
            ):
                raise ValueError(f'manifest.constraints.{key}: inconsistent status')
        if not self.destination_types:
            raise ValueError('manifest.destination_types: required')
        object.__setattr__(self, 'support', MappingProxyType(dict(self.support)))
        object.__setattr__(
            self, 'constraints', MappingProxyType(dict(self.constraints))
        )

    @property
    def is_active(self):
        return self.status == 'active'

    def capability(self, name):
        return self.constraints.get(
            name, Capability(self.support.get(name, 'not_available'))
        )

    def public_contract(self):
        from dataclasses import asdict

        return {
            'version': 1,
            'destination_types': list(self.destination_types),
            'constraints': {
                name: asdict(policy) for name, policy in self.constraints.items()
            },
            'brand': {'icon': self.icon, 'color': self.brand_color},
            'inbound': self.inbound,
            'extensions': list(self.extensions),
            'resilience': asdict(self.resilience),
        }
