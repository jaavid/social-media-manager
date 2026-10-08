"""Central outbound HTTP routing for third-party API calls.

A caller chooses a logical service from ``egress.registry``. The router then
uses direct, gateway, or auto mode. Auto fallback is *network-only*: completed
HTTP responses (including 4xx/5xx) are always returned to the provider client
for normal application-level error handling.
"""
from __future__ import annotations

import os
import time
from dataclasses import dataclass
from urllib.parse import urlparse

import requests
from django.core.cache import cache

from .registry import configured_mode, get_service


@dataclass(frozen=True)
class RouteResult:
    service: str
    route: str
    latency_ms: int


NETWORK_ERRORS = (
    requests.ConnectionError,
    requests.Timeout,
)


def gateway_url() -> str:
    return os.getenv('API_GATEWAY_URL', '').strip().rstrip('/')


def gateway_key() -> str:
    return os.getenv('API_GATEWAY_KEY', '').strip()


def _circuit_ttl() -> int:
    try:
        return max(10, int(os.getenv('OUTBOUND_CIRCUIT_TTL_SECONDS', '300')))
    except (TypeError, ValueError):
        return 300


def _circuit_key(service: str) -> str:
    return f'egress:direct-unhealthy:{service}'


def direct_circuit_open(service: str) -> bool:
    return bool(cache.get(_circuit_key(service)))


def clear_direct_circuit(service: str) -> None:
    cache.delete(_circuit_key(service))


def mark_direct_unhealthy(service: str) -> None:
    cache.set(_circuit_key(service), True, timeout=_circuit_ttl())


def _validate_direct_url(service: str, url: str) -> None:
    config = get_service(service)
    expected = urlparse(config.direct_origin)
    actual = urlparse(url)
    if actual.scheme != expected.scheme or actual.netloc != expected.netloc:
        raise ValueError(
            f'URL host is not allowlisted for service={service}: {actual.netloc}'
        )


def _gateway_url(service: str, direct_url: str, *, gateway_path: str | None = None) -> str:
    base = gateway_url()
    if not base:
        raise RuntimeError('API_GATEWAY_URL is not configured')

    config = get_service(service)
    _validate_direct_url(service, direct_url)
    parsed = urlparse(direct_url)
    path = gateway_path if gateway_path is not None else parsed.path
    if not path.startswith('/'):
        path = '/' + path
    query = f'?{parsed.query}' if parsed.query and gateway_path is None else ''
    return f'{base}/{config.gateway_route}{path}{query}'


def _send_direct(method: str, url: str, **kwargs):
    return requests.request(method=method, url=url, **kwargs)


def _send_gateway(
    service: str,
    method: str,
    direct_url: str,
    *,
    gateway_path: str | None = None,
    gateway_headers: dict | None = None,
    **kwargs,
):
    headers = dict(kwargs.pop('headers', {}) or {})
    headers.update(gateway_headers or {})
    key = gateway_key()
    if key:
        headers['X-API-Gateway-Key'] = key

    return requests.request(
        method=method,
        url=_gateway_url(service, direct_url, gateway_path=gateway_path),
        headers=headers,
        **kwargs,
    )


def _annotate(response, *, service: str, route: str, started: float):
    # Never retain the direct URL in metadata: Bot API direct URLs include the
    # credential itself. Service/route/latency are sufficient for observability.
    response.egress_route = RouteResult(
        service=service,
        route=route,
        latency_ms=int((time.monotonic() - started) * 1000),
    )
    return response


def outbound_request(
    service: str,
    method: str,
    url: str,
    *,
    mode: str | None = None,
    gateway_path: str | None = None,
    gateway_headers: dict | None = None,
    **kwargs,
):
    """Send an allowlisted outbound request through the selected egress path.

    ``direct``
        Never use the gateway.
    ``gateway``
        Always use the gateway and fail if it is not configured.
    ``auto``
        Prefer direct. Safe read methods may fall back after network errors.
        Writes fall back only on ConnectTimeout with redirects explicitly disabled;
        other failures may follow a completed write and must propagate. A short cache-backed circuit avoids repeating a
        known-bad direct connection on every Celery task.

    ``gateway_path``/``gateway_headers`` are only applied to the gateway leg.
    This lets Telegram/Bale keep bot tokens out of gateway URLs without leaking
    those internal headers to the direct provider endpoint.
    """
    _validate_direct_url(service, url)
    selected = (mode or configured_mode(service)).strip().lower()
    if selected not in {'direct', 'gateway', 'auto'}:
        selected = 'auto'

    if selected == 'direct':
        started = time.monotonic()
        response = _send_direct(method, url, **kwargs)
        clear_direct_circuit(service)
        return _annotate(response, service=service, route='direct', started=started)

    if selected == 'gateway':
        started = time.monotonic()
        response = _send_gateway(
            service, method, url,
            gateway_path=gateway_path,
            gateway_headers=gateway_headers,
            **kwargs,
        )
        return _annotate(response, service=service, route='gateway', started=started)

    # auto
    if direct_circuit_open(service) and gateway_url():
        started = time.monotonic()
        response = _send_gateway(
            service, method, url,
            gateway_path=gateway_path,
            gateway_headers=gateway_headers,
            **kwargs,
        )
        return _annotate(response, service=service, route='gateway', started=started)

    try:
        started = time.monotonic()
        response = _send_direct(method, url, **kwargs)
        clear_direct_circuit(service)
        return _annotate(response, service=service, route='direct', started=started)
    except NETWORK_ERRORS as error:
        safe_read = method.upper() in {'GET', 'HEAD', 'OPTIONS'}
        before_send = (isinstance(error, requests.ConnectTimeout)
                       and kwargs.get('allow_redirects') is False)
        if not (safe_read or before_send) or not gateway_url():
            raise
        mark_direct_unhealthy(service)

    started = time.monotonic()
    response = _send_gateway(
        service, method, url,
        gateway_path=gateway_path,
        gateway_headers=gateway_headers,
        **kwargs,
    )
    return _annotate(response, service=service, route='gateway', started=started)
