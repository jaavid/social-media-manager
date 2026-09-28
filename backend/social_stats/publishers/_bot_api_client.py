"""Shared HTTP client for Telegram Bot API compatible providers.

Direct calls retain the provider's normal ``/bot<TOKEN>/method`` URL. Gateway
calls use ``/telegram/bot/method`` (or Bale equivalent) and send the token in an
internal header that API Access Gateway strips before forwarding. Exceptions
never include a token-bearing URL.
"""
from __future__ import annotations

from typing import Any

import requests

from social_stats.egress import outbound_request
from .base import (
    PermissionDeniedError,
    PublishError,
    RateLimitError,
    TokenExpiredError,
)


_PROVIDER_SERVICES = {
    'https://api.telegram.org': 'telegram',
    'https://tapi.bale.ai': 'bale',
}

_GATEWAY_ERRORS = {
    'unauthorized',
    'route_not_found',
    'upstream_unreachable',
    'invalid_bot_token',
    'invalid_route',
}


class BotAPIClient:
    def __init__(self, token: str, base_url: str, *, timeout: int = 30, service: str | None = None):
        self.token = (token or '').strip()
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.service = service or _PROVIDER_SERVICES.get(self.base_url)
        if not self.token:
            raise TokenExpiredError('Bot token is missing')
        if not self.service:
            raise PublishError('Unknown bot API provider', code='missing_config')

    def call(self, method: str, *, data: dict | None = None, files: dict | None = None) -> dict:
        direct_url = f"{self.base_url}/bot{self.token}/{method}"
        try:
            response = outbound_request(
                self.service,
                'POST',
                direct_url,
                data=data or {},
                files=files,
                timeout=self.timeout,
                gateway_path=f'/bot/{method}',
                gateway_headers={'X-Upstream-Bot-Token': self.token},
            )
        except requests.RequestException as exc:
            raise PublishError(
                f'Bot API network error while calling {method}',
                code='network_error',
            ) from exc
        except (RuntimeError, ValueError) as exc:
            raise PublishError(
                f'Bot API egress configuration error while calling {method}',
                code='egress_config',
            ) from exc

        try:
            payload: dict[str, Any] = response.json()
        except ValueError as exc:
            raise PublishError(
                f'Bot API returned a non-JSON response for {method}',
                code='invalid_response', status_code=response.status_code,
            ) from exc

        route = getattr(getattr(response, 'egress_route', None), 'route', None)
        gateway_error = payload.get('error') if route == 'gateway' else None
        if gateway_error in _GATEWAY_ERRORS and not payload.get('error_code'):
            if gateway_error == 'unauthorized':
                raise PublishError(
                    'API gateway authentication failed',
                    code='egress_auth', status_code=response.status_code, raw=payload,
                )
            if gateway_error == 'route_not_found':
                raise PublishError(
                    f'API gateway route is not configured for {self.service}',
                    code='egress_route_missing', status_code=response.status_code, raw=payload,
                )
            if gateway_error == 'upstream_unreachable':
                raise PublishError(
                    f'API gateway could not reach {self.service}',
                    code='network_error', status_code=response.status_code, raw=payload,
                )
            raise PublishError(
                'API gateway rejected the outbound request',
                code='egress_config', status_code=response.status_code, raw=payload,
            )

        error_code = int(payload.get('error_code') or response.status_code or 0)

        if response.status_code == 401 or error_code == 401:
            raise TokenExpiredError(status_code=401, raw=payload)
        if response.status_code == 403 or error_code == 403:
            raise PermissionDeniedError(status_code=403, raw=payload)

        retry_after = (payload.get('parameters') or {}).get('retry_after')
        if response.status_code == 429 or error_code == 429 or retry_after:
            try:
                retry_after_seconds = int(retry_after or 60)
            except (TypeError, ValueError):
                retry_after_seconds = 60
            raise RateLimitError(
                payload.get('description') or 'Bot API rate limit exceeded',
                retry_after=retry_after_seconds,
                status_code=response.status_code,
                raw=payload,
            )

        if not response.ok or not payload.get('ok', False):
            description = payload.get('description') or f'Bot API request failed ({response.status_code})'
            raise PublishError(
                description,
                code=str(payload.get('error_code') or 'bot_api_error'),
                status_code=response.status_code,
                raw=payload,
            )

        return payload

    def get_me(self) -> dict:
        return self.call('getMe').get('result') or {}

    def get_chat(self, chat_id: str) -> dict:
        return self.call('getChat', data={'chat_id': chat_id}).get('result') or {}
