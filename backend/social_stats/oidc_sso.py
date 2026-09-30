"""Generic OpenID Connect SSO for trusted organization identity providers.

Designed for Authentik first, but compatible with providers exposing standard
OIDC discovery, authorization, token and userinfo endpoints (for example
Keycloak and Microsoft Entra ID).

The first version intentionally links only to an existing local user by email.
Roles and application permissions therefore remain owned by Social Stats rather
than being implicitly created from IdP claims.
"""

import base64
import hashlib
import hmac
import os
import secrets
import urllib.parse
from urllib.parse import urlparse

import requests as http_requests
from django.conf import settings
from django.contrib.auth.models import User
from django.shortcuts import redirect
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .social_auth_views import _finish_social_login


_SESSION_STATE = 'oidc_sso_state'
_SESSION_VERIFIER = 'oidc_sso_code_verifier'


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {'1', 'true', 'yes', 'on'}


def _config() -> dict:
    issuer = os.environ.get('SSO_OIDC_ISSUER', '').strip().rstrip('/')
    client_id = os.environ.get('SSO_OIDC_CLIENT_ID', '').strip()
    redirect_uri = os.environ.get(
        'SSO_OIDC_REDIRECT_URI',
        'http://localhost:8000/api/auth/sso/callback/',
    ).strip()
    scopes = os.environ.get('SSO_OIDC_SCOPES', 'openid email profile').strip()
    allowed_domains = {
        item.strip().lower()
        for item in os.environ.get('SSO_OIDC_ALLOWED_DOMAINS', '').split(',')
        if item.strip()
    }
    return {
        'enabled': bool(issuer and client_id),
        'issuer': issuer,
        'client_id': client_id,
        'client_secret': os.environ.get('SSO_OIDC_CLIENT_SECRET', '').strip(),
        'redirect_uri': redirect_uri,
        'scopes': scopes or 'openid email profile',
        'label': os.environ.get('SSO_OIDC_LABEL', 'Organization SSO').strip() or 'Organization SSO',
        'allowed_domains': allowed_domains,
        'allow_insecure': _env_bool('SSO_OIDC_ALLOW_INSECURE', False),
    }


def _frontend_error(message: str):
    frontend = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')
    return redirect(f'{frontend}/login?error={urllib.parse.quote(message)}')


def _url_allowed(url: str, allow_insecure: bool) -> bool:
    parsed = urlparse(url)
    if parsed.scheme == 'https' and parsed.netloc:
        return True
    if allow_insecure and parsed.scheme == 'http' and parsed.netloc:
        return True
    if settings.DEBUG and parsed.scheme == 'http' and parsed.hostname in {'localhost', '127.0.0.1'}:
        return True
    return False


def _discovery(config: dict) -> dict:
    discovery_url = f"{config['issuer']}/.well-known/openid-configuration"
    if not _url_allowed(discovery_url, config['allow_insecure']):
        raise ValueError('OIDC issuer must use HTTPS.')

    response = http_requests.get(discovery_url, timeout=8)
    response.raise_for_status()
    document = response.json()

    discovered_issuer = str(document.get('issuer', '')).rstrip('/')
    if discovered_issuer and discovered_issuer != config['issuer']:
        raise ValueError('OIDC discovery issuer does not match configured issuer.')

    for key in ('authorization_endpoint', 'token_endpoint', 'userinfo_endpoint'):
        endpoint = document.get(key, '')
        if not endpoint or not _url_allowed(endpoint, config['allow_insecure']):
            raise ValueError(f'OIDC discovery returned an invalid {key}.')
    return document


def _pkce_pair() -> tuple[str, str]:
    verifier = secrets.token_urlsafe(64)
    digest = hashlib.sha256(verifier.encode('ascii')).digest()
    challenge = base64.urlsafe_b64encode(digest).rstrip(b'=').decode('ascii')
    return verifier, challenge


def _resolve_existing_user(email: str, allowed_domains: set[str]):
    normalized = email.strip().lower()
    if not normalized or '@' not in normalized:
        return None, 'Your SSO provider did not return a valid email address.'

    domain = normalized.rsplit('@', 1)[1]
    if allowed_domains and domain not in allowed_domains:
        return None, 'This email domain is not allowed to use organization SSO.'

    users = list(User.objects.filter(email__iexact=normalized)[:2])
    if not users:
        return None, 'No local account exists for this SSO identity. Ask an administrator to create your account first.'
    if len(users) > 1:
        return None, 'Multiple local accounts use this email address. Ask an administrator to resolve the duplicate.'

    user = users[0]
    if not user.is_active:
        return None, 'This account is disabled.'
    return user, ''


@api_view(['GET'])
@permission_classes([AllowAny])
def oidc_sso_config(request):
    """Expose only non-secret SSO capability metadata for the login screen."""
    config = _config()
    return Response({
        'enabled': config['enabled'],
        'label': config['label'],
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def oidc_sso_start(request):
    """Begin Authorization Code + PKCE against the configured OIDC provider."""
    config = _config()
    if not config['enabled']:
        return _frontend_error('Organization SSO is not configured.')

    try:
        discovery = _discovery(config)
    except (ValueError, http_requests.RequestException, ValueError):
        return _frontend_error('Organization SSO is temporarily unavailable.')

    state = secrets.token_urlsafe(32)
    verifier, challenge = _pkce_pair()
    request.session[_SESSION_STATE] = state
    request.session[_SESSION_VERIFIER] = verifier

    params = {
        'client_id': config['client_id'],
        'redirect_uri': config['redirect_uri'],
        'response_type': 'code',
        'scope': config['scopes'],
        'state': state,
        'code_challenge': challenge,
        'code_challenge_method': 'S256',
    }
    return redirect(discovery['authorization_endpoint'] + '?' + urllib.parse.urlencode(params))


@api_view(['GET'])
@permission_classes([AllowAny])
def oidc_sso_callback(request):
    """Exchange the authorization code, resolve an existing user, and issue app JWTs."""
    config = _config()
    if not config['enabled']:
        return _frontend_error('Organization SSO is not configured.')

    provider_error = request.query_params.get('error')
    code = request.query_params.get('code', '')
    returned_state = request.query_params.get('state', '')
    expected_state = request.session.pop(_SESSION_STATE, '') or ''
    verifier = request.session.pop(_SESSION_VERIFIER, '') or ''

    if provider_error:
        return _frontend_error('Organization SSO sign-in was cancelled or rejected.')
    if not code or not verifier or not expected_state or not hmac.compare_digest(returned_state, expected_state):
        return _frontend_error('SSO sign-in session expired or was invalid. Please try again.')

    try:
        discovery = _discovery(config)
        token_payload = {
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': config['redirect_uri'],
            'client_id': config['client_id'],
            'code_verifier': verifier,
        }
        if config['client_secret']:
            token_payload['client_secret'] = config['client_secret']

        token_response = http_requests.post(
            discovery['token_endpoint'],
            data=token_payload,
            timeout=8,
        )
        token_response.raise_for_status()
        access_token = token_response.json().get('access_token', '')
        if not access_token:
            return _frontend_error('The SSO provider did not return an access token.')

        userinfo_response = http_requests.get(
            discovery['userinfo_endpoint'],
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=8,
        )
        userinfo_response.raise_for_status()
        userinfo = userinfo_response.json()
    except (ValueError, http_requests.RequestException):
        return _frontend_error('Organization SSO sign-in failed. Please try again.')

    if not userinfo.get('sub'):
        return _frontend_error('The SSO provider did not return a subject identifier.')
    if userinfo.get('email_verified') is False:
        return _frontend_error('Your SSO email address is not verified.')

    user, error = _resolve_existing_user(
        str(userinfo.get('email', '')),
        config['allowed_domains'],
    )
    if error:
        return _frontend_error(error)

    return _finish_social_login(request, user)
