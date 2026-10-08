"""Token-free, short-lived destination choice before a fresh consent round trip."""
from functools import wraps
import secrets
import time

from django.shortcuts import redirect
from social_stats.platforms.base import public_provider_data

SELECTION_PATH = '/api/oauth/destination-selection/'
SELECTION_TTL = 300
FIELDS = {'facebook_page', 'instagram_account', 'youtube_channel', 'gmb_account', 'gmb_location'}


class DestinationResponse(Exception):
    def __init__(self, response):
        self.response = response


def destination_boundary(view):
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        try:
            return view(request, *args, **kwargs)
        except DestinationResponse as choice:
            return choice.response
    return wrapped


def choose_destination(request, choices, field, *, expected=None, secrets_to_scrub=()):
    """choices are (remote ID, display label, callback-local payload).

    Persist only whitelisted public IDs/labels, never callback payloads or tokens.
    Reconnect's expected identity overrides choices; absence always fails closed.
    """
    from social_stats.views.oauth import _settings_redirect
    context = request.session['oauth_connection']
    workspace = context['workspace_id']
    if (field not in FIELDS or not choices or len(choices) > 100
            or any(secret is not None and not isinstance(secret, str) for secret in secrets_to_scrub)):
        raise DestinationResponse(_settings_redirect(workspace, '?error=destination_unavailable', request=request))
    normalized = []
    for identity, name, payload in choices:
        if isinstance(identity, bool) or not isinstance(identity, (str, int)):
            raise DestinationResponse(_settings_redirect(workspace, '?error=destination_unavailable', request=request))
        identity = str(identity)
        if not identity or len(identity) > 256 or any(secret and secret in identity for secret in secrets_to_scrub):
            raise DestinationResponse(_settings_redirect(workspace, '?error=destination_unavailable', request=request))
        label = public_provider_data(str(name or identity), secrets_to_scrub)[:200]
        normalized.append((identity, label, payload))
    if len({item[0] for item in normalized}) != len(normalized):
        raise DestinationResponse(_settings_redirect(workspace, '?error=destination_unavailable', request=request))
    destinations = dict(context.get('destinations', {}))
    requested = str(expected) if expected else destinations.get(field)
    if requested:
        selected = next((item for item in normalized if item[0] == requested), None)
        if selected is None:
            raise DestinationResponse(_settings_redirect(workspace, '?error=account_mismatch', request=request))
    elif context.get('account_id'):
        raise DestinationResponse(_settings_redirect(workspace, '?error=account_mismatch', request=request))
    elif len(normalized) == 1:
        selected = normalized[0]
    else:
        request.session['oauth_destination_selection'] = {
            'user_id': request.user.pk, 'workspace_id': workspace,
            'platform': context['platform'], 'field': field,
            'choices': [{'id': item[0], 'name': item[1]} for item in normalized],
            'destinations': {key: value for key, value in destinations.items() if key in FIELDS},
            'expires_at': time.time() + SELECTION_TTL, 'nonce': secrets.token_urlsafe(24),
        }
        raise DestinationResponse(redirect(SELECTION_PATH))
    destinations[field] = selected[0]
    context['destinations'] = destinations
    request.session['oauth_connection'] = context
    return selected[2]


def provider_object(request, value):
    from social_stats.views.oauth import _settings_redirect
    if not isinstance(value, dict):
        raise DestinationResponse(_settings_redirect(request.session['oauth_connection']['workspace_id'], '?error=destination_unavailable', request=request))
    return value


def provider_rows(request, value):
    from social_stats.views.oauth import _settings_redirect
    if not isinstance(value, list) or len(value) > 100 or any(not isinstance(row, dict) for row in value):
        raise DestinationResponse(_settings_redirect(request.session['oauth_connection']['workspace_id'], '?error=destination_unavailable', request=request))
    return value
