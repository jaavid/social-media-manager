"""Tenant-scoped team grants, separate from platform and agency privileges."""
import hashlib
from django.db import transaction
from rest_framework.exceptions import PermissionDenied, ValidationError

from social_stats.models import Client, OrganizationMembership, RolePreset, WorkspaceMemberPolicy
from social_stats.tenancy import is_platform_admin

TEAM_PRESETS = ('social-media-manager', 'senior-editor', 'editor', 'analyst',
                'brand-manager', 'designer', 'workspace-admin')


def token_digest(token):
    return hashlib.sha256(str(token).encode('utf-8')).hexdigest()


def organization_role(user, organization):
    if not user or not user.is_authenticated or not user.is_active:
        return None
    if organization.owner_user_id == user.pk or is_platform_admin(user):
        return 'owner'
    return OrganizationMembership.objects.filter(
        organization=organization, user=user, is_active=True,
    ).values_list('role', flat=True).first()


def require_manager(user, organization):
    if organization_role(user, organization) not in ('owner', 'admin'):
        raise PermissionDenied('Only an organization owner or administrator can manage this team')


def validate_grants(organization, grants):
    if not isinstance(grants, list) or not grants or len(grants) > 100:
        raise ValidationError({'workspace_grants': 'Select at least one workspace and role'})
    normalized = []
    seen = set()
    available = set(RolePreset.objects.filter(key__in=TEAM_PRESETS).values_list('key', flat=True))
    workspaces = set(Client.objects.filter(organization=organization).values_list('pk', flat=True))
    for grant in grants:
        if (not isinstance(grant, dict) or type(grant.get('workspace_id')) is not int
                or grant['workspace_id'] not in workspaces or grant['workspace_id'] in seen
                or grant.get('preset') not in available):
            raise ValidationError({'workspace_grants': 'Invalid workspace or team role'})
        seen.add(grant['workspace_id'])
        normalized.append({'workspace_id': grant['workspace_id'], 'preset': grant['preset']})
    return normalized


def require_target_management(actor, organization, user, role):
    if user.pk == organization.owner_user_id:
        raise PermissionDenied('The organization owner cannot be changed through team management')
    old_role = organization_role(user, organization)
    if organization_role(actor, organization) != 'owner' and (old_role == 'admin' or role == 'admin'):
        raise PermissionDenied('Only the owner can appoint or change organization administrators')


@transaction.atomic
def assign_member(organization, user, role, grants, actor):
    # Caller holds the organization lock; quota enforcement also locks this row.
    OrganizationMembership.objects.update_or_create(
        organization=organization, user=user,
        defaults={'role': role, 'is_active': True},
    )
    workspace_ids = [g['workspace_id'] for g in grants]
    WorkspaceMemberPolicy.objects.filter(
        workspace__organization=organization, user=user,
    ).exclude(workspace_id__in=workspace_ids).update(is_active=False, updated_by=actor)
    for grant in grants:
        WorkspaceMemberPolicy.objects.update_or_create(
            workspace_id=grant['workspace_id'], user=user,
            defaults={'preset': RolePreset.objects.get(key=grant['preset']),
                      'permissions': {}, 'approval_overrides': {}, 'is_active': True,
                      'updated_by': actor},
        )
    profile = getattr(user, 'profile', None)
    if profile and (not profile.default_workspace_id or
                    not WorkspaceMemberPolicy.objects.filter(
                        workspace_id=profile.default_workspace_id, user=user, is_active=True,
                    ).exists()):
        profile.default_workspace_id = workspace_ids[0]
        profile.save(update_fields=['default_workspace'])
