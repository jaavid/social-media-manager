# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""
Meta Ads (Marketing API) integration.

Picker reads require explicit workspace_id, automation permission and one active
Facebook credential. Marketing account/campaign parentage is verified before reads.

Endpoints:
    GET /api/meta-ads/accounts/?workspace_id=…       — list /me/adaccounts
    GET /api/meta-ads/campaigns/?workspace_id=…&ad_account_id=…      — list CTWA-eligible campaigns
    GET /api/meta-ads/ads/?workspace_id=…&ad_account_id=…&campaign_id=…              — list ads under a campaign

The daily Celery task and the CTWACampaign `/sync-meta` action both
call `sync_campaign_spend(campaign)` here. In dev (no facebook credential
configured for the workspace), all endpoints degrade gracefully with a
`{'error': 'meta ads not connected', ...}` response so the frontend can
prompt the user to connect.
"""
from __future__ import annotations

import logging
import re

import requests
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from social_stats.models import CTWACampaign, PlatformCredential


logger = logging.getLogger(__name__)


GRAPH_BASE = 'https://graph.facebook.com/v21.0'


def _resolve_token(user) -> tuple[str | None, int | None]:
    """Return (access_token, client_id) for the calling user's facebook
    PlatformCredential. None when not connected."""
    profile = getattr(user, 'profile', None)
    if not profile:
        return (None, None)
    if profile.role == 'superadmin':
        return (None, None)
    cred = (
        PlatformCredential.objects.filter(
            client_id=profile.client_id, platform='facebook', is_active=True,
        ).first()
    )
    if not cred or not cred.access_token:
        return (None, profile.client_id)
    return (cred.access_token, profile.client_id)


def _graph(method: str, path: str, *, token: str, params: dict | None = None,
          timeout: int = 8) -> tuple[bool, dict]:
    """Minimal Graph API client. Returns (ok, body)."""
    url = f'{GRAPH_BASE}{path}'
    p = {'access_token': token, **(params or {})}
    try:
        r = requests.request(method, url, params=p, timeout=timeout)
        body = r.json() if r.content else {}
    except (requests.RequestException, ValueError):
        logger.warning('Meta Ads transport or response failure')
        return (False, {'code': 'provider_unavailable'})
    if not isinstance(body, dict):
        return (False, {'code': 'invalid_provider_response'})
    if r.status_code >= 400 or 'error' in body:
        return (False, {'code': 'provider_failed', 'status_code': r.status_code})
    return (True, body)


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def meta_ads_health(request):
    """surface Meta Ads connection health to the frontend so it can
    nudge the user to reconnect before tokens expire."""
    profile = getattr(request.user, 'profile', None)
    if not profile or profile.role == 'superadmin':
        return Response({'connected': False, 'error': 'no client context'})

    cred = (
        PlatformCredential.objects.filter(
            client_id=profile.client_id, platform='facebook', is_active=True,
        ).first()
    )
    if not cred or not cred.access_token:
        return Response({'connected': False})

    # Cheap probe: GET /me with the token. Costs nothing in rate-limit terms.
    ok, body = _graph('GET', '/me', token=cred.access_token, params={'fields': 'id,name'}, timeout=4)
    if not ok:
        return Response({
            'connected': False,
            'error': body.get('error') or 'token invalid',
            'expires_at': cred.expires_at.isoformat() if cred.expires_at else None,
        })

    expires_at = cred.expires_at
    days_left = None
    if expires_at:
        delta = expires_at - timezone.now()
        days_left = int(delta.total_seconds() // 86400)

    # Optional pixel sanity check (CAPI works without one but the UI can
    # encourage configuring it for better attribution).
    from social_stats.models import Client
    client = Client.objects.filter(pk=profile.client_id).first()
    pixel_id = (getattr(client, 'meta_pixel_id', '') or '').strip()

    return Response({
        'connected':  True,
        'fb_user':    {'id': body.get('id'), 'name': body.get('name')},
        'expires_at': expires_at.isoformat() if expires_at else None,
        'days_left':  days_left,
        'expired':    bool(expires_at and timezone.now() >= expires_at),
        'pixel_configured': bool(pixel_id),
    })


def _picker_context(request):
    """Explicit workspace and existing automation/account authorization, before I/O."""
    from social_stats.views.connections import workspace_for, permitted

    # WorkspaceVocabularyMiddleware normalizes workspace_id to client_id.
    workspace_id = request.query_params.get('client_id', '')
    if not re.fullmatch(r'[1-9][0-9]*', workspace_id):
        return None, None, Response({'code': 'workspace_required'}, status=400)
    workspace, error = workspace_for(request, int(workspace_id))
    if error is not None:
        return None, None, error
    if not permitted(request.user, workspace, 'manage_automation'):
        return None, None, Response({'code': 'permission_denied'}, status=403)
    credentials = list(PlatformCredential.objects.filter(
        client=workspace, platform='facebook', is_active=True,
    ).select_related('social_account')[:2])
    if len(credentials) > 1:
        return None, None, Response({'code': 'ambiguous_meta_connection'}, status=409)
    cred = credentials[0] if credentials else None
    if cred and cred.social_account and not permitted(
        request.user, workspace, 'manage_automation', cred.social_account,
    ):
        return None, None, Response({'code': 'permission_denied'}, status=403)
    if not cred or not cred.access_token:
        return None, None, Response({'connected': False, 'workspace_id': workspace.pk})
    return cred.access_token, workspace.pk, None


def _provider_failure(body):
    status = body.get('status_code')
    status = status if status in (401, 403, 404, 429) else 502
    # A provider 401 is not a revoked application session.
    if status == 401:
        status = 403
    return Response({'code': 'meta_read_failed'}, status=status)


def _collection(token, path, fields):
    ok, body = _graph('GET', path, token=token, params={'fields': fields, 'limit': 100})
    if not ok:
        return None, False, _provider_failure(body)
    rows = body.get('data')
    if (not isinstance(rows, list) or any(not isinstance(row, dict)
            or not isinstance(row.get('id'), str) or not row['id'] for row in rows)
            or len({row['id'] for row in rows}) != len(rows)):
        return None, False, Response({'code': 'invalid_meta_response'}, status=502)
    paging = body.get('paging', {})
    if not isinstance(paging, dict):
        return None, False, Response({'code': 'invalid_meta_response'}, status=502)
    return rows, bool(paging.get('next')), None


def _account_scope(request, token):
    account = request.query_params.get('ad_account_id', '')
    if not re.fullmatch(r'act_[0-9]+', account):
        return None, Response({'code': 'ad_account_required'}, status=400)
    rows, partial, error = _collection(token, '/me/adaccounts', 'id,name,currency')
    if error is not None:
        return None, error
    if account not in {row['id'] for row in rows}:
        return None, Response({'code': 'meta_scope_unverified' if partial else 'permission_denied'},
                              status=503 if partial else 403)
    return account, None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_ad_accounts(request):
    token, workspace_id, error = _picker_context(request)
    if error is not None:
        return error
    rows, partial, error = _collection(token, '/me/adaccounts', 'id,name,account_status,currency')
    if error is not None:
        return error
    return Response({'connected': True, 'workspace_id': workspace_id,
                     'accounts': rows, 'partial': partial})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_ad_campaigns(request):
    token, workspace_id, error = _picker_context(request)
    if error is not None:
        return error
    account, error = _account_scope(request, token)
    if error is not None:
        return error
    rows, partial, error = _collection(token, f'/{account}/campaigns',
                                      'id,name,objective,status,effective_status,account_id')
    if error is not None:
        return error
    if any(str(row.get('account_id')) != account[4:] for row in rows):
        return Response({'code': 'invalid_meta_scope'}, status=502)
    return Response({'connected': True, 'workspace_id': workspace_id,
                     'ad_account_id': account, 'campaigns': rows, 'partial': partial})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_ads(request):
    token, workspace_id, error = _picker_context(request)
    if error is not None:
        return error
    account, error = _account_scope(request, token)
    if error is not None:
        return error
    campaign = request.query_params.get('campaign_id', '')
    if not re.fullmatch(r'[0-9]+', campaign):
        return Response({'code': 'campaign_required'}, status=400)
    ok, body = _graph('GET', f'/{campaign}', token=token, params={'fields': 'id,account_id'})
    if not ok:
        return _provider_failure(body)
    if body.get('id') != campaign or str(body.get('account_id')) != account[4:]:
        return Response({'code': 'permission_denied'}, status=403)
    rows, partial, error = _collection(token, f'/{campaign}/ads',
        'id,name,status,effective_status,campaign_id,creative{call_to_action_type,object_story_spec}')
    if error is not None:
        return error
    if any(row.get('campaign_id') != campaign for row in rows):
        return Response({'code': 'invalid_meta_scope'}, status=502)
    for row in rows:
        creative = row.pop('creative', None)
        if creative is not None and not isinstance(creative, dict):
            return Response({'code': 'invalid_meta_response'}, status=502)
        story = (creative or {}).get('object_story_spec') or {}
        if not isinstance(story, dict):
            return Response({'code': 'invalid_meta_response'}, status=502)
        row['is_ctwa'] = ((creative or {}).get('call_to_action_type') == 'WHATSAPP_MESSAGE'
                          or 'whatsapp' in (story.get('link_data') or {})
                          or any('whatsapp' in str(value).lower() for value in story.values()))
    return Response({'connected': True, 'workspace_id': workspace_id,
                     'ad_account_id': account, 'campaign_id': campaign,
                     'ads': rows, 'partial': partial})


# ─────────────────────────────────────────────────────────────────────────────
# Spend sync (used by CTWACampaignViewSet.sync_meta + Stage-13 Celery beat)
# ─────────────────────────────────────────────────────────────────────────────
def sync_campaign_spend(campaign: CTWACampaign) -> dict:
    """Pull yesterday's insights from Meta and update `total_spent`. Used by
    the CTWACampaign sync-meta endpoint and's daily beat task."""
    cred = (
        PlatformCredential.objects.filter(
            client=campaign.client, platform='facebook', is_active=True,
        ).first()
    )
    if not cred or not cred.access_token:
        return {'ok': False, 'error': 'meta ads not connected'}

    ad_account_id = campaign.ad_account_id
    if not ad_account_id.startswith('act_'):
        ad_account_id = f'act_{ad_account_id}'

    ok, body = _graph('GET', f'/{campaign.campaign_id}/insights', token=cred.access_token, params={
        'fields': 'spend,clicks,impressions,reach,ctr,cpc,cpp,actions',
        'date_preset': 'last_30d',
        'level': 'campaign',
    })
    if not ok:
        return {'ok': False, 'error': body.get('error') or 'graph error'}

    rows = body.get('data') or []
    total_spent = sum(float(r.get('spend') or 0) for r in rows)
    total_clicks = sum(int(r.get('clicks') or 0) for r in rows)

    campaign.total_spent = total_spent
    campaign.total_clicks = total_clicks
    campaign.last_synced_at = timezone.now()
    campaign.save(update_fields=['total_spent', 'total_clicks', 'last_synced_at'])

    return {
        'ok': True,
        'total_spent': total_spent,
        'total_clicks': total_clicks,
        'cpl': (total_spent / campaign.total_leads) if campaign.total_leads else None,
        'last_synced_at': campaign.last_synced_at.isoformat(),
    }


def fetch_per_ad_insights(campaign: CTWACampaign) -> dict:
    """break campaign performance down per ad. Returns
    `{'ok': bool, 'ads': [{ad_id, ad_name, spend, clicks, ctr, cpc, impressions}, ...]}`.

    The UI calls this lazily when the campaign detail page expands the
    per-ad section, so we don't block the main /analytics call.
    """
    cred = (
        PlatformCredential.objects.filter(
            client=campaign.client, platform='facebook', is_active=True,
        ).first()
    )
    if not cred or not cred.access_token:
        return {'ok': False, 'error': 'meta ads not connected'}

    ok, body = _graph('GET', f'/{campaign.campaign_id}/insights',
                      token=cred.access_token, params={
        'fields': 'ad_id,ad_name,spend,clicks,impressions,ctr,cpc',
        'date_preset': 'last_30d',
        'level': 'ad',
        'limit': 100,
    })
    if not ok:
        return {'ok': False, 'error': body.get('error') or 'graph error'}

    rows = body.get('data') or []
    ads = []
    for r in rows:
        ads.append({
            'ad_id':       r.get('ad_id'),
            'ad_name':     r.get('ad_name') or '—',
            'spend':       float(r.get('spend') or 0),
            'clicks':      int(r.get('clicks') or 0),
            'impressions': int(r.get('impressions') or 0),
            'ctr':         float(r.get('ctr') or 0),
            'cpc':         float(r.get('cpc') or 0),
        })
    # Sort by spend desc — surface the heaviest spenders first.
    ads.sort(key=lambda a: a['spend'], reverse=True)
    return {'ok': True, 'ads': ads}
