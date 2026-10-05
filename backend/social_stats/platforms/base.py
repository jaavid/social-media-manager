"""Stable contract implemented by every external social platform.

Providers own all platform URLs, media limits and response translation.  The
rest of the application deals only in these result objects and typed errors.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping

from social_stats.publishers.base import PublishError, PublishResult, RateLimitError, TokenExpiredError


class ProviderError(PublishError):
    """A normalized provider failure (``code`` is safe for API responses)."""


class ProviderRateLimitError(ProviderError, RateLimitError):
    """Preserve worker backoff handling while remaining a provider error."""


class ProviderTokenExpiredError(ProviderError, TokenExpiredError):
    """Preserve worker credential deactivation handling."""


def public_provider_data(value, secrets=()):
    from social_stats.observability import redact
    value = redact(value)

    def scrub(item):
        if isinstance(item, dict):
            return {key: scrub(v) for key, v in item.items()}
        if isinstance(item, list):
            return [scrub(v) for v in item]
        if isinstance(item, str):
            for secret in secrets:
                if secret:
                    item = item.replace(secret, '[REDACTED]')
        return item
    return scrub(value)


def safe_provider_error(exc):
    if exc.code == 'rate_limited':
        return ProviderRateLimitError('Provider operation failed', retry_after=getattr(exc, 'retry_after', None))
    if exc.code == 'token_expired':
        return ProviderTokenExpiredError('Provider operation failed')
    safe_codes = {'unsupported', 'token_expired', 'rate_limited', 'permission_denied',
                  'media_invalid', 'media_too_large', 'timeout', 'network_error',
                  'invalid_response', 'invalid_credentials'}
    safe = ProviderError('Provider operation failed',
                         code=exc.code if exc.code in safe_codes else 'provider_error',
                         supported=exc.supported)
    safe.retry_after = getattr(exc, 'retry_after', None)
    return safe


@dataclass(frozen=True)
class ProviderCapabilities:
    connect: bool = False
    publish: bool = False
    stats: bool = False
    inbox: bool = False
    comments: bool = False
    revoke: bool = False
    media_types: frozenset[str] = frozenset()
    features: frozenset[str] = frozenset()

    @classmethod
    def from_manifest(cls, manifest):
        media_types = set()
        for media_type in ('text', 'image', 'video'):
            policy = manifest.capability(f'publish_{media_type}')
            if policy.enabled:
                media_types.update(policy.media_types or (media_type,))
        return cls(
            connect=manifest.capability('connection').enabled,
            publish=bool(media_types), stats=manifest.capability('analytics').enabled,
            inbox=manifest.capability('inbox').enabled,
            comments=manifest.capability('comments').enabled,
            revoke=manifest.capability('disconnect').enabled,
            media_types=frozenset(media_types), features=frozenset(manifest.extensions),
        )

    def supports_feature(self, feature: str) -> bool:
        return feature in self.features

    def supports_media(self, media_type: str | None) -> bool:
        normalized = (media_type or 'text').lower()
        return self.publish and normalized in self.media_types


@dataclass
class ProviderResult:
    success: bool = True
    data: dict[str, Any] = field(default_factory=dict, repr=False)
    raw_response: dict[str, Any] = field(default_factory=dict, repr=False)
    warnings: list[str] = field(default_factory=list)


@dataclass
class ConnectionResult(ProviderResult):
    account_id: str = ''
    account_name: str = ''
    destination_id: str = ''
    destination_type: str = 'profile'
    scope: str = ''
    access_token: str = field(default='', repr=False)
    refresh_token: str = field(default='', repr=False)
    expires_at: Any = None

    def public_data(self):
        return public_provider_data(self.data, (self.access_token, self.refresh_token))


@dataclass
class StatsResult(ProviderResult):
    metrics: dict[str, int | float] = field(default_factory=dict)


@dataclass
class InboxResult(ProviderResult):
    items: list[dict[str, Any]] = field(default_factory=list)
    cursor: str = ''


class BasePlatformProvider:
    """Provider SPI. Unsupported operations fail predictably, never silently."""

    key = ''
    label = ''
    capabilities = ProviderCapabilities()
    publisher = None
    manifest = None

    def validate_credentials(self, credentials: Mapping[str, Any]) -> ConnectionResult:
        return self._unsupported('validate_credentials')

    def connect(self, credentials: Mapping[str, Any]) -> ConnectionResult:
        if not self.capabilities.connect:
            return self._unsupported('connect')
        return self.validate_credentials(credentials)

    def publish(self, credential, *, media_type: str, content: str = '',
                media_urls: list[str] | None = None, **kwargs) -> PublishResult:
        if not self.capabilities.supports_media(media_type):
            raise ProviderError(
                f'{self.label or self.key} does not support {media_type}',
                code='unsupported', supported=False,
            )
        if self.publisher is None:
            return self._unsupported('publish')
        return self.publisher.publish(
            credential, media_type=media_type, content=content,
            media_urls=media_urls or [], **kwargs,
        )

    def sync_stats(self, credential, *, remote_id: str = '') -> StatsResult:
        return self._unsupported('sync_stats')

    def fetch_inbox(self, credential, *, cursor: str = '') -> InboxResult:
        return self._unsupported('fetch_inbox')

    def fetch_comments(self, credential, *, remote_id: str, cursor: str = '') -> InboxResult:
        return self._unsupported('fetch_comments')

    def revoke(self, credential) -> ProviderResult:
        return self._unsupported('revoke')

    def _unsupported(self, operation: str):
        raise ProviderError(
            f'{self.label or self.key} does not support {operation}',
            code='unsupported', supported=False,
        )

    def publish_request(self, credential, destination, request) -> PublishResult:
        return self.publish(
            credential, media_type=request.media_type, content=request.content,
            media_urls=list(request.media_urls),
            destination_id=destination.remote_id or credential.social_account.external_id,
            **dict(request.extensions),
        )

    def disconnect(self, credential, destination, request=None) -> ProviderResult:
        return self.revoke(credential)

    def refresh(self, credential, destination, request=None) -> ConnectionResult:
        return self._unsupported('refresh')

    def sync(self, credential, destination, request=None) -> StatsResult:
        return self.sync_stats(credential)

    def analytics(self, credential, destination, request=None) -> StatsResult:
        return self.sync_stats(credential)

    def ingest(self, credential, destination, request=None) -> InboxResult:
        return self._unsupported('ingest')

    def reply(self, credential, destination, request=None) -> ProviderResult:
        return self._unsupported('reply')

    def health(self, credential):
        from .contracts import HealthResult
        reason = getattr(credential, 'auth_failure_code', '')
        if reason == 'revoked':
            return HealthResult(False, 'revoked', 'reconnect_required')
        if reason == 'token_expired' or credential.is_expired:
            return HealthResult(False, 'expired', 'token_expired')
        if not credential.access_token:
            return HealthResult(False, 'not_connected')
        if (not credential.is_active
                or not getattr(getattr(credential, 'social_account', None), 'is_active', True)):
            return HealthResult(False, 'unknown', 'reconnect_required')
        return HealthResult(True, 'ready')

    def connection_identity(self, result):
        return result.destination_id or result.account_id, result.account_name, {}

    def connected(self, account, result):
        """Provider-owned extension persistence, within the connection transaction."""

    def disconnected(self, account):
        """Provider-owned local extension cleanup."""

    def prepare_publish(self, post, resolve_media):
        """Translate only this provider's optional extensions into adapter input."""
        return {}

    def outbound_request(self, method, url, **kwargs):
        from social_stats.egress import outbound_request
        if not self.manifest or not self.manifest.egress_service:
            raise ProviderError('Provider egress service is not configured', code='egress_denied')
        return outbound_request(self.manifest.egress_service, method, url, **kwargs)
