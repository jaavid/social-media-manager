"""Shared HTTP client for Telegram Bot API compatible providers.

The bot token is deliberately never included in exceptions or log messages because
both Telegram and Bale embed it in the request URL.
"""
from __future__ import annotations

from typing import Any

import requests

from .base import (
    PermissionDeniedError,
    PublishError,
    RateLimitError,
    TokenExpiredError,
)


class BotAPIClient:
    def __init__(self, token: str, base_url: str, *, timeout: int = 30):
        self.token = (token or '').strip()
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        if not self.token:
            raise TokenExpiredError('Bot token is missing')

    def call(self, method: str, *, data: dict | None = None, files: dict | None = None) -> dict:
        url = f"{self.base_url}/bot{self.token}/{method}"
        try:
            response = requests.post(url, data=data or {}, files=files, timeout=self.timeout)
        except requests.RequestException as exc:
            raise PublishError(
                f'Bot API network error while calling {method}',
                code='network_error',
            ) from exc

        try:
            payload: dict[str, Any] = response.json()
        except ValueError as exc:
            raise PublishError(
                f'Bot API returned a non-JSON response for {method}',
                code='invalid_response', status_code=response.status_code,
            ) from exc

        if response.status_code == 401:
            raise TokenExpiredError(status_code=401, raw=payload)
        if response.status_code == 403:
            raise PermissionDeniedError(status_code=403, raw=payload)

        retry_after = (payload.get('parameters') or {}).get('retry_after')
        if response.status_code == 429 or retry_after:
            raise RateLimitError(
                payload.get('description') or 'Bot API rate limit exceeded',
                retry_after=int(retry_after or 60),
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
