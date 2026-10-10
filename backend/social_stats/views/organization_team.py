"""Product team management and email invitations, with no Django admin access."""
import secrets
from datetime import timedelta
from html import escape

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.cache import never_cache
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from social_stats.entitlements import locked_organization
from social_stats.models import (
    Organization, OrganizationMembership, OrganizationTeamInvitation,
    WorkspaceMemberPolicy, SecurityAuditLog,
)
from social_stats.organization_team import (
    organization_role, require_manager, require_target_management, validate_grants,
    assign_member, token_digest,
)
from rest_framework.throttling import UserRateThrottle


class TeamInvitationThrottle(UserRateThrottle):
    scope = 'team_invitation'
    rate = '30/hour'


class TeamTokenThrottle(UserRateThrottle):
    scope = 'team_token'
    rate = '60/minute'


class InvitationInput(serializers.Serializer):
    email = serializers.EmailField()
    organization_role = serializers.ChoiceField(choices=('admin', 'member'), default='member')
    workspace_grants = serializers.JSONField()


class MemberInput(serializers.Serializer):
    organization_role = serializers.ChoiceField(choices=('admin', 'member'), default='member')
    workspace_grants = serializers.JSONField(required=False)
    is_active = serializers.BooleanField(default=True)


def _audit(actor, organization, action, target):
    SecurityAuditLog.objects.create(actor_user=actor, event_type='role_changed',
                                    target_object_type='Organization', target_object_id=str(organization.pk),
                                    metadata={'action': action, 'target_id': target})


def invitation_from_token(token):
    invitation = get_object_or_404(OrganizationTeamInvitation.objects.select_related('organization'),
                                  token_digest=token_digest(token))
    if invitation.status != 'pending' or invitation.expires_at <= timezone.now():
        raise serializers.ValidationError('Invitation has expired or is no longer available')
    return invitation


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([TeamInvitationThrottle])
def invitations(request, organization_id):
    organization = get_object_or_404(Organization, pk=organization_id)
    require_manager(request.user, organization)
    if request.method == 'GET':
        return Response(list(organization.team_invitations.order_by('-pk').values(
            'id', 'email', 'organization_role', 'workspace_grants', 'status', 'expires_at')))
    incoming = InvitationInput(data=request.data)
    incoming.is_valid(raise_exception=True)
    data = incoming.validated_data
    role = data['organization_role']
    if role == 'admin' and organization_role(request.user, organization) != 'owner':
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied('Only the owner can invite an organization administrator')
    grants = validate_grants(organization, data['workspace_grants'])
    email = data['email'].lower()
    target = get_user_model().objects.filter(email__iexact=email).first()
    if target:
        require_target_management(request.user, organization, target, role)
    token = secrets.token_urlsafe(32)
    # Keep the pending invitation on delivery failure; return truthful status and
    # allow an explicit replacement. Never replay an ambiguous email automatically.
    with locked_organization(organization.pk):
        require_manager(request.user, organization)
        if role == 'admin' and organization_role(request.user, organization) != 'owner':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only the owner can invite an organization administrator')
        OrganizationTeamInvitation.objects.filter(
            organization=organization, email__iexact=email, status='pending',
        ).update(status='cancelled')
        invitation = OrganizationTeamInvitation.objects.create(
            organization=organization, email=email, token_digest=token_digest(token),
            organization_role=role, workspace_grants=grants, invited_by=request.user,
            expires_at=timezone.now() + timedelta(days=7),
        )
        _audit(request.user, organization, 'team.invited', invitation.pk)
    link = f"{settings.FRONTEND_URL.rstrip('/')}/join-team?token={token}"
    sent = False
    try:
        sent = bool(send_mail(
            'دعوت به تیم در راوینتا',
            f'برای پیوستن به تیم {organization.name} این پیوند را باز کنید:\n{link}\nاین دعوت ۷ روز اعتبار دارد.',
            settings.DEFAULT_FROM_EMAIL, [email],
            html_message=f'<div dir="rtl"><p>دعوت به تیم {escape(organization.name)}</p><a href="{escape(link)}">پذیرش دعوت</a><p>این دعوت ۷ روز اعتبار دارد.</p></div>',
            fail_silently=False,
        ))
    except Exception:
        # No recipient, token, body or provider exception in logs/responses.
        pass
    return Response({'id': invitation.pk, 'status': 'pending', 'email_sent': sent}, status=201)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def cancel_invitation(request, organization_id, invitation_id):
    organization = get_object_or_404(Organization, pk=organization_id)
    with locked_organization(organization.pk):
        require_manager(request.user, organization)
        invitation = get_object_or_404(OrganizationTeamInvitation, pk=invitation_id, organization=organization)
        if invitation.organization_role == 'admin' and organization_role(request.user, organization) != 'owner':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only the owner can cancel an administrator invitation')
        if invitation.status == 'pending':
            invitation.status = 'cancelled'
            invitation.save(update_fields=['status'])
            _audit(request.user, organization, 'team.invitation_cancelled', invitation.pk)
    return Response(status=204)


@never_cache
@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
@throttle_classes([TeamTokenThrottle])
def invitation_token(request):
    token = request.query_params.get('token') if request.method == 'GET' else request.data.get('token')
    invitation = invitation_from_token(token)
    if request.method == 'GET':
        return Response({'organization_name': invitation.organization.name, 'email': invitation.email,
                         'organization_role': invitation.organization_role, 'expires_at': invitation.expires_at,
                         'workspaces': list(invitation.organization.workspaces.filter(
                             pk__in=[g['workspace_id'] for g in invitation.workspace_grants],
                         ).values('id', 'company'))})
    return _accept(request, invitation)


def _accept(request, invitation):
    user = request.user
    profile = getattr(user, 'profile', None)
    if not user.is_authenticated or not user.is_active or not profile or not profile.email_verified:
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied('Sign in with a verified email to accept this invitation')
    if user.email.lower() != invitation.email.lower():
        from rest_framework.exceptions import PermissionDenied
        raise PermissionDenied('This invitation belongs to a different email')
    with locked_organization(invitation.organization_id):
        invitation = OrganizationTeamInvitation.objects.select_for_update().get(pk=invitation.pk)
        if invitation.status != 'pending' or invitation.expires_at <= timezone.now():
            raise serializers.ValidationError('Invitation has expired or is no longer available')
        require_manager(invitation.invited_by, invitation.organization)
        require_target_management(invitation.invited_by, invitation.organization, user, invitation.organization_role)
        grants = validate_grants(invitation.organization, invitation.workspace_grants)
        assign_member(invitation.organization, user, invitation.organization_role, grants, invitation.invited_by)
        invitation.status = 'accepted'
        invitation.accepted_by = user
        invitation.save(update_fields=['status', 'accepted_by'])
        _audit(user, invitation.organization, 'team.invitation_accepted', invitation.pk)
    return Response({'organization_id': invitation.organization_id, 'workspace_ids': [g['workspace_id'] for g in grants]})


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def member(request, organization_id, user_id):
    organization = get_object_or_404(Organization, pk=organization_id)
    incoming = MemberInput(data=request.data)
    incoming.is_valid(raise_exception=True)
    data = incoming.validated_data
    with locked_organization(organization.pk):
        require_manager(request.user, organization)
        membership = get_object_or_404(OrganizationMembership.objects.select_related('user'),
                                      organization=organization, user_id=user_id)
        require_target_management(request.user, organization, membership.user, data['organization_role'])
        if not data['is_active']:
            membership.is_active = False
            membership.save(update_fields=['is_active'])
            OrganizationTeamInvitation.objects.filter(
                organization=organization, email__iexact=membership.user.email, status='pending',
            ).update(status='cancelled')
            WorkspaceMemberPolicy.objects.filter(user_id=user_id, workspace__organization=organization).update(
                is_active=False, updated_by=request.user,
            )
        else:
            grants = validate_grants(organization, data.get('workspace_grants'))
            assign_member(organization, membership.user, data['organization_role'], grants, request.user)
        _audit(request.user, organization, 'team.member_updated', user_id)
    return Response({'user_id': user_id, 'is_active': data['is_active']})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_invitations(request):
    rows = OrganizationTeamInvitation.objects.filter(
        email__iexact=request.user.email, status='pending', expires_at__gt=timezone.now(),
    ).select_related('organization').order_by('-pk')
    return Response([{'id': row.pk, 'organization_name': row.organization.name,
                      'organization_role': row.organization_role, 'expires_at': row.expires_at,
                      'workspaces': list(row.organization.workspaces.filter(
                          pk__in=[g['workspace_id'] for g in row.workspace_grants],
                      ).values('id', 'company'))} for row in rows])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_mine(request, invitation_id):
    invitation = get_object_or_404(OrganizationTeamInvitation.objects.select_related('organization'),
                                  pk=invitation_id, email__iexact=request.user.email)
    return _accept(request, invitation)
