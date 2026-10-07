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


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ("id", "name", "owner_user", "requires_approval", "created_at")
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
        require_organization_owner(request.user, organization)
        if request.method == "POST":
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
        return Response(
            list(
                organization.memberships.order_by("pk").values(
                    "user_id",
                    "is_active",
                )
            )
        )

    @action(detail=True, methods=["get", "post"])
    def workspaces(self, request, pk=None):
        organization = self.get_object()
        if request.method == "POST":
            require_organization_owner(request.user, organization)
            serializer = ClientSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            # Only this owner-authorized route may select an existing tenant.
            # An unclaimed legacy organization stays unclaimed.
            workspace = serializer.save(
                organization=organization,
                owner_user=organization.owner_user,
            )
            return Response(ClientSerializer(workspace).data, status=201)
        workspaces = (
            accessible_workspaces(request.user)
            .filter(organization=organization)
            .order_by("pk")
        )
        return Response(ClientSerializer(workspaces, many=True).data)
