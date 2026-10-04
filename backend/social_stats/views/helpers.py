# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
from datetime import date, timedelta


from social_stats.models import Client, PlatformCredential



def _select_metric_attribution(queryset, attribution=None):
    """Keep unknown ownership separate from attributed account metrics."""
    if attribution == 'unassigned':
        return queryset.filter(social_account_id__isnull=True)
    if queryset.filter(social_account_id__isnull=False).exists():
        return queryset.filter(social_account_id__isnull=False)
    return queryset


def parse_dates(request):
    today = date.today()
    since = request.query_params.get('since', (today - timedelta(days=30)).isoformat())
    until = request.query_params.get('until', today.isoformat())
    try:
        return date.fromisoformat(since), date.fromisoformat(until)
    except ValueError:
        return today - timedelta(days=30), today


def check_client_access(request, client_id):
    """Returns True if user is allowed to access this client's data."""
    from social_stats.authorization import accessible_workspaces
    try:
        return accessible_workspaces(request.user).filter(pk=int(client_id)).exists()
    except (TypeError, ValueError):
        return False


def _silent_token_refresh(client_id):
    """Silently refresh any expired OAuth tokens for a client. Fire-and-forget."""
    try:
        from social_stats.views.oauth import _refresh_google_token, _refresh_facebook_token
        creds = PlatformCredential.objects.filter(client_id=client_id, is_active=True)
        for cred in creds:
            if cred.is_expired and cred.refresh_token:
                if cred.platform in ('youtube', 'google_my_business'):
                    _refresh_google_token(cred)
                elif cred.platform in ('facebook', 'instagram'):
                    _refresh_facebook_token(cred)
    except Exception:
        pass  # Never block the /me response


def _agency_client_ids(request):
    """Return list of client IDs this user is allowed to see."""
    from django.db.models import Q
    try:
        profile = request.user.profile
        role    = profile.role
    except Exception:
        return []
    if role == 'staff':
        return list(profile.assigned_clients.values_list('id', flat=True))
    if role == 'superadmin':
        return list(
            Client.objects.filter(
                Q(userprofile__isnull=True) |
                Q(userprofile__is_self_registered=False) |
                Q(userprofile__agency=request.user)
            ).distinct().values_list('id', flat=True)
        )
    if role == 'client' and profile.client_id:
        return [profile.client_id]
    return []

