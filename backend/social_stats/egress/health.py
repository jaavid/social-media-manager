"""Connectivity diagnostics for allowlisted external API routes."""
from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

from .registry import SERVICES, configured_mode, get_service
from .router import direct_circuit_open, gateway_key, gateway_url


def _elapsed(started: float) -> int:
    return int((time.monotonic() - started) * 1000)


def probe_direct(service: str, *, timeout: int = 4) -> dict:
    config = get_service(service)
    started = time.monotonic()
    try:
        response = requests.get(
            config.probe_url,
            timeout=timeout,
            allow_redirects=False,
            headers={'User-Agent': 'social-stats-egress-probe/1.0'},
        )
        # Any completed HTTP response proves DNS/TLS/HTTP reachability. A 401,
        # 403 or 404 is not an egress failure.
        return {
            'reachable': True,
            'status': response.status_code,
            'latency_ms': _elapsed(started),
            'route': 'direct',
        }
    except requests.RequestException as exc:
        return {
            'reachable': False,
            'error': exc.__class__.__name__,
            'latency_ms': _elapsed(started),
            'route': 'direct',
        }


def probe_gateway_health(*, timeout: int = 4) -> dict:
    try:
        base = gateway_url()
    except ValueError:
        return {'reachable': False, 'configured': True, 'error': 'invalid_configuration', 'route': 'gateway'}
    if not base:
        return {'reachable': False, 'configured': False, 'error': 'not_configured'}

    started = time.monotonic()
    headers = {}
    if gateway_key():
        headers['X-API-Gateway-Key'] = gateway_key()
    try:
        response = requests.get(f'{base}/_gateway/health', headers=headers, timeout=timeout, allow_redirects=False)
        payload = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
        return {
            'reachable': 200 <= response.status_code < 300 and bool(payload.get('ok', response.ok)),
            'configured': True,
            'status': response.status_code,
            'version': payload.get('version'),
            'auth_required': payload.get('auth_required'),
            'latency_ms': _elapsed(started),
        }
    except (requests.RequestException, ValueError) as exc:
        return {
            'reachable': False,
            'configured': True,
            'error': exc.__class__.__name__,
            'latency_ms': _elapsed(started),
        }


def probe_gateway_route(service: str, *, timeout: int = 4) -> dict:
    try:
        base = gateway_url()
    except ValueError:
        return {'reachable': False, 'configured': True, 'error': 'invalid_configuration', 'route': 'gateway'}
    config = get_service(service)
    if not base:
        return {
            'reachable': False,
            'configured': False,
            'error': 'gateway_not_configured',
            'route': 'gateway',
        }

    headers = {}
    if gateway_key():
        headers['X-API-Gateway-Key'] = gateway_key()
    started = time.monotonic()
    try:
        response = requests.get(
            f'{base}/_gateway/probe/{config.gateway_route}',
            headers=headers,
            timeout=timeout,
            allow_redirects=False,
        )
        try:
            payload = response.json()
        except ValueError:
            payload = {}
        reachable = bool(200 <= response.status_code < 300 and payload.get('reachable'))
        result = {
            'reachable': reachable,
            'configured': True,
            'status': response.status_code,
            'latency_ms': payload.get('latency_ms', _elapsed(started)),
            'route': 'gateway',
        }
        if payload.get('upstream_status') is not None:
            result['upstream_status'] = payload['upstream_status']
        if not reachable:
            result['error'] = payload.get('error') or (
                'route_not_configured' if response.status_code == 404 else 'gateway_probe_failed'
            )
        return result
    except requests.RequestException as exc:
        return {
            'reachable': False,
            'configured': True,
            'error': exc.__class__.__name__,
            'latency_ms': _elapsed(started),
            'route': 'gateway',
        }


def runtime_route(service: str) -> str:
    mode = configured_mode(service)
    if mode in ('direct', 'gateway'):
        return mode
    try:
        configured = bool(gateway_url())
    except ValueError:
        configured = False
    if configured and direct_circuit_open(service):
        return 'gateway'
    return 'direct'


def probe_service(service: str, *, timeout: int = 4) -> dict:
    config = get_service(service)
    direct = probe_direct(service, timeout=timeout)
    gateway = probe_gateway_route(service, timeout=timeout)
    mode = configured_mode(service)
    active = runtime_route(service)

    if mode == 'auto':
        recommended = 'direct' if direct.get('reachable') else (
            'gateway' if gateway.get('reachable') else 'unavailable'
        )
    else:
        selected = direct if mode == 'direct' else gateway
        recommended = mode if selected.get('reachable') else 'unavailable'

    return {
        'id': service,
        'name': config.label,
        'mode': mode,
        'active_route': active,
        'recommended_route': recommended,
        'circuit_open': direct_circuit_open(service),
        'direct': direct,
        'gateway': gateway,
    }


def probe_all_services(*, timeout: int = 4) -> list[dict]:
    """Probe all registered services concurrently to keep admin diagnostics fast."""
    results: dict[str, dict] = {}
    workers = min(8, max(1, len(SERVICES)))
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {
            pool.submit(probe_service, service, timeout=timeout): service
            for service in SERVICES
        }
        for future in as_completed(futures):
            service = futures[future]
            try:
                results[service] = future.result()
            except Exception as exc:  # diagnostics must never 500 because one probe broke
                config = get_service(service)
                results[service] = {
                    'id': service,
                    'name': config.label,
                    'mode': configured_mode(service),
                    'active_route': runtime_route(service),
                    'recommended_route': 'unavailable',
                    'direct': {'reachable': False, 'error': exc.__class__.__name__},
                    'gateway': {'reachable': False, 'error': 'probe_failed'},
                }
    return [results[key] for key in SERVICES]
