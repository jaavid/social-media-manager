# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""Organization catalog. Historical SKUs retain their self-hosted behavior."""
from __future__ import annotations


def _unlimited(sku: str, side: str, label: str) -> dict:
    """A plan whose every quota is unlimited."""
    return {
        'sku':      sku,
        'side':     side,
        'label':    label,
        'price':    0,
        'currency': 'INR',
        'capabilities': {'automations': True, 'reports': True, 'ai': True},
        'features': ['All features included — free to self-host'],
        # Self-hosted and historical plans retain unlimited known quotas.
        'limits': {
            'workspaces':               None,
            'members':                  None,
            'social_accounts':          None,
            'storage_bytes':            None,
            'connected_platforms':      None,
            'posts_per_month':          None,
            'ai_generations_per_month': None,
            'analytics_history_days':   None,
            'active_relations':         None,
            'managed_clients':          None,
        },
    }


# End-user (B2C) and agency (B2B) plan SKUs are kept so historical
# Subscription.plan values still resolve to a valid (unlimited) plan dict.
EU_FREE           = _unlimited('eu-free',           'end_user', 'Free')
EU_PRO            = _unlimited('eu-pro',            'end_user', 'Pro')
EU_PREMIUM        = _unlimited('eu-premium',        'end_user', 'Premium')
AGENCY_STARTER    = _unlimited('agency-starter',    'agency',   'Starter')
AGENCY_GROWTH     = _unlimited('agency-growth',     'agency',   'Growth')
AGENCY_SCALE      = _unlimited('agency-scale',      'agency',   'Scale')
AGENCY_ENTERPRISE = _unlimited('agency-enterprise', 'agency',   'Enterprise')


PLANS = {
    p['sku']: p for p in [
        EU_FREE, EU_PRO, EU_PREMIUM,
        AGENCY_STARTER, AGENCY_GROWTH, AGENCY_SCALE, AGENCY_ENTERPRISE,
    ]
}


SELF_HOSTED = _unlimited('self-hosted', 'organization', 'Self-hosted')
ORG_FREE = _unlimited('org-free', 'organization', 'Organization Free')
ORG_FREE['limits'].update(workspaces=1, members=3, social_accounts=3,
                          storage_bytes=1073741824, ai_generations_per_month=50)
ORG_FREE['capabilities'].update(automations=False, reports=False)
ORG_PRO = _unlimited('org-pro', 'organization', 'Organization Pro')
ORG_PRO['limits'].update(workspaces=10, members=25, social_accounts=50,
                         storage_bytes=53687091200, ai_generations_per_month=1000)
PLANS.update({p['sku']: p for p in (SELF_HOSTED, ORG_FREE, ORG_PRO)})


def get_plan(sku: str) -> dict:
    # Unknown billing state must never silently become unlimited.
    return PLANS.get(sku) or ORG_FREE


def list_plans(side: str | None = None) -> list[dict]:
    return [p for p in PLANS.values() if side is None or p['side'] == side]


def get_limit(sku: str, key: str):
    return get_plan(sku)['limits'][key]
