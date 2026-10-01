"""Stable contract implemented by every external social platform.

Providers own all platform URLs, media limits and response translation.  The
rest of the application deals only in these result objects and typed errors.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping

from social_stats.publishers.base import PublishError, PublishResult


class ProviderError(PublishError):
    """A normalized provider failure (``code`` is safe for API responses)."""


@dataclass(frozen=True)
class ProviderCapabilities:
    connect: bool = False
    publish: bool = False
    stats: bool = False
    inbox: bool = False
    comments: bool = False
    revoke: bool = False
    media_types: frozenset[str] = frozenset()

    def supports_media(self, media_type: str | None) -> bool:
        normalized = (media_type or 'text').lower()
        return self.publish and normalized in self.media_types


@dataclass
class ProviderResult:
    success: bool = True
    data: dict[str, Any] = field(default_factory=dict)
    raw_response: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)


@dataclass
class ConnectionResult(ProviderResult):
    account_id: str = ''
    account_name: str = ''
    destination_id: str = ''
    scope: str = ''
    access_token: str = ''
    refresh_token: str = ''
    expires_at: Any = None


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
