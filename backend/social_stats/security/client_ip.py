# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""Canonical client-IP resolution for trusted reverse-proxy deployments.

By default the application trusts only REMOTE_ADDR. Production deployments
behind a trusted CDN / reverse proxy can opt in with TRUST_PROXY_CLIENT_IP=True.
When enabled, the lookup order is:

1. ArvanCloud's ``ar-real-ip`` header
2. ``X-Real-IP``
3. first valid address in ``X-Forwarded-For``
4. ``REMOTE_ADDR``

Never enable proxy-header trust when the app/origin is directly reachable by
untrusted clients; those headers can otherwise be spoofed.
"""
from __future__ import annotations

import os
from ipaddress import ip_address
from typing import Optional

from django.conf import settings


def _env_bool(name: str, default: bool = False) -> bool:
    configured = getattr(settings, name, None)
    if configured is not None:
        return bool(configured)
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in ('1', 'true', 'yes', 'on')


def _validated_ip(value: str | None) -> Optional[str]:
    """Return a normalized IPv4/IPv6 string, or None for invalid input."""
    raw = (value or '').strip()
    if not raw:
        return None

    if raw.startswith('[') and ']' in raw:
        raw = raw[1:raw.index(']')]

    try:
        return str(ip_address(raw))
    except ValueError:
        return None


def proxy_ip_trust_enabled() -> bool:
    return _env_bool('TRUST_PROXY_CLIENT_IP', False)


def get_client_ip(request) -> Optional[str]:
    """Resolve the effective client IP for security/audit/rate-limit use."""
    if request is None:
        return None

    remote = _validated_ip(request.META.get('REMOTE_ADDR'))

    if not proxy_ip_trust_enabled():
        return remote

    candidate = _validated_ip(request.META.get('HTTP_AR_REAL_IP'))
    if candidate:
        return candidate

    candidate = _validated_ip(request.META.get('HTTP_X_REAL_IP'))
    if candidate:
        return candidate

    xff = request.META.get('HTTP_X_FORWARDED_FOR') or ''
    for item in xff.split(','):
        candidate = _validated_ip(item)
        if candidate:
            return candidate

    return remote


def normalize_request_client_ip(request) -> Optional[str]:
    """Normalize proxy-aware IP metadata once, before auth/security middleware.

    This lets django-axes and legacy call sites that still read REMOTE_ADDR or
    the first X-Forwarded-For value observe the same canonical client address.
    The original forwarding chain is kept after the canonical first element.
    """
    trusted = proxy_ip_trust_enabled()
    if not trusted:
        # Legacy security consumers read these headers directly. Opt-out must
        # remove them before even the missing-peer early return.
        for header in ('HTTP_AR_REAL_IP', 'HTTP_X_REAL_IP', 'HTTP_X_FORWARDED_FOR'):
            request.META.pop(header, None)
    client_ip = get_client_ip(request)
    if not client_ip:
        return None

    request.client_ip = client_ip

    if not trusted:
        return client_ip

    request.META['REMOTE_ADDR'] = client_ip
    request.META['HTTP_X_REAL_IP'] = client_ip

    forwarded = [
        part.strip() for part in (request.META.get('HTTP_X_FORWARDED_FOR') or '').split(',')
        if part.strip()
    ]
    if not forwarded or forwarded[0] != client_ip:
        forwarded.insert(0, client_ip)
    request.META['HTTP_X_FORWARDED_FOR'] = ', '.join(forwarded)

    return client_ip
