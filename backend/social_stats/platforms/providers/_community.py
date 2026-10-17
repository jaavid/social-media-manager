"""Shared transport for community APIs. Never propagate remote error text/secrets."""
import math

import requests

from social_stats.egress import outbound_request
from social_stats.platforms.base import ProviderError
from social_stats.publishers.base import RateLimitError, TokenExpiredError


def request_json(service, method, url, **kwargs):
    try:
        response = outbound_request(service, method, url, timeout=(10, 45),
                                    allow_redirects=False, **kwargs)
    except requests.Timeout:
        raise ProviderError('Provider timed out', code='timeout') from None
    except requests.RequestException:
        raise ProviderError('Provider network failure', code='network_error') from None
    if response.status_code == 204:
        return {}
    try:
        data = response.json()
    except ValueError:
        data = None
    if response.status_code == 401:
        raise TokenExpiredError()
    if response.status_code == 403:
        raise ProviderError('Provider permission denied', code='permission_denied')
    if response.status_code == 429:
        retry = data.get('retry_after') if isinstance(data, dict) else None
        try:
            retry = max(1, math.ceil(float(retry or response.headers.get('Retry-After', 60))))
        except (ValueError, TypeError, OverflowError):
            retry = 60
        raise RateLimitError(retry_after=retry)
    if not response.ok:
        raise ProviderError('Provider request failed', code='provider_error')
    if not isinstance(data, (dict, list)):
        raise ProviderError('Invalid provider response', code='invalid_response')
    return data


def required_object(data, *keys):
    if not isinstance(data, dict) or any(not data.get(key) for key in keys):
        raise ProviderError('Invalid provider response', code='invalid_response')
    return data
