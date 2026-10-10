"""Organization APIs; membership never grants access to every workspace."""

from django.contrib.auth import get_user_model
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from social_stats.authorization import accessible_workspaces
from social_stats.models import Organization, OrganizationMembership
from social_stats.serializers.core import ClientSerializer
from social_stats.tenancy import accessible_organizations, require_organization_owner
from social_stats.organization_team import organization_role, require_manager
from social_stats.models import WorkspaceMemberPolicy


class OrganizationSerializer(serializers.ModelSerializer):
    my_role = serializers.SerializerMethodField()

    def get_my_role(self, organization):
        return organization_role(self.context['request'].user, organization)

    class Meta:
        model = Organization
        fields = ("id", "name", "owner_user", "requires_approval", "created_at", "my_role")
        read_only_fields = ("id", "owner_user", "created_at")


class MembershipInput(serializers.Serializer):
    user_id = serializers.IntegerField(min_value=1)
    is_active = serializers.BooleanField(default=True)


class OrganizationViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    serializer_class = OrganizationSerializer
    http_method_names = ("get", "post", "put", "patch", "head", "options")

    def get_queryset(self):
        return accessible_organizations(self.request.user).order_by("pk")

    def perform_create(self, serializer):
        if not self.request.user.is_active:
            raise PermissionDenied()
        serializer.save(owner_user=self.request.user)

    def perform_update(self, serializer):
        require_organization_owner(self.request.user, serializer.instance)
        serializer.save()

    @action(detail=True, methods=['get'])
    def entitlements(self, request, pk=None):
        organization = self.get_object()
        require_organization_owner(request.user, organization)
        from social_stats.entitlements import snapshot

        return Response(snapshot(organization))

    @action(detail=True, methods=["get", "post"])
    def members(self, request, pk=None):
        organization = self.get_object()
        require_manager(request.user, organization)
        if request.method == "POST":
            require_organization_owner(request.user, organization)
            incoming = MembershipInput(data=request.data)
            incoming.is_valid(raise_exception=True)
            user = get_object_or_404(
                get_user_model(), pk=incoming.validated_data["user_id"], is_active=True
            )
            with transaction.atomic():
                OrganizationMembership.objects.update_or_create(
                    organization=organization,
                    user=user,
                    defaults={"is_active": incoming.validated_data["is_active"]},
                )
        members = list(organization.memberships.order_by('pk').values(
            'user_id', 'is_active', 'role', 'user__email', 'user__first_name', 'user__last_name',
        ))
        for member in members:
            member['workspace_grants'] = [
                {'workspace_id': policy.workspace_id, 'preset': policy.preset.key if policy.preset else None}
                for policy in WorkspaceMemberPolicy.objects.filter(
                    user_id=member['user_id'], workspace__organization=organization, is_active=True,
                ).select_related('preset')
            ]
        return Response(members)


    @action(detail=True, methods=["get", "post"])
    @transaction.atomic
    def workspaces(self, request, pk=None):
        organization = self.get_object()
        if request.method == "POST":
            require_manager(request.user, organization)
            serializer = ClientSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            # Only this owner-authorized route may select an existing tenant.
            # An unclaimed legacy organization stays unclaimed.
            workspace = serializer.save(
                organization=organization,
                owner_user=organization.owner_user,
            )
            if organization_role(request.user, organization) == 'admin':
                from social_stats.models import RolePreset
                WorkspaceMemberPolicy.objects.create(
                    workspace=workspace, user=request.user,
                    preset=RolePreset.objects.get(key='workspace-admin'), updated_by=request.user,
                )
            profile = getattr(request.user, 'profile', None)
            if profile and not profile.default_workspace_id:
                profile.default_workspace = workspace
                profile.save(update_fields=['default_workspace'])
            return Response(ClientSerializer(workspace).data, status=201)
        workspaces = (
            accessible_workspaces(request.user)
            .filter(organization=organization)
            .order_by("pk")
        )
        return Response(ClientSerializer(workspaces, many=True).data)

    @action(detail=True, methods=['post'])
    def select_workspace(self, request, pk=None):
        organization = self.get_object()
        incoming = serializers.IntegerField(min_value=1)
        workspace_id = incoming.run_validation(request.data.get('client_id'))
        workspace = get_object_or_404(accessible_workspaces(request.user),
                                      pk=workspace_id, organization=organization)
        request.user.profile.default_workspace = workspace
        request.user.profile.save(update_fields=['default_workspace'])
        return Response({'workspace_id': workspace.pk})
