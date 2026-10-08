# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""
OAuth 2.0 handlers for all 5 platforms:
  Facebook, Instagram, YouTube, Google My Business, LinkedIn
"""
import secrets
import requests
import logging
import time
from urllib.parse import urlencode
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.shortcuts import redirect, render
from django.views.decorators.csrf import csrf_protect
from django.utils import timezone
from django.db.models.functions import Coalesce

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from social_stats.models import SocialAccount, PlatformCredential, Client, SyncLog
from social_stats.marketplace_permissions import (
    resolve_acting_context, check_action, deny_response, approval_pending_response,
)
from social_stats.activity_logger import log_activity_for_request
from social_stats.oauth_destinations import choose_destination, destination_boundary, provider_object, provider_rows, FIELDS

logger = logging.getLogger(__name__)

# ── Consumer app (public_profile + email only) ────────────────────────────────
# App ID is public (appears in OAuth URLs). Secret comes from env.
# Both default to the production values; override in env for self-hosted forks.
FACEBOOK_CONSUMER_APP_ID = getattr(
    settings, 'FACEBOOK_CONSUMER_APP_ID', '2880231975675480'
)
FACEBOOK_CONSUMER_REDIRECT = getattr(
    settings, 'FACEBOOK_CONSUMER_REDIRECT_URI',
    'http://localhost:8000/api/oauth/facebook/consumer/callback/',
)

def _facebook_consumer_secret():
    return getattr(settings, 'FACEBOOK_SOCIAL_APP_SECRET', '') or settings.META_APP_SECRET


def _oauth_connection_enabled(platform):
    from social_stats.platforms.registry import get_provider
    keys = ('youtube', 'google_my_business') if platform == 'all' else (platform,)
    return all(get_provider(key).manifest.capability('connection').enabled and
               get_provider(key).manifest.status not in {'blocked', 'deprecated'} for key in keys)


def _authorize_oauth_start(request, client_id, platform):
    from .connections import workspace_for, account_for, permitted
    workspace, error = workspace_for(request, client_id)
    if error is not None:
        return error
    if platform not in {'facebook', 'instagram', 'youtube', 'google_my_business', 'linkedin', 'all'}:
        return Response({'code': 'unsupported'}, status=400)
    if not _oauth_connection_enabled(platform):
        return Response({'code': 'unsupported'}, status=400)
    account_id = request.GET.get('account_id')
    account = account_for(workspace, platform, account_id)
    if account_id and account is None:
        return Response({'code': 'scope_denied'}, status=403)
    if not permitted(request.user, workspace, 'connect_platforms', account):
        return Response({'code': 'permission_denied'}, status=403)
    continuation = request.session.pop('oauth_destination_continue', None)
    destinations = {}
    if request.GET.get('selection_continue') == '1':
        if (not continuation or continuation.get('user_id') != request.user.pk
                or continuation.get('workspace_id') != workspace.pk
                or continuation.get('platform') != platform
                or continuation.get('expires_at', 0) <= time.time()):
            return Response({'code': 'invalid_request'}, status=400)
        destinations = continuation['destinations']
    request.session.pop('oauth_destination_selection', None)
    request.session['oauth_connection'] = {
        'workspace_id': workspace.pk, 'platform': platform,
        'account_id': account.pk if account else None, 'matched': False,
        'user_id': request.user.pk, 'destinations': destinations,
    }


def _oauth_reconnect_account(request):
    context = request.session.get('oauth_connection', {})
    account_id = context.get('account_id')
    if not account_id:
        return None
    return SocialAccount.objects.filter(pk=account_id, client_id=context.get('workspace_id')).first()


def _oauth_callback_authorized(request):
    from .connections import workspace_for, account_for, permitted
    context = request.session.get('oauth_connection')
    if (not context or context.get('user_id', request.user.pk) != request.user.pk
            or not _oauth_connection_enabled(context['platform'])):
        return False
    workspace, error = workspace_for(request, context['workspace_id'])
    if error is not None:
        return False
    account = account_for(workspace, context['platform'], context['account_id'])
    if context['account_id'] and account is None:
        return False
    return permitted(request.user, workspace, 'connect_platforms', account)


def _oauth_state_valid(request) -> bool:
    """OAuth CSRF guard: the callback's `state` must equal the one-time value
    stored in this browser's session at /start. Pops the stored value so a
    state can't be replayed."""
    import hmac as _hmac
    returned = request.GET.get('state', '') or ''
    expected = request.session.pop('oauth_state', '') or ''
    return bool(expected) and _hmac.compare_digest(returned, expected) and _oauth_callback_authorized(request)


def _save_credential(client_id, platform, defaults, *, request=None):
    """Upsert a provider identity without overwriting another account's tokens."""
    external_id = str(
        defaults.get('instagram_account_id') or defaults.get('channel_id')
        or defaults.get('organization_id') or defaults.get('gmb_location_id')
        or defaults.get('page_id') or defaults.get('platform_user_id') or ''
    )
    # Some providers may not return an ID for a restricted account. Keep those
    # reconnectable while ensuring that a later, identified account is distinct.
    if not external_id:
        external_id = f'unidentified-{platform}'
    if request is not None:
        context = request.session.get('oauth_connection', {})
        source = context.get('platform')
        allowed = ({'facebook', 'instagram'} if source in {'facebook', 'instagram'} else
                   {'youtube', 'google_my_business'} if source == 'all' else {source})
        if (platform not in allowed or not _oauth_connection_enabled(platform)
                or not _oauth_callback_authorized(request) or str(context.get('workspace_id')) != str(client_id)):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Connection permission changed')
        if context.get('account_id'):
            target = SocialAccount.objects.get(pk=context['account_id'], client_id=client_id)
            if target.platform != platform or target.external_id != external_id:
                return  # Consent selected a different identity; never overwrite it.
        from .connections import permitted
        workspace = Client.objects.get(pk=client_id)
        existing = SocialAccount.objects.filter(client=workspace, platform=platform, external_id=external_id).first()
        if not permitted(request.user, workspace, 'connect_platforms', existing):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Account connection permission denied')
        context['matched'] = True
        request.session['oauth_connection'] = context
    display_name = (
        defaults.get('channel_name') or defaults.get('organization_name')
        or defaults.get('page_name') or external_id
    )
    account, _ = SocialAccount.objects.update_or_create(
        client_id=client_id, platform=platform, external_id=external_id,
        defaults={'display_name': display_name, 'is_active': True},
    )
    PlatformCredential.objects.update_or_create(
        social_account=account,
        defaults={
            **defaults, 'client_id': client_id, 'platform': platform, 'auth_failure_code': '',
            'is_active': True,
        },
    )


def _settings_redirect(client_id, query='', *, request=None):
    """
    Redirect through /oauth/callback so the frontend can route correctly
    based on the logged-in user's role (admin vs client).
    query is either '?connected=xxx' or '?error=xxx'.
    """
    if request is not None and (query.startswith('?connected=') or query.startswith('?error=')):
        request.session.pop('oauth_destination_selection', None)
        request.session.pop('oauth_destination_continue', None)
        context = request.session.pop('oauth_connection', {})
        if query.startswith('?connected=') and context.get('account_id') and not context.get('matched'):
            query = '?error=account_mismatch'
    sep = '&' if query else '?'
    return redirect(
        f"{settings.FRONTEND_URL}/oauth/callback{query}{sep}client_id={client_id}"
    )


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@csrf_protect
def oauth_destination_selection(request):
    """Choose only an offered identity; restart consent with fresh one-time state.

    CSRF protection is explicit even when an authentication adapter bypasses DRF's
    session-CSRF behavior. This endpoint stores no provider credential.
    """
    pending = request.session.get('oauth_destination_selection')
    context = request.session.get('oauth_connection', {})
    if (not isinstance(pending, dict) or not pending
            or pending.get('workspace_id') != context.get('workspace_id')
            or pending.get('platform') != context.get('platform') or pending.get('user_id') != request.user.pk
            or pending.get('expires_at', 0) <= time.time()
            or not _oauth_callback_authorized(request)):
        request.session.pop('oauth_destination_selection', None)
        request.session.pop('oauth_destination_continue', None)
        request.session.pop('oauth_connection', None)
        request.session.pop('oauth_state', None)
        return Response({'code': 'permission_denied'}, status=403)
    workspace = pending['workspace_id']
    if request.method == 'POST':
        if request.data.get('action') == 'cancel':
            return _settings_redirect(workspace, '?error=oauth_cancelled', request=request)
        nonce = request.data.get('nonce')
        chosen = request.data.get('destination')
        if (not isinstance(nonce, str) or not secrets.compare_digest(nonce, pending['nonce'])
                or not isinstance(chosen, str)
                or chosen not in {item['id'] for item in pending['choices']}):
            return Response({'code': 'invalid_request'}, status=400)
        destinations = {key: value for key, value in pending['destinations'].items() if key in FIELDS}
        destinations[pending['field']] = chosen
        request.session['oauth_destination_continue'] = {
            'user_id': request.user.pk, 'workspace_id': workspace,
            'platform': pending['platform'], 'destinations': destinations,
            'expires_at': pending['expires_at'],
        }
        request.session.pop('oauth_destination_selection', None)
        request.session.pop('oauth_state', None)
        flow = 'facebook' if pending['platform'] in {'facebook', 'instagram'} else 'google'
        return redirect(f'/api/oauth/{flow}/start/{workspace}/?' + urlencode({
            'platform': pending['platform'], 'selection_continue': '1',
        }))
    response = render(request, 'social_stats/oauth_destination_selection.html', {
        'pending': pending, 'persian': request.COOKIES.get('socialstats.language') == 'fa',
    })
    response['Cache-Control'] = 'private, no-store'
    response['Referrer-Policy'] = 'no-referrer'
    return response


# ══════════════════════════════════════════════════════════════════════
# FACEBOOK + INSTAGRAM
# ══════════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def facebook_oauth_start(request, client_id):
    platform = request.GET.get('platform', 'facebook')
    if platform not in {'facebook', 'instagram'}:
        return Response({'code': 'unsupported'}, status=400)
    error = _authorize_oauth_start(request, client_id, platform)
    if error is not None:
        return error
    """
    Use the Business app to request page + Instagram access.
    This is the platform-connect flow (not social login).
    Redirect goes to facebook_oauth_callback which fetches pages + IG.
    """
    state = f"{client_id}:{secrets.token_urlsafe(16)}"
    request.session['oauth_state']     = state
    request.session['oauth_client_id'] = str(client_id)

    logger.info("FB oauth start (business app): client_id=%s app_id=%s", client_id, settings.META_APP_ID)

    params = {
        'client_id':     settings.META_APP_ID,
        'redirect_uri':  settings.META_REDIRECT_URI,
        'scope':         'pages_show_list,pages_read_engagement,pages_manage_metadata,instagram_basic,instagram_content_publish,instagram_manage_insights,read_insights',
        'response_type': 'code',
        'state':          state,
    }
    return redirect(f"https://www.facebook.com/dialog/oauth?{urlencode(params)}")


@api_view(['GET'])
@permission_classes([AllowAny])
def facebook_consumer_callback(request):
    """
    Step 1 callback: exchange code for user identity, then redirect to Step 2 (Business app).
    """
    if not _oauth_state_valid(request):
        return Response({'code': 'permission_denied'}, status=403)

    code  = request.GET.get('code')
    state = request.GET.get('state', '')
    error = request.GET.get('error')

    if error or not code:
        client_id = state.split(':')[0] if state else '0'
        return _settings_redirect(client_id, '?error=facebook_denied', request=request)

    client_id = state.split(':')[0]

    logger.info(
        "FB consumer callback: client_id=%s app_id=%s redirect=%s",
        client_id, FACEBOOK_CONSUMER_APP_ID, FACEBOOK_CONSUMER_REDIRECT
    )

    # Exchange code for consumer token
    token_resp = requests.get(
        "https://graph.facebook.com/v21.0/oauth/access_token",
        params={
            'client_id':     FACEBOOK_CONSUMER_APP_ID,
            'client_secret': _facebook_consumer_secret(),
            'redirect_uri':  FACEBOOK_CONSUMER_REDIRECT,
            'code':          code,
        }, timeout=10
    ).json()

    if 'error' in token_resp:
        logger.error(
            "FB consumer token exchange failed: app_id=%s",
            FACEBOOK_CONSUMER_APP_ID
        )
        return _settings_redirect(client_id, '?error=facebook_consumer_token', request=request)

    consumer_token = token_resp.get('access_token', '')
    expires_in     = token_resp.get('expires_in', 5184000)
    expires_at     = timezone.now() + timedelta(seconds=expires_in)

    # Extend to long-lived token (60 days)
    long_resp = requests.get(
        'https://graph.facebook.com/v21.0/oauth/access_token',
        params={
            'grant_type':        'fb_exchange_token',
            'client_id':         FACEBOOK_CONSUMER_APP_ID,
            'client_secret':     _facebook_consumer_secret(),
            'fb_exchange_token': consumer_token,
        }, timeout=10
    ).json()
    long_token = long_resp.get('access_token', consumer_token)
    ll_expires_in = long_resp.get('expires_in', expires_in)
    expires_at = timezone.now() + timedelta(seconds=ll_expires_in)

    # Fetch pages this user manages
    pages_resp = requests.get(
        'https://graph.facebook.com/v21.0/me/accounts',
        params={'access_token': long_token, 'fields': 'id,name,access_token'},
        timeout=10
    ).json()
    pages = pages_resp.get('data', [])

    logger.info("FB consumer pages for client %s: %s", client_id, [p.get('name') for p in pages])

    if len(pages) > 1:
        return _settings_redirect(client_id, '?error=destination_selection_required', request=request)
    if pages:
        page       = pages[0]
        page_id    = page['id']
        page_name  = page.get('name', 'Facebook Page')
        page_token = page.get('access_token', long_token)

        _save_credential(client_id, 'facebook', {
            'access_token':  page_token,
            'refresh_token': long_token,
            'expires_at':    expires_at,
            'page_id':       page_id,
            'page_name':     page_name,
        }, request=request)

        # Try to get linked Instagram Business Account
        ig_resp = requests.get(
            f'https://graph.facebook.com/v21.0/{page_id}',
            params={'fields': 'instagram_business_account', 'access_token': page_token},
            timeout=10
        ).json()
        ig_id = provider_object(request, provider_object(request, ig_resp).get('instagram_business_account') or {}).get('id', '')
        if ig_id:
            ig_info = requests.get(
                f'https://graph.facebook.com/v21.0/{ig_id}',
                params={'fields': 'name,username', 'access_token': page_token},
                timeout=10
            ).json()
            _save_credential(client_id, 'instagram', {
                'access_token':         page_token,
                'refresh_token':        long_token,
                'expires_at':           expires_at,
                'page_id':              page_id,
                'page_name':            ig_info.get('username', page_name),
                'instagram_account_id': ig_id,
            }, request=request)
    else:
        # No pages found — save user identity token so UI shows connected
        me_resp = requests.get(
            'https://graph.facebook.com/v21.0/me',
            params={'fields': 'name', 'access_token': long_token},
            timeout=10
        ).json()
        _save_credential(client_id, 'facebook', {
            'access_token':  long_token,
            'refresh_token': long_token,
            'expires_at':    expires_at,
            'page_name':     me_resp.get('name', 'Facebook User'),
        }, request=request)
        logger.warning("FB: no pages found for client %s — saved user token only", client_id)

    # ── Step 2: Business app (uncomment after Meta App Review approval) ────────
    # biz_state = f"{client_id}:{secrets.token_urlsafe(16)}"
    # request.session['oauth_state']     = biz_state
    # request.session['oauth_client_id'] = str(client_id)
    # params = {
    #     'client_id':     settings.META_APP_ID,
    #     'redirect_uri':  settings.META_REDIRECT_URI,
    #     'scope':         ','.join([
    #         'pages_show_list',
    #         'pages_read_engagement',
    #         'pages_manage_metadata',
    #     ]),
    #     'response_type': 'code',
    #     'state':          biz_state,
    # }
    # return redirect(f"https://www.facebook.com/dialog/oauth?{urlencode(params)}")
    # ──────────────────────────────────────────────────────────────────────────

    # For now: consumer login complete, redirect back to settings
    return _settings_redirect(client_id, '?connected=facebook', request=request)


@api_view(['GET'])
@permission_classes([AllowAny])
@destination_boundary
def facebook_oauth_callback(request):
    """Exchange code for tokens, fetch page/IG IDs, save to DB."""
    code      = request.GET.get('code')
    state     = request.GET.get('state', '')
    error     = request.GET.get('error')
    client_id = state.split(':')[0] if ':' in state else state or '0'

    if error:
        return _settings_redirect(client_id, '?error=facebook_denied', request=request)

    if not _oauth_state_valid(request):
        logger.warning("FB business callback rejected — state mismatch")
        return _settings_redirect(client_id, '?error=oauth_state_mismatch', request=request)

    # Step 1: Short-lived token
    token_resp = requests.get(
        f"https://graph.facebook.com/{settings.META_API_VERSION}/oauth/access_token",
        params={
            'client_id':     settings.META_APP_ID,
            'client_secret': settings.META_APP_SECRET,
            'redirect_uri':  settings.META_REDIRECT_URI,
            'code':           code,
        }, timeout=10
    ).json()

    logger.info("FB business callback: client_id=%s token_resp_keys=%s", client_id, list(token_resp.keys()))

    if 'error' in token_resp:
        logger.error("FB business token exchange failed")
        return _settings_redirect(client_id, '?error=facebook_token', request=request)

    short_token = token_resp['access_token']

    # Step 2: Long-lived token (60 days)
    long_resp = requests.get(
        f"https://graph.facebook.com/{settings.META_API_VERSION}/oauth/access_token",
        params={
            'grant_type':        'fb_exchange_token',
            'client_id':          settings.META_APP_ID,
            'client_secret':      settings.META_APP_SECRET,
            'fb_exchange_token':  short_token,
        }, timeout=10
    ).json()

    long_token = long_resp.get('access_token', short_token)
    expires_in = long_resp.get('expires_in', 5184000)
    expires_at = timezone.now() + timedelta(seconds=expires_in)

    # Step 3: Get Pages the user manages
    pages_response = requests.get(
        f"https://graph.facebook.com/{settings.META_API_VERSION}/me/accounts",
        params={'access_token': long_token}, timeout=10
    ).json()
    pages = provider_rows(request, provider_object(request, pages_response).get('data', []))

    # Log granted permissions — helps diagnose if Meta stripped a scope
    # (e.g. instagram_manage_insights not yet approved by App Review).
    try:
        perms_resp = requests.get(
            f"https://graph.facebook.com/{settings.META_API_VERSION}/me/permissions",
            params={'access_token': long_token}, timeout=10
        ).json()
        granted = [p.get('permission') for p in perms_resp.get('data', []) if p.get('status') == 'granted']
        logger.info("FB granted permissions for client %s: %s", client_id, granted)
    except Exception:
        logger.warning("FB permissions probe failed for client %s", client_id)

    if not pages:
        logger.warning("FB callback: /me/accounts returned no pages for client %s", client_id)
        return _settings_redirect(client_id, '?error=facebook_no_pages', request=request)

    # Probe candidates without persisting a credential. A new multi-account
    # grant requires an explicit choice; reconnect requires its exact identity.
    candidates = []
    reconnect = _oauth_reconnect_account(request)
    source = request.session['oauth_connection']['platform']
    for page in pages:
        page_id = page.get('id')
        page_token = page.get('access_token', long_token)
        ig_resp = requests.get(
            f"https://graph.facebook.com/{settings.META_API_VERSION}/{page_id}",
            params={'fields': 'instagram_business_account', 'access_token': page_token}, timeout=10,
        ).json()
        ig_id = provider_object(request, provider_object(request, ig_resp).get('instagram_business_account') or {}).get('id', '')
        if source == 'instagram' and not ig_id:
            continue
        identity = ig_id if source == 'instagram' else page_id
        candidates.append((identity, page.get('name', ''), (page, ig_id)))
    chosen_page, chosen_ig_id = choose_destination(
        request, candidates, 'instagram_account' if source == 'instagram' else 'facebook_page',
        expected=reconnect.external_id if reconnect else None,
        secrets_to_scrub=(short_token, long_token, *(page.get('access_token', '') for page in pages)),
    )

    page_id    = chosen_page['id']
    page_name  = chosen_page.get('name', '')
    page_token = chosen_page.get('access_token', long_token)

    connected = []
    pending_credentials = []

    # Save Facebook credential for the chosen page
    pending_credentials.append(('facebook', {
        'access_token':  page_token,
        'refresh_token': long_token,
        'expires_at':    expires_at,
        'page_id':       page_id,
        'page_name':     page_name,
    }))
    connected.append('facebook')

    # Save Instagram credential if a linked IG Business Account was found
    if chosen_ig_id:
        ig_info = requests.get(
            f"https://graph.facebook.com/{settings.META_API_VERSION}/{chosen_ig_id}",
            params={'fields': 'name,username', 'access_token': page_token}, timeout=10
        ).json()

        pending_credentials.append(('instagram', {
            'access_token':          page_token,
            'refresh_token':         long_token,
            'expires_at':            expires_at,
            'page_id':               page_id,
            'page_name':             ig_info.get('username', page_name),
            'instagram_account_id':  chosen_ig_id,
        }))
        connected.append('instagram')
    else:
        logger.warning(
            "FB callback: no page with linked Instagram for client %s (checked %d pages)",
            client_id, len(pages)
        )

    with transaction.atomic():
        for destination_platform, defaults in pending_credentials:
            _save_credential(client_id, destination_platform, defaults, request=request)

    platforms = ','.join(connected)
    return _settings_redirect(client_id, f"?connected={platforms}", request=request)


# ══════════════════════════════════════════════════════════════════════
# GOOGLE (YouTube + Google My Business) — One OAuth flow, two APIs
# ══════════════════════════════════════════════════════════════════════

GOOGLE_SCOPES_YOUTUBE = ' '.join([
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
    'openid', 'email', 'profile',
])

GOOGLE_SCOPES_GMB = ' '.join([
    'https://www.googleapis.com/auth/business.manage',
    'openid', 'email', 'profile',
])

# Keep combined for backwards compatibility
GOOGLE_SCOPES = ' '.join([
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
    'https://www.googleapis.com/auth/business.manage',
    'openid', 'email', 'profile',
])

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def google_oauth_start(request, client_id):
    platform = request.GET.get('platform', 'all')
    if platform not in {'youtube', 'google_my_business', 'all'}:
        return Response({'code': 'unsupported'}, status=400)
    error = _authorize_oauth_start(request, client_id, platform)
    if error is not None:
        return error
    """Redirect to Google consent screen.
    Optional ?platform=youtube or ?platform=google_my_business for separate flows.
    """
    platform = request.GET.get('platform', 'all')  # youtube | google_my_business | all
    state = f"{client_id}:{platform}:{secrets.token_urlsafe(16)}"
    request.session['oauth_state'] = state

    if platform == 'youtube':
        scopes = GOOGLE_SCOPES_YOUTUBE
    elif platform == 'google_my_business':
        scopes = GOOGLE_SCOPES_GMB
    else:
        scopes = GOOGLE_SCOPES

    params = {
        'client_id':     settings.GOOGLE_CLIENT_ID,
        'redirect_uri':  settings.GOOGLE_REDIRECT_URI,
        'response_type': 'code',
        'scope':          scopes,
        'access_type':   'offline',
        'prompt':        'consent',
        'state':          state,
    }
    return redirect(f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}")


@api_view(['GET'])
@permission_classes([AllowAny])
@destination_boundary
def google_oauth_callback(request):
    """Exchange code for tokens, fetch YouTube channel + GMB location."""
    code      = request.GET.get('code')
    state     = request.GET.get('state', '')
    error     = request.GET.get('error')

    if error:
        return redirect(f"{settings.FRONTEND_URL}/settings?error=google_denied")

    parts = state.split(':')
    client_id = parts[0]
    platform  = parts[1] if len(parts) >= 3 else 'all'  # youtube | google_my_business | all

    if not _oauth_state_valid(request):
        logger.warning("Google callback rejected — state mismatch")
        return _settings_redirect(client_id, '?error=oauth_state_mismatch', request=request)

    # Exchange code for tokens
    token_resp = requests.post(
        'https://oauth2.googleapis.com/token',
        data={
            'code':          code,
            'client_id':     settings.GOOGLE_CLIENT_ID,
            'client_secret': settings.GOOGLE_CLIENT_SECRET,
            'redirect_uri':  settings.GOOGLE_REDIRECT_URI,
            'grant_type':    'authorization_code',
        }, timeout=10
    ).json()

    if 'error' in token_resp:
        logger.error("Google token exchange failed")
        return redirect(f"{settings.FRONTEND_URL}/settings?error=google_token")

    access_token  = token_resp['access_token']
    refresh_token = token_resp.get('refresh_token', '')
    expires_in    = token_resp.get('expires_in', 3600)
    expires_at    = timezone.now() + timedelta(seconds=expires_in)

    connected = []
    pending_credentials = []

    # ── YouTube ───────────────────────────────────────────
    if platform in ('youtube', 'all'):
        yt_resp = requests.get(
            'https://www.googleapis.com/youtube/v3/channels',
            params={
                'part':        'snippet,statistics',
                'mine':        'true',
                'access_token': access_token,
            }, timeout=10
        ).json()

        logger.info("YouTube channel lookup completed")

        yt_items = provider_rows(request, provider_object(request, yt_resp).get('items', []))
        context = request.session.get('oauth_connection', {})
        if not yt_items and (context.get('account_id') or context.get('destinations', {}).get('youtube_channel')):
            return _settings_redirect(client_id, '?error=account_mismatch', request=request)
        if yt_items:
            reconnect = _oauth_reconnect_account(request)
            channel = choose_destination(request, [(item.get('id'), provider_object(request, item.get('snippet', {})).get('title', ''), item) for item in yt_items],
                'youtube_channel', expected=reconnect.external_id if reconnect else None, secrets_to_scrub=(access_token, refresh_token))
            channel_id   = channel['id']
            channel_name = provider_object(request, channel.get('snippet', {})).get('title', '')

            pending_credentials.append(('youtube', {
                'access_token':  access_token,
                'refresh_token': refresh_token,
                'expires_at':    expires_at,
                'channel_id':    channel_id,
                'channel_name':  channel_name,
            }))
            connected.append('youtube')

    # ── Google My Business ────────────────────────────────
    if platform in ('google_my_business', 'all'):
        gmb_accounts_resp = requests.get(
            'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
            headers={'Authorization': f'Bearer {access_token}'}, timeout=10
        )
        gmb_accounts = gmb_accounts_resp.json()
        logger.info("GMB accounts status=%s", gmb_accounts_resp.status_code)

        accounts = provider_rows(request, provider_object(request, gmb_accounts).get('accounts', []))
        context = request.session.get('oauth_connection', {})
        if not accounts and (context.get('account_id') or context.get('destinations', {}).get('gmb_account')):
            return _settings_redirect(client_id, '?error=account_mismatch', request=request)
        if accounts:
            reconnect = _oauth_reconnect_account(request)
            previous = getattr(reconnect, 'credential', None) if reconnect else None
            selected_account = choose_destination(request, [(item.get('name'), item.get('accountName', ''), item) for item in accounts],
                'gmb_account', expected=previous.gmb_account_id if previous else None, secrets_to_scrub=(access_token, refresh_token))
            gmb_account_id = selected_account['name']

            gmb_locations_resp = requests.get(
                f'https://mybusinessbusinessinformation.googleapis.com/v1/{gmb_account_id}/locations',
                params={'readMask': 'name,title'},
                headers={'Authorization': f'Bearer {access_token}'}, timeout=10
            )
            gmb_locations = gmb_locations_resp.json()
            logger.info("GMB locations status=%s", gmb_locations_resp.status_code)

            locations = provider_rows(request, provider_object(request, gmb_locations).get('locations', []))
            if not locations and (context.get('account_id') or context.get('destinations', {}).get('gmb_location')):
                return _settings_redirect(client_id, '?error=account_mismatch', request=request)
            if locations:
                location = choose_destination(request, [(item.get('name'), item.get('title', ''), item) for item in locations],
                    'gmb_location', expected=reconnect.external_id if reconnect else None, secrets_to_scrub=(access_token, refresh_token))
                location_id = location['name']
                biz_name    = location.get('title', '')

                pending_credentials.append(('google_my_business', {
                    'access_token':    access_token,
                    'refresh_token':   refresh_token,
                    'expires_at':      expires_at,
                    'gmb_account_id':  gmb_account_id,
                    'gmb_location_id': location_id,
                    'page_name':       biz_name,
                }))
                connected.append('google_my_business')
            else:
                # No locations found — save token anyway so user shows as connected
                logger.warning("GMB: no locations found for account %s", gmb_account_id)
                pending_credentials.append(('google_my_business', {
                    'access_token':    access_token,
                    'refresh_token':   refresh_token,
                    'expires_at':      expires_at,
                    'gmb_account_id':  gmb_account_id,
                    'gmb_location_id': '',
                    'page_name':       selected_account.get('accountName', 'Google My Business'),
                }))
                connected.append('google_my_business')
        else:
            # No GMB account — still save the token with the Google profile name
            logger.warning("GMB: no accounts found")
            user_info = requests.get(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers={'Authorization': f'Bearer {access_token}'}, timeout=10
            ).json()
            pending_credentials.append(('google_my_business', {
                'access_token':    access_token,
                'refresh_token':   refresh_token,
                'expires_at':      expires_at,
                'gmb_account_id':  '',
                'gmb_location_id': '',
                'page_name':       user_info.get('name', 'Google My Business'),
            }))
            connected.append('google_my_business')

    with transaction.atomic():
        for destination_platform, defaults in pending_credentials:
            _save_credential(client_id, destination_platform, defaults, request=request)
    platforms = ','.join(connected)
    return _settings_redirect(client_id, f"?connected={platforms}", request=request)


# ══════════════════════════════════════════════════════════════════════
# LINKEDIN
# ══════════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def linkedin_oauth_start(request, client_id):
    error = _authorize_oauth_start(request, client_id, 'linkedin')
    if error is not None:
        return error
    """Redirect to LinkedIn consent screen."""
    state = f"{client_id}:{secrets.token_urlsafe(16)}"
    request.session['oauth_state'] = state

    params = {
        'response_type': 'code',
        'client_id':      settings.LINKEDIN_CLIENT_ID,
        'redirect_uri':   settings.LINKEDIN_REDIRECT_URI,
        'state':           state,
        # OpenID Connect scopes only — these don't require LinkedIn Community
        # Management API approval. Org-level analytics (organizationAcls /
        # organizationPageStatistics) require approval on a dedicated LinkedIn
        # app and will be added back once that approval is granted.
        'scope':          'openid profile email',
    }
    return redirect(f"https://www.linkedin.com/oauth/v2/authorization?{urlencode(params)}")


@api_view(['GET'])
@permission_classes([AllowAny])
def linkedin_oauth_callback(request):
    """Exchange code for LinkedIn token, fetch organization ID."""
    code      = request.GET.get('code')
    state     = request.GET.get('state', '')
    error     = request.GET.get('error')

    if error:
        return redirect(f"{settings.FRONTEND_URL}/settings?error=linkedin_denied")

    client_id = state.split(':')[0]

    if not _oauth_state_valid(request):
        logger.warning("LinkedIn callback rejected — state mismatch")
        return _settings_redirect(client_id, '?error=oauth_state_mismatch', request=request)

    # Exchange code for access token
    token_resp = requests.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        data={
            'grant_type':    'authorization_code',
            'code':           code,
            'redirect_uri':   settings.LINKEDIN_REDIRECT_URI,
            'client_id':      settings.LINKEDIN_CLIENT_ID,
            'client_secret':  settings.LINKEDIN_CLIENT_SECRET,
        },
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
        timeout=10
    ).json()

    if 'error' in token_resp:
        return redirect(f"{settings.FRONTEND_URL}/settings?error=linkedin_token")

    access_token  = token_resp['access_token']
    expires_in    = token_resp.get('expires_in', 5184000)
    refresh_token = token_resp.get('refresh_token', '')
    expires_at    = timezone.now() + timedelta(seconds=expires_in)

    # OpenID Connect userinfo — works with the basic OIDC scopes above and does
    # NOT require Community Management API approval.
    # NOTE: Org-level analytics (organizationAcls / organizationPageStatistics)
    # require Community Management API approval on a dedicated LinkedIn app.
    # Until that is granted, we only store the user's LinkedIn identity.
    userinfo_resp = requests.get(
        'https://api.linkedin.com/v2/userinfo',
        headers={'Authorization': f'Bearer {access_token}'},
        timeout=10
    ).json()

    user_sub  = str(userinfo_resp.get('sub', ''))
    user_name = userinfo_resp.get('name', '') or userinfo_resp.get('given_name', '')

    _save_credential(client_id, 'linkedin', {
        'access_token':      access_token,
        'refresh_token':     refresh_token,
        'expires_at':        expires_at,
        'organization_id':   user_sub,
        'organization_name': user_name,
    }, request=request)

    return _settings_redirect(client_id, "?connected=linkedin", request=request)


# ══════════════════════════════════════════════════════════════════════
# STATUS CHECK — used by React to show connected/disconnected
# ══════════════════════════════════════════════════════════════════════

def _refresh_google_token(cred):
    """Refresh an expired Google OAuth access token using the stored refresh_token."""
    try:
        resp = requests.post('https://oauth2.googleapis.com/token', data={
            'client_id':     settings.GOOGLE_CLIENT_ID,
            'client_secret': settings.GOOGLE_CLIENT_SECRET,
            'refresh_token': cred.refresh_token,
            'grant_type':    'refresh_token',
        }, timeout=10).json()
        if 'access_token' in resp:
            cred.access_token = resp['access_token']
            cred.expires_at   = timezone.now() + timedelta(seconds=resp.get('expires_in', 3600))
            cred.save(update_fields=['access_token', 'expires_at'])
    except Exception:
        logger.warning("Google token refresh failed for credential %s", cred.id)


def _refresh_facebook_token(cred):
    """Extend a Facebook long-lived token (valid for 60 more days)."""
    try:
        resp = requests.get('https://graph.facebook.com/v21.0/oauth/access_token', params={
            'grant_type':        'fb_exchange_token',
            'client_id':         settings.META_APP_ID,
            'client_secret':     settings.META_APP_SECRET,
            'fb_exchange_token': cred.refresh_token or cred.access_token,
        }, timeout=10).json()
        if 'access_token' in resp:
            expires_in = resp.get('expires_in', 5184000)
            cred.access_token = resp['access_token']
            cred.expires_at   = timezone.now() + timedelta(seconds=expires_in)
            cred.save(update_fields=['access_token', 'expires_at'])
    except Exception:
        logger.warning("Facebook token refresh failed for credential %s", cred.id)


@api_view(['GET'])
def oauth_status(request, client_id):
    """Return connection status for all platforms. Auto-refreshes expired Google tokens."""
    from social_stats.views.helpers import check_client_access
    if not check_client_access(request, client_id):
        return Response({'error': 'Access denied'}, status=403)
    credentials = PlatformCredential.objects.filter(client_id=client_id).select_related('social_account')
    result = {}
    for platform, label in [
        ('facebook', 'Facebook'),
        ('instagram', 'Instagram'),
        ('youtube', 'YouTube'),
        ('linkedin', 'LinkedIn'),
        ('google_my_business', 'Google My Business'),
    ]:
        platform_credentials = credentials.filter(platform=platform)
        cred = platform_credentials.filter(is_active=True).first() or platform_credentials.first()
        last_sync = SyncLog.objects.filter(
            client_id=client_id,
            platform=platform,
            status='success',
        ).annotate(
            effective_sync_at=Coalesce('finished_at', 'started_at')
        ).order_by('-effective_sync_at').first()
        last_successful_sync = (
            (last_sync.finished_at or last_sync.started_at).isoformat()
            if last_sync else None
        )
        if cred and cred.access_token:
            # Auto-refresh expired Google tokens silently
            if cred.is_expired and cred.refresh_token:
                if platform in ('youtube', 'google_my_business'):
                    _refresh_google_token(cred)
                elif platform in ('facebook', 'instagram'):
                    _refresh_facebook_token(cred)
            result[platform] = {
                'status':       cred.status,
                'connected_at': cred.connected_at.isoformat(),
                'expires_at':   cred.expires_at.isoformat() if cred.expires_at else None,
                'account_name': cred.page_name or cred.channel_name or cred.organization_name or '',
                'last_successful_sync': last_successful_sync,
                'accounts': [
                    {
                        'id': item.social_account_id,
                        'external_id': item.social_account.external_id,
                        'account_name': item.social_account.display_name,
                        'status': item.status,
                        'is_active': item.is_active,
                    }
                    for item in platform_credentials if item.social_account_id
                ],
            }
        else:
            result[platform] = {
                'status': 'not_connected',
                'last_successful_sync': last_successful_sync,
                'accounts': [],
            }

    return Response(result)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def oauth_disconnect(request, client_id, platform):
    """Disconnect a platform — delete stored tokens.

    Rule #9 of the marketplace spec: end-users can ALWAYS disconnect platforms,
    even on agency-managed workspaces. So owners and superadmins bypass the
    permission check; agency-side actors must hold disconnect_platforms.
    """
    try:
        client = Client.objects.get(pk=client_id)
    except Client.DoesNotExist:
        return Response({'error': 'workspace not found'}, status=404)

    role, relation = resolve_acting_context(request, client)
    if role == 'forbidden':
        return Response({'error': 'forbidden'}, status=403)
    verdict, ctx = check_action(
        request, client, 'disconnect_platforms', action_type='disconnect_platform',
        payload={'platform': platform, 'social_account_id': request.query_params.get('account_id')},
        target_object_type='PlatformCredential', preview=f'Disconnect {platform}',
    )
    if verdict == 'denied':
        return deny_response(ctx['reason'])
    if verdict == 'approval_required':
        return approval_pending_response(ctx['approval'])

    credentials = PlatformCredential.objects.filter(client_id=client_id, platform=platform)
    account_id = request.query_params.get('account_id')
    if account_id:
        credentials = credentials.filter(social_account_id=account_id)
    credentials.update(access_token='', refresh_token='', is_active=False, auth_failure_code='')
    SocialAccount.objects.filter(
        credential__client_id=client_id,
        credential__platform=platform,
        **({'id': account_id} if account_id else {}),
    ).update(is_active=False)

    log_activity_for_request(
        request, client,
        action_type='platform_disconnected',
        description=f'Disconnected {platform}',
        severity='warning',
        target_object_type='PlatformCredential',
        metadata={'platform': platform},
        is_reversible=False,
    )
    return Response({'message': f'{platform} disconnected'})


@api_view(['GET'])
def oauth_debug(request):
    """Debug endpoint — shows current OAuth config. Superadmin only."""
    try:
        role = request.user.profile.role
        if role not in ('superadmin', 'staff'):
            return Response({'error': 'forbidden'}, status=403)
    except Exception:
        return Response({'error': 'forbidden'}, status=403)

    secret = _facebook_consumer_secret()
    return Response({
        'facebook_consumer_app_id':        FACEBOOK_CONSUMER_APP_ID,
        'facebook_consumer_redirect':      FACEBOOK_CONSUMER_REDIRECT,
        'facebook_consumer_secret_set':    bool(secret),
        'meta_app_id':                     settings.META_APP_ID,
        'FACEBOOK_SOCIAL_APP_SECRET_env':  bool(getattr(settings, 'FACEBOOK_SOCIAL_APP_SECRET', '')),
    })
