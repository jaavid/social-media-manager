"""Workspace-owner team policy management, with strict tenant preflight."""

from django.contrib.auth.models import User
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from social_stats.models import (
    Client,
    RolePreset,
    WorkspaceMemberPolicy,
    SocialAccount,
    SocialAccountPermissionOverride,
    AGENCY_CLIENT_PERMISSIONS,
    ActionLog,
)
from social_stats.authorization import acting_context, evaluate, accessible_workspaces

ACTIONS = {**AGENCY_CLIENT_PERMISSIONS, "approve_posts": {"label": "Approve posts"}}


def _workspace(request, workspace_id):
    workspace = get_object_or_404(Client, pk=workspace_id)
    role, _ = acting_context(request.user, workspace)
    if role not in ("owner", "superadmin"):
        raise PermissionDenied("Only the workspace owner can manage team policy")
    return workspace


def _map(data, key):
    value = data.get(key, {})
    if not isinstance(value, dict) or any(
        k not in ACTIONS or type(v) is not bool for k, v in value.items()
    ):
        raise ValidationError({key: "Expected known action keys with boolean values"})
    return value


def _organization_preset(user, workspace):
    from social_stats.models import AgencyMembership

    _, relation = acting_context(user, workspace)
    if not relation:
        return None
    membership = AgencyMembership.objects.select_related("preset").get(
        user=user, agency=relation.agency, is_active=True
    )
    return membership.preset.key if membership.preset_id else None


def _snapshot(policy):
    return {
        "preset": policy.preset.key if getattr(policy, "preset_id", None) else None,
        "permissions": policy.permissions,
        "approval_overrides": policy.approval_overrides,
        "is_active": getattr(policy, "is_active", True),
        "note": getattr(policy, "note", ""),
    }


def _audit(request, workspace, policy, before):
    # Audit failure rolls back the change rather than silently losing history.
    ActionLog.objects.create(
        actor=request.user,
        client=workspace,
        action="rbac.policy_updated",
        object_type=policy.__class__.__name__,
        object_id=str(policy.pk),
        details={
            "before": before,
            "after": _snapshot(policy),
            "user_id": policy.user_id,
        },
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def presets(request):
    return Response(
        [
            {
                "key": p.key,
                "label": p.label,
                "permissions": p.permissions,
                "approval_defaults": p.approval_defaults,
            }
            for p in RolePreset.objects.order_by("pk")
        ]
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def team(request, workspace_id):
    workspace = _workspace(request, workspace_id)
    # Include compatibility members, even before an explicit policy is assigned.
    from django.db.models import Q
    from social_stats.models import AgencyClientRelation

    agency_ids = AgencyClientRelation.objects.filter(
        client=workspace, status="active"
    ).values_list("agency_id", flat=True)
    users = (
        User.objects.filter(is_active=True)
        .filter(
            Q(pk=workspace.owner_user_id)
            | Q(profile__client=workspace, profile__role="client")
            | Q(profile__client_assignments__client=workspace)
            | Q(profile__assigned_clients=workspace)
            | Q(workspacememberpolicy__workspace=workspace)
            | Q(
                agencymembership__agency_id__in=agency_ids,
                agencymembership__is_active=True,
            )
        )
        .distinct()
        .order_by("pk")
    )
    members = []
    for user in users:
        role, _ = acting_context(user, workspace)
        if role in ("forbidden", "superadmin"):
            continue
        policy = (
            WorkspaceMemberPolicy.objects.filter(workspace=workspace, user=user)
            .select_related("preset")
            .first()
        )
        members.append(
            {
                "user_id": user.pk,
                "name": user.get_full_name() or user.username,
                "role": role,
                "policy": _snapshot(policy) if policy else None,
                "effective": {
                    a: {
                        "allowed": (d := evaluate(user, workspace, a)).allowed,
                        "requires_approval": d.requires_approval,
                    }
                    for a in ACTIONS
                },
            }
        )
    return Response(
        {
            "workspace_id": workspace.pk,
            "members": members,
            "accounts": [
                {"id": a.pk, "label": str(a)} for a in workspace.social_accounts.all()
            ],
            "actions": {k: v["label"] for k, v in ACTIONS.items()},
        }
    )


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def member_policy(request, workspace_id, user_id):
    workspace = _workspace(request, workspace_id)
    user = get_object_or_404(User, pk=user_id, is_active=True)
    # This endpoint configures existing members; it cannot enroll arbitrary users.
    if not accessible_workspaces(user).filter(pk=workspace.pk).exists():
        raise PermissionDenied("User is not an active member of this workspace")
    policy = (
        WorkspaceMemberPolicy.objects.filter(workspace=workspace, user=user)
        .select_related("preset")
        .first()
    )
    if request.method == "GET":
        data = (
            _snapshot(policy)
            if policy
            else {"preset": None, "permissions": {}, "approval_overrides": {}}
        )
        data["organization_preset"] = _organization_preset(user, workspace)
        return Response(data)
    permission_map = _map(request.data, "permissions")
    approval_map = _map(request.data, "approval_overrides")
    preset = None
    if request.data.get("preset"):
        preset = get_object_or_404(RolePreset, key=request.data["preset"])
    with transaction.atomic():
        policy, _ = WorkspaceMemberPolicy.objects.select_for_update().get_or_create(
            workspace=workspace, user=user
        )
        before = _snapshot(policy)
        policy.preset = preset
        policy.permissions = permission_map
        policy.approval_overrides = approval_map
        policy.updated_by = request.user
        policy.save()
        _audit(request, workspace, policy, before)
    return Response(_snapshot(policy))


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def account_policy(request, workspace_id, account_id, user_id):
    workspace = _workspace(request, workspace_id)
    account = get_object_or_404(SocialAccount, pk=account_id, client=workspace)
    user = get_object_or_404(User, pk=user_id, is_active=True)
    if not accessible_workspaces(user).filter(pk=workspace.pk).exists():
        raise PermissionDenied("User is not an active member of this workspace")
    policy = SocialAccountPermissionOverride.objects.filter(
        account=account, user=user
    ).first()
    if request.method == "GET":
        return Response(
            {
                "permissions": policy.permissions if policy else {},
                "approval_overrides": policy.approval_overrides if policy else {},
                "note": policy.note if policy else "",
                "effective": {
                    a: {
                        "allowed": (
                            d := evaluate(user, workspace, a, account=account)
                        ).allowed,
                        "requires_approval": d.requires_approval,
                    }
                    for a in ACTIONS
                },
            }
        )
    permissions = _map(request.data, "permissions")
    approvals = _map(request.data, "approval_overrides")
    note = request.data.get("note", "")
    if not isinstance(note, str) or len(note) > 300:
        raise ValidationError({"note": "Expected at most 300 characters"})
    with transaction.atomic():
        policy, _ = (
            SocialAccountPermissionOverride.objects.select_for_update().get_or_create(
                account=account, user=user
            )
        )
        before = _snapshot(policy)
        policy.permissions = {} if request.method == "DELETE" else permissions
        policy.approval_overrides = {} if request.method == "DELETE" else approvals
        policy.note = note
        policy.updated_by = request.user
        policy.save()
        _audit(request, workspace, policy, before)
        if request.method == "DELETE":
            policy.delete()
    return Response({"status": "saved"})


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def organization_member_preset(request, agency_id, user_id):
    from social_stats.models import Agency, AgencyMembership
    from social_stats.marketplace_permissions import _is_superadmin

    agency = get_object_or_404(Agency, pk=agency_id)
    if agency.owner_user_id != request.user.pk and not _is_superadmin(request.user):
        raise PermissionDenied(
            "Only the organization owner can manage organization role defaults"
        )
    membership = get_object_or_404(
        AgencyMembership, agency=agency, user_id=user_id, is_active=True
    )
    if request.method == "PUT":
        preset = (
            get_object_or_404(RolePreset, key=request.data["preset"])
            if request.data.get("preset")
            else None
        )
        with transaction.atomic():
            membership = AgencyMembership.objects.select_for_update().get(
                pk=membership.pk
            )
            before = membership.preset.key if membership.preset_id else None
            membership.preset = preset
            membership.save(update_fields=["preset"])
            from social_stats.models import AgencyClientRelation

            for relation in AgencyClientRelation.objects.filter(
                agency=agency, status="active"
            ):
                ActionLog.objects.create(
                    actor=request.user,
                    client=relation.client,
                    action="rbac.organization_preset_updated",
                    object_type="AgencyMembership",
                    object_id=str(membership.pk),
                    details={
                        "before": before,
                        "after": preset.key if preset else None,
                        "agency_id": agency.pk,
                    },
                )
    return Response(
        {
            "agency_id": agency.pk,
            "user_id": membership.user_id,
            "preset": membership.preset.key if membership.preset_id else None,
        }
    )
