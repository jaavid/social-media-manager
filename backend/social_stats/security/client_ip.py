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

from ipaddress import ip_address
from typing import Optional

from django.conf import settings


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


def get_client_ip(request) -> Optional[str]:
    """Resolve the effective client IP for security/audit/rate-limit use."""
    if request is None:
        return None

    remote = _validated_ip(request.META.get('REMOTE_ADDR'))

    if not getattr(settings, 'TRUST_PROXY_CLIENT_IP', False):
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
