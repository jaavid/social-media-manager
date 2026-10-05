"""Fail-closed boundary for new integrations; legacy adapters remain compatible."""

from __future__ import annotations

import math

from .base import (
    ProviderError,
    ProviderResult,
    StatsResult,
    InboxResult,
    safe_provider_error,
)
from .contracts import (
    DestinationContext,
    PublishRequest,
    InboundEvent,
    ReplyRequest,
    HealthResult,
)
from social_stats.publishers.base import PublishError, PublishResult

OPERATIONS = {
    'disconnect': 'disconnect',
    'refresh': 'connection',
    'publish': None,
    'sync': 'analytics',
    'ingest': 'webhooks',
    'reply': None,
    'analytics': 'analytics',
    'health': None,
}


class ProviderExecution:
    """Caller must authorize workspace access before constructing this boundary.

    Provider adapters receive only the selected credential. Raw provider payloads
    stay internal; errors leaving this boundary contain stable codes, not tokens.
    """

    def __init__(self, provider, credential, destination: DestinationContext):
        self.provider = provider
        self.credential = credential
        self.destination = destination

    def _scope(self, *, allow_inactive=False):
        credential, destination = self.credential, self.destination
        account = getattr(credential, 'social_account', None)
        if (
            not isinstance(destination, DestinationContext)
            or account is None
            or not destination.workspace_id
            or not destination.account_id
            or credential.client_id != destination.workspace_id
            or account.client_id != destination.workspace_id
            or account.pk != destination.account_id
            or credential.platform != self.provider.manifest.key
            or account.platform != self.provider.manifest.key
            or destination.kind not in self.provider.manifest.destination_types
            or (destination.remote_id and destination.remote_id != account.external_id)
        ):
            raise ProviderError('Provider account scope denied', code='scope_denied')
        if not allow_inactive and (
            not credential.is_active
            or not account.is_active
            or not credential.access_token
        ):
            raise ProviderError(
                'Provider account is disconnected', code='not_connected'
            )

    def call(self, operation, request=None):
        self._scope(allow_inactive=operation == 'health')
        provider = self.provider
        if provider.manifest.status in {'blocked', 'deprecated'} and operation not in {
            'disconnect',
            'health',
        }:
            provider._unsupported(operation)
        if operation not in OPERATIONS:
            raise ProviderError(
                'Unknown provider operation', code='unsupported', supported=False
            )
        capability = OPERATIONS[operation]
        if operation == 'publish':
            if not isinstance(request, PublishRequest):
                raise ProviderError(
                    'Typed publish request required', code='invalid_request'
                )
            capability = f'publish_{request.media_type}'
        elif operation == 'reply':
            if not isinstance(request, ReplyRequest) or request.kind not in {
                'inbox',
                'comments',
                'reviews',
            }:
                raise ProviderError(
                    'Typed reply request required', code='invalid_request'
                )
            capability = request.kind
        if capability and not provider.manifest.capability(capability).enabled:
            provider._unsupported(operation)
        if operation not in {'health', 'disconnect'} and self.credential.is_expired:
            raise ProviderError('Provider account token expired', code='token_expired')
        if operation == 'publish':
            policy = provider.manifest.capability(capability)
            if (
                policy.destination_types
                and self.destination.kind not in policy.destination_types
            ):
                raise ProviderError(
                    'Destination type is unsupported', code='invalid_destination'
                )
            if policy.max_items and len(request.media_urls) > policy.max_items:
                raise ProviderError('Too many media items', code='media_invalid')
            if policy.max_characters and len(request.content) > policy.max_characters:
                raise ProviderError(
                    'Content exceeds platform limit', code='media_invalid'
                )
            if policy.scopes and not set(policy.scopes) <= set(
                self.credential.scope.split()
            ):
                raise ProviderError(
                    'Required provider permissions are missing',
                    code='permission_denied',
                )
            if set(request.extensions) - set(provider.manifest.extensions):
                raise ProviderError(
                    'Unknown provider extension', code='invalid_request'
                )
            from social_stats.security.ssrf import check_url, UnsafeURLError

            try:
                for url in request.media_urls:
                    check_url(url, allowed_schemes=('https',))
            except (UnsafeURLError, ValueError):
                raise ProviderError(
                    'Media URL is not allowed', code='media_invalid'
                ) from None
            if not request.idempotency_key:
                raise ProviderError(
                    'Publication intent identifier required',
                    code='idempotency_required',
                )
        if operation == 'ingest' and (
            not isinstance(request, InboundEvent)
            or not request.event_id
            or not request.authenticity_verified
        ):
            raise ProviderError('Verified inbound event required', code='invalid_event')
        try:
            if operation == 'publish':
                result = provider.publish_request(
                    self.credential, self.destination, request
                )
                expected = PublishResult
            elif operation == 'health':
                result = provider.health(self.credential)
                expected = HealthResult
            else:
                result = getattr(provider, operation)(
                    self.credential, self.destination, request
                )
                expected = (
                    StatsResult
                    if operation in {'sync', 'analytics'}
                    else (InboxResult if operation == 'ingest' else ProviderResult)
                )
            if not isinstance(result, expected):
                raise ProviderError(
                    'Provider returned an invalid result', code='invalid_response'
                )
            if isinstance(result, StatsResult) and (
                not isinstance(result.metrics, dict)
                or any(
                    not isinstance(key, str)
                    or type(value) not in {int, float}
                    or not math.isfinite(value)
                    for key, value in result.metrics.items()
                )
            ):
                raise ProviderError(
                    'Provider returned invalid metrics', code='invalid_response'
                )
            if (
                isinstance(result, PublishResult)
                and result.success
                and not result.platform_post_id
            ):
                raise ProviderError(
                    'Provider returned no publication identifier',
                    code='invalid_response',
                )
            if isinstance(result, InboxResult) and (
                not isinstance(result.items, list)
                or not isinstance(result.cursor, str)
                or any(not isinstance(item, dict) for item in result.items)
            ):
                raise ProviderError(
                    'Provider returned invalid inbox items', code='invalid_response'
                )
            return result
        except PublishError as exc:
            raise safe_provider_error(exc) from None
        except Exception:
            raise ProviderError(
                'Provider operation failed', code='provider_error'
            ) from None
