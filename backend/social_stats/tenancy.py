"""Resolve tenant context from authorized database rows, never caller claims."""

from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied, ValidationError

from social_stats.authorization import accessible_workspaces
from social_stats.models import Organization


def is_platform_admin(user):
    profile = getattr(user, "profile", None)
    return bool(
        user
        and user.is_authenticated
        and user.is_active
        and profile
        and profile.role == "superadmin"
    )


def accessible_organizations(user):
    if not user or not user.is_authenticated or not user.is_active:
        return Organization.objects.none()
    if is_platform_admin(user):
        return Organization.objects.all()
    return Organization.objects.filter(
        Q(owner_user=user) | Q(memberships__user=user, memberships__is_active=True)
    ).distinct()


def require_organization_owner(user, organization):
    if not user or not user.is_authenticated or not user.is_active:
        raise PermissionDenied()
    if organization.owner_user_id != user.pk and not is_platform_admin(user):
        raise PermissionDenied("Only the organization owner can manage this tenant")


def resolve_organization_context(user, workspace_id, *, organization_id=None):
    workspace = get_object_or_404(
        accessible_workspaces(user).select_related("organization"), pk=workspace_id
    )
    if organization_id is not None:
        try:
            claimed_id = int(organization_id)
        except (ValueError, TypeError):
            raise ValidationError({"organization_id": "Expected an integer"}) from None
        if claimed_id != workspace.organization_id:
            raise PermissionDenied("Organization does not match the workspace")
    return workspace.organization
