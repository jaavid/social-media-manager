# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""
End-user (B2C) auth + workspace endpoints.

End-users are individuals who self-signup directly (real-estate agents,
clinic owners, restaurant operators, creators) and own their own workspace.
Distinct from agency staff (who manage other people's workspaces).

Endpoints:
    POST /api/end-user/signup       — compatibility alias for verified signup
    GET  /api/end-user/me           — current end-user + workspace summary
    PUT  /api/end-user/profile      — update first/last name + avatar
    GET  /api/end-user/workspace    — fetch the owned workspace
    PUT  /api/end-user/workspace    — update workspace profile

Signup is a compatibility alias of the verified account signup endpoint.
Organization and workspace creation happen explicitly after verification.
"""
from __future__ import annotations

from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from social_stats.activity_logger import log_activity
from social_stats.models import Client
from social_stats.views.auth import signup as end_user_signup  # noqa: F401




# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────
def _workspace_for(user) -> Client | None:
    """Return the workspace this end-user owns. Prefer profile.default_workspace,
    fall back to Client.owner_user lookup."""
    profile = getattr(user, 'profile', None)
    if profile and profile.default_workspace_id:
        from social_stats.authorization import accessible_workspaces
        return accessible_workspaces(user).filter(pk=profile.default_workspace_id).first()
    return Client.objects.filter(owner_user=user).order_by('id').first()


def _serialize_workspace(client: Client) -> dict:
    return {
        'id':              client.id,
        'name':            client.name,
        'company':         client.company,
        'display_name':    client.display_name,
        'industry':        client.industry,
        'location_city':   client.location_city,
        'location_country': client.location_country,
        'subscription_plan': client.subscription_plan,
        'ownership_type':  client.ownership_type,
        'created_via':     client.created_via,
        'is_discoverable_in_marketplace': client.is_discoverable_in_marketplace,
        'onboarding_complete': client.onboarding_complete,
        'whatsapp_enabled':    client.whatsapp_enabled,
        'timezone':            client.timezone,
        'created_at':          client.created_at.isoformat() if client.created_at else None,
    }


def _serialize_user(user: User) -> dict:
    profile = getattr(user, 'profile', None)
    return {
        'id':         user.id,
        'email':      user.email,
        'first_name': user.first_name,
        'last_name':  user.last_name,
        'full_name':  user.get_full_name(),
        'account_type': profile.account_type if profile else None,
        'role':         profile.role if profile else None,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Signup
# ─────────────────────────────────────────────────────────────────────────────
# Both API URLs use the same verified signup flow.


# ─────────────────────────────────────────────────────────────────────────────
# Me / Profile / Workspace
# ─────────────────────────────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def end_user_me(request):
    """Summary of the end-user + their workspace + active relations count."""
    user = request.user
    workspace = _workspace_for(user)
    payload = {
        'user':      _serialize_user(user),
        'workspace': _serialize_workspace(workspace) if workspace else None,
    }
    if workspace:
        from social_stats.models import AgencyClientRelation
        payload['relations'] = {
            'active':  AgencyClientRelation.objects.filter(client=workspace, status='active').count(),
            'pending': AgencyClientRelation.objects.filter(client=workspace, status='pending').count(),
        }
    return Response(payload)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def end_user_update_profile(request):
    """PUT {first_name?, last_name?} — update the user's name."""
    user = request.user
    data = request.data or {}
    fields_changed = []
    for key in ('first_name', 'last_name'):
        if key in data:
            setattr(user, key, (data.get(key) or '').strip())
            fields_changed.append(key)
    if fields_changed:
        user.save(update_fields=fields_changed)
    return Response(_serialize_user(user))


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def end_user_workspace(request):
    """GET or PUT the end-user's owned workspace."""
    workspace = _workspace_for(request.user)
    if not workspace:
        return Response({'error': 'no workspace owned by this user'}, status=404)

    if request.method == 'GET':
        return Response(_serialize_workspace(workspace))

    from social_stats.tenancy import require_organization_owner
    if workspace.owner_user_id != request.user.pk:
        require_organization_owner(request.user, workspace.organization)

    # PUT — update editable fields only
    data = request.data or {}
    EDITABLE = (
        'name', 'company', 'phone', 'whatsapp_number', 'website',
        'display_name', 'industry', 'location_city', 'location_country',
        'is_discoverable_in_marketplace', 'timezone',
    )
    changed = []
    for f in EDITABLE:
        if f in data:
            setattr(workspace, f, data.get(f))
            changed.append(f)
    if changed:
        workspace.save(update_fields=changed)
        log_activity(
            workspace, actor_user=request.user, actor_type='end_user',
            action_type='workspace_updated',
            description=f'Workspace fields updated: {", ".join(changed)}',
            severity='info',
            metadata={'fields': changed},
        )
    return Response(_serialize_workspace(workspace))
