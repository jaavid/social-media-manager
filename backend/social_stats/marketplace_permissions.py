# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""Compatibility adapter for the authoritative authorization evaluator.

All callers receive allowed / denied / approval_required. Only this adapter
creates approval rows; authorization.evaluate remains side-effect free.
"""
from __future__ import annotations

from typing import Optional

from .models import (
    AgencyClientRelation,
    ApprovalRequest,
    Client,
)


# ─────────────────────────────────────────────────────────────────────────────
# Acting context resolution
# ─────────────────────────────────────────────────────────────────────────────
def _profile(user):
    return getattr(user, 'profile', None)


def _is_owner(user, client: Client) -> bool:
    """True if `user` owns `client` directly (or is the legacy client-role user
    pointing at it)."""
    if not user or not user.is_authenticated:
        return False
    if client.owner_user_id and client.owner_user_id == user.id:
        return True
    prof = _profile(user)
    if prof and prof.role == 'client' and prof.client_id == client.id:
        return True
    return False


def _is_superadmin(user) -> bool:
    prof = _profile(user)
    return bool(prof and prof.role == 'superadmin')


def _resolve_relation(user, client: Client) -> Optional[AgencyClientRelation]:
    from .authorization import acting_context
    return acting_context(user, client)[1]


def resolve_acting_context(request, client: Client):
    """Return (role, relation_or_None).

    role is one of 'superadmin', 'owner', 'agency', 'forbidden'.
    """
    from .authorization import acting_context
    return acting_context(getattr(request, 'user', None), client)


# ─────────────────────────────────────────────────────────────────────────────
# Action check (the call sites use this)
# ─────────────────────────────────────────────────────────────────────────────
def check_action(
    request,
    client: Client,
    action_key: str,
    *,
    action_type: Optional[str] = None,
    payload: Optional[dict] = None,
    target_object_type: str = '',
    target_object_id: Optional[int] = None,
    preview: str = '',
    social_account=None,
):
    """Check whether the request may perform `action_key` on `client`.

    Returns one of:
        ('allowed',           {'role': 'superadmin'|'owner'|'agency', 'relation': r|None})
        ('denied',            {'reason': str})
        ('approval_required', {'approval': ApprovalRequest, 'relation': r})

    `action_key` must be a key in AGENCY_CLIENT_PERMISSIONS.

    `action_type` (free-form string like 'publish_post', 'send_campaign')
    is recorded on the ApprovalRequest when one is created. If omitted,
    the action_key is used.
    """
    from .authorization import evaluate
    from .models import SocialAccount
    account_id = ((payload or {}).get('social_account_id') or
                  getattr(request, 'query_params', {}).get('social_account_id') or
                  getattr(request, 'data', {}).get('social_account_id') or
                  getattr(request, 'query_params', {}).get('account_id'))
    if account_id and social_account is None:
        try:
            social_account = SocialAccount.objects.get(pk=account_id, client=client)
        except (SocialAccount.DoesNotExist, ValueError, TypeError):
            return ('denied', {'reason': 'account is outside this workspace'})
    if target_object_type in ('Conversation', 'PlatformReview') and target_object_id:
        from . import models
        target = getattr(models, target_object_type).objects.filter(pk=target_object_id, client=client).first()
        if target is None:
            return ('denied', {'reason': 'target is outside this workspace'})
        social_account = target.social_account
    decision = evaluate(request.user, client, action_key, account=social_account)
    if target_object_type == 'UnifiedPost' and target_object_id:
        from .models import UnifiedPost
        from .authorization import post_decision
        post = UnifiedPost.objects.filter(pk=target_object_id, client=client).first()
        if post is None:
            return ('denied', {'reason': 'post is outside this workspace'})
        post_policy = post_decision(post, request.user, action_key)
        if not post_policy.allowed:
            return ('denied', {'reason': post_policy.reason})
        from dataclasses import replace
        decision = replace(decision, requires_approval=decision.requires_approval or post_policy.requires_approval)
    platforms = (payload or {}).get('platforms') or ([(payload or {}).get('platform')] if (payload or {}).get('platform') else None)
    if platforms and social_account is None and not (target_object_type == 'UnifiedPost' and target_object_id):
        decisions = [evaluate(request.user, client, action_key, account=a)
                     for a in SocialAccount.objects.filter(client=client, platform__in=platforms)]
        if any(not d.allowed for d in decisions):
            return ('denied', {'reason': 'account permission denied'})
        if any(d.requires_approval for d in decisions):
            from dataclasses import replace
            decision = replace(decision, requires_approval=True)
    role, relation = decision.role, decision.relation
    if not decision.allowed:
        return ('denied', {'reason': decision.reason})
    if decision.requires_approval:
        ar = ApprovalRequest.objects.create(
            relation=relation,
            client=client,
            requested_by=request.user,
            action_type=(action_type or action_key),
            payload={**(payload or {}), '_permission_action': action_key, **({'social_account_id': social_account.pk} if social_account else {})},
            preview=preview,
            target_object_type=target_object_type,
            target_object_id=target_object_id,
        )
        if client.owner_user_id:
            from django.conf import settings
            from .notification_dispatcher import dispatch as dispatch_notification
            frontend = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
            dispatch_notification(
                client.owner_user,
                event_type='approval_requested',
                title=f'{request.user.get_username()} needs your approval',
                body=(preview or f'They want to: {action_type or action_key}')[:300],
                cta_url=f'{frontend}/u/approvals',
                cta_label='Review approval',
                data={
                    'kind':         'approval_requested',
                    'approval_id':  ar.id,
                    'agency_name':  relation.agency.name if relation else '',
                    'action_type':  action_type or action_key,
                    'expires_at':   ar.expires_at.isoformat() if ar.expires_at else None,
                },
            )
        return ('approval_required', {'approval': ar, 'relation': relation})

    return ('allowed', {'role': role, 'relation': relation})


# ─────────────────────────────────────────────────────────────────────────────
# Convenience: turn a check result into a DRF Response
# ─────────────────────────────────────────────────────────────────────────────
def deny_response(reason: str, status_code: int = 403):
    from rest_framework.response import Response
    return Response({'error': reason}, status=status_code)


def approval_pending_response(approval: ApprovalRequest):
    """Standard 202 envelope when an action is intercepted for approval."""
    from rest_framework.response import Response
    return Response(
        {
            'requires_approval': True,
            'approval_id':       approval.id,
            'action_type':       approval.action_type,
            'expires_at':        approval.expires_at.isoformat(),
            'message':           f'Submitted to {approval.client.company} for approval.',
        },
        status=202,
    )
