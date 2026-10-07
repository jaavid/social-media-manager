# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""
usage measurement + limit enforcement helpers.

Backed by the organization subscription. Legacy agency meters remain historical. Keep this module thin and
read-only: callers either query (`get_usage`) or check (`check_limit`)
before performing the action.

A limit value of `None` means unlimited.
A limit value of `0` blocks the action entirely.
"""
from __future__ import annotations

from .models import Client, Subscription


def get_or_create_subscription(client: Client) -> Subscription:
    """Compatibility helper: billing ownership is always the organization."""
    from .entitlements import subscription_for

    return subscription_for(client.organization)


def get_usage(client: Client) -> dict:
    from .entitlements import snapshot

    state = snapshot(client.organization)
    # Keep the legacy list contract while reporting organization totals.
    state['usage'] = [{'key': key, **value} for key, value in state['usage'].items()]
    return state


def check_limit(client: Client, key: str, *, increment: int = 1):
    """Read-only preflight; model writes/reservations perform atomic enforcement."""
    from .entitlements import EntitlementDenied, require_capacity

    key = {'connected_platforms': 'social_accounts'}.get(key, key)
    try:
        return True, None, require_capacity(client.organization, key, increment)
    except EntitlementDenied as exc:
        return False, 'Organization entitlement exceeded', exc.detail


def get_or_create_agency_subscription(agency):
    """Historical lookup only; delegated agencies never own tenant billing."""
    return Subscription.objects.filter(agency=agency).first()


def get_agency_usage(agency):
    from .models import AgencyClientRelation

    return {
        'subscription': None,
        'usage': [{'key': 'managed_clients', 'current': AgencyClientRelation.objects.filter(
            agency=agency, status='active',
        ).count(), 'limit': None, 'remaining': None, 'percent': None}],
    }


def check_agency_limit(agency, key: str, *, increment: int = 1):
    # Delegation quotas are outside tenant subscription ownership (#51).
    return True, None, {'current': None, 'limit': None, 'plan': None}
