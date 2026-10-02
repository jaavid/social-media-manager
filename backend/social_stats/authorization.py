"""Authoritative, read-only evaluation used by legacy and marketplace adapters.

No evaluator creates approvals or changes permissions. Explicit false wins;
agency relations and legacy staff assignments remain hard ceilings.
"""

from dataclasses import dataclass

# An alias is a semantic translation, never a fallback to an unrelated grant.
LEGACY_ACTIONS = {
    "view_analytics": "analytics.view",
    "view_posts": "composer.view",
    "view_inbox": "inbox.view",
    "view_audience": "audience.view",
    "export_data": "dashboard.export_pdf",
    "generate_reports": "reports.download_pdf",
    "draft_posts": "composer.create",
    "publish_posts": "composer.publish",
    "schedule_posts": "composer.publish",
    "delete_posts": "composer.delete",
    "edit_published": "composer.create",
    "reply_comments": "inbox.reply",
    "reply_messages": "inbox.reply",
    "reply_reviews": "reviews.reply",
    "manage_automation": "automations.create",
    "manage_brand_voice": "ai.brand_voice",
    "create_campaigns": "whatsapp.manage_campaigns",
    "send_campaigns": "whatsapp.send",
    "manage_contacts": "whatsapp.manage_contacts",
}


def legacy_permissions(profile):
    from .models import Permission, RolePermission, UserPermission

    if profile is None or not profile.user.is_active:
        return {}
    result = dict.fromkeys(Permission.objects.values_list("code", flat=True), False)
    if profile.role == "superadmin":
        return dict.fromkeys(result, True)
    result.update(
        RolePermission.objects.filter(role=profile.role).values_list(
            "permission__code", "is_granted"
        )
    )
    result.update(
        UserPermission.objects.filter(user_profile=profile).values_list(
            "permission__code", "is_granted"
        )
    )
    return result


def acting_context(user, workspace):
    from .models import (
        AgencyMembership,
        AgencyClientRelation,
        StaffClientAssignment,
        WorkspaceMemberPolicy,
    )

    if not user or not user.is_authenticated or not user.is_active:
        return "forbidden", None
    profile = getattr(user, "profile", None)
    if profile and profile.role == "superadmin":
        return "superadmin", None
    if workspace.owner_user_id == user.id or (
        profile and profile.role == "client" and profile.client_id == workspace.id
    ):
        return "owner", None
    # A revoked direct policy must not fall back to a legacy assignment.
    policy = WorkspaceMemberPolicy.objects.filter(
        user=user, workspace=workspace
    ).first()
    if policy and not policy.is_active:
        return "forbidden", None
    agency_ids = AgencyMembership.objects.filter(user=user, is_active=True).values_list(
        "agency_id", flat=True
    )
    relations = AgencyClientRelation.objects.filter(
        client=workspace, agency_id__in=agency_ids, status="active"
    )
    primary = getattr(profile, "primary_agency_id", None)
    relation = relations.filter(agency_id=primary).first() if primary else None
    relation = relation or relations.order_by("pk").first()
    if relation:
        return "agency", relation
    # Agency members cannot resurrect a paused/terminated relation via a policy.
    all_agencies = AgencyMembership.objects.filter(user=user).values_list(
        "agency_id", flat=True
    )
    if AgencyClientRelation.objects.filter(
        client=workspace, agency_id__in=all_agencies
    ).exists():
        return "forbidden", None
    if (
        profile
        and profile.role == "staff"
        and (
            StaffClientAssignment.objects.filter(
                staff_profile=profile, client=workspace
            ).exists()
            or profile.assigned_clients.filter(pk=workspace.pk).exists()
        )
    ):
        return "staff", None
    if policy and policy.is_active:
        return "member", None
    return "forbidden", None


@dataclass(frozen=True)
class Decision:
    allowed: bool
    requires_approval: bool = False
    role: str = "forbidden"
    relation: object = None
    reason: str = ""


def evaluate(user, workspace, action, *, account=None):
    from .models import (
        AGENCY_CLIENT_PERMISSIONS,
        AgencyMembership,
        UserPermission,
        StaffClientAssignment,
        WorkspaceMemberPolicy,
        SocialAccountPermissionOverride,
    )

    if action not in AGENCY_CLIENT_PERMISSIONS and action != "approve_posts":
        return Decision(False, reason=f"unknown action: {action}")
    if account is not None and account.client_id != workspace.pk:
        return Decision(False, reason="account is outside this workspace")
    role, relation = acting_context(user, workspace)
    if role == "forbidden":
        return Decision(False, reason="no active membership for this workspace")
    if role == "superadmin":
        return Decision(
            True,
            requires_approval=workspace.requires_approval
            and action in ("publish_posts", "schedule_posts"),
            role=role,
        )
    profile = getattr(user, "profile", None)
    policy = (
        WorkspaceMemberPolicy.objects.filter(
            user=user, workspace=workspace, is_active=True
        )
        .select_related("preset")
        .first()
    )
    preset = policy.preset if policy else None
    if not preset and relation:
        membership = AgencyMembership.objects.select_related("preset").get(
            user=user, agency=relation.agency, is_active=True
        )
        preset = membership.preset
    if role == "owner":
        allowed = True  # preserve existing ownership semantics
    elif role == "agency":
        allowed = relation.can(action)
    elif role == "staff":
        code = LEGACY_ACTIONS.get(
            action, "composer.approve" if action == "approve_posts" else None
        )
        allowed = bool(code and legacy_permissions(profile).get(code, False))
        assignment = StaffClientAssignment.objects.filter(
            staff_profile=profile, client=workspace
        ).first()
        if assignment and action in (
            "draft_posts",
            "publish_posts",
            "schedule_posts",
            "delete_posts",
            "edit_published",
        ):
            allowed = allowed and assignment.can_edit
        if assignment and action == "export_data":
            allowed = allowed and assignment.can_export
    else:
        allowed = bool(preset and preset.permissions.get(action) is True)
    ceiling = allowed if role in ("agency", "staff") else True
    if preset:
        allowed = (preset.permissions.get(action) is True) and ceiling
    if policy and action in policy.permissions:
        allowed = policy.permissions[action] is True and ceiling
    # Legacy explicit denials apply even to owners/agency users.
    code = LEGACY_ACTIONS.get(
        action, "composer.approve" if action == "approve_posts" else None
    )
    if (
        profile
        and code
        and UserPermission.objects.filter(
            user_profile=profile, permission__code=code, is_granted=False
        ).exists()
    ):
        allowed = False
    approval = bool(preset and preset.approval_defaults.get(action, False))
    if policy and action in policy.approval_overrides:
        approval = policy.approval_overrides[action] is True
    if account is not None:
        override = SocialAccountPermissionOverride.objects.filter(
            user=user, account=account
        ).first()
        if override:
            if action in override.permissions:
                allowed = allowed and override.permissions[action] is True
            if action in override.approval_overrides:
                approval = override.approval_overrides[action] is True
    # Workspace/relationship requirements cannot be waived by member/account settings.
    approval = approval or bool(relation and relation.needs_approval(action))
    approval = approval or (
        workspace.requires_approval and action in ("publish_posts", "schedule_posts")
    )
    return Decision(
        allowed,
        bool(allowed and approval),
        role,
        relation,
        "" if allowed else f"permission denied: {action}",
    )


def post_accounts(post):
    """Resolve exactly the accounts the publisher will use, including explicit targets."""
    from .models import PlatformCredential, SocialAccount

    accounts = []
    for platform in post.target_platforms or []:
        account_id = ((post.platform_overrides or {}).get(platform) or {}).get(
            "social_account_id"
        )
        if account_id:
            account = SocialAccount.objects.filter(
                pk=account_id, client=post.client, platform=platform
            ).first()
            if not account:
                return None
        else:
            credential = (
                PlatformCredential.objects.filter(
                    client=post.client, platform=platform, is_active=True
                )
                .select_related("social_account")
                .first()
            )
            account = credential.social_account if credential else None
            # Without a credential yet, evaluate the available account boundaries.
            if credential is None:
                accounts.extend(
                    SocialAccount.objects.filter(client=post.client, platform=platform)
                )
        if account is not None:
            accounts.append(account)
    return accounts


def post_decision(post, user=None, action="publish_posts"):
    """Apply the same publishing policy in HTTP and background execution."""
    actor = user or post.publish_requested_by or post.created_by
    accounts = post_accounts(post)
    if accounts is None:
        return Decision(
            False, reason="target account is outside this workspace or platform"
        )
    decisions = [evaluate(actor, post.client, action, account=a) for a in accounts] or [
        evaluate(actor, post.client, action)
    ]
    return Decision(
        all(d.allowed for d in decisions),
        any(d.requires_approval for d in decisions),
        reason=next((d.reason for d in decisions if not d.allowed), ""),
    )


def accessible_workspaces(user):
    from django.db.models import Q
    from .models import (
        Client,
        AgencyMembership,
        AgencyClientRelation,
        WorkspaceMemberPolicy,
    )

    if not user or not user.is_authenticated or not user.is_active:
        return Client.objects.none()
    profile = getattr(user, "profile", None)
    if profile and profile.role == "superadmin":
        return Client.objects.all()
    condition = Q(owner_user=user)
    if profile and profile.role == "client" and profile.client_id:
        condition |= Q(pk=profile.client_id)
    if profile and profile.role == "staff":
        condition |= Q(staff_assignments__staff_profile=profile) | Q(
            staff_assigned=profile
        )
    agency_ids = AgencyMembership.objects.filter(user=user, is_active=True).values_list(
        "agency_id", flat=True
    )
    condition |= Q(
        managing_agencies__agency_id__in=agency_ids, managing_agencies__status="active"
    )
    # Direct policies and assignments cannot revive a revoked agency relationship.
    all_agencies = AgencyMembership.objects.filter(user=user).values_list(
        "agency_id", flat=True
    )
    related = AgencyClientRelation.objects.filter(
        agency_id__in=all_agencies
    ).values_list("client_id", flat=True)
    active = AgencyClientRelation.objects.filter(
        agency_id__in=agency_ids, status="active"
    ).values_list("client_id", flat=True)
    direct = (
        WorkspaceMemberPolicy.objects.filter(user=user, is_active=True)
        .exclude(workspace_id__in=related)
        .values_list("workspace_id", flat=True)
    )
    condition |= Q(pk__in=direct)
    revoked = WorkspaceMemberPolicy.objects.filter(
        user=user, is_active=False
    ).values_list("workspace_id", flat=True)
    blocked = Q(pk__in=revoked) | (Q(pk__in=related) & ~Q(pk__in=active))
    owned = Q(owner_user=user)
    if profile and profile.role == "client" and profile.client_id:
        owned |= Q(pk=profile.client_id)
    return Client.objects.filter(condition).filter(~blocked | owned).distinct()


def scope_account_queryset(queryset, user, action):
    """Filter account-attributed reads through the same workspace/account policy."""
    from django.db.models import Q
    from .models import SocialAccount

    workspace_ids = [
        w.pk for w in accessible_workspaces(user) if evaluate(user, w, action).allowed
    ]
    accounts = SocialAccount.objects.filter(client_id__in=workspace_ids).select_related(
        "client"
    )
    account_ids = [
        a.pk for a in accounts if evaluate(user, a.client, action, account=a).allowed
    ]
    return queryset.filter(client_id__in=workspace_ids).filter(
        Q(social_account_id__in=account_ids) | Q(social_account_id__isnull=True)
    )
