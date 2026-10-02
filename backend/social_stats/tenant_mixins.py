# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""Tenant-scoped viewsets backed by authorization.accessible_workspaces.

Request workspace selectors only narrow authorized querysets. Account-attributed
reads additionally apply the shared account policy. perform_create stamps the
authorized workspace instead of trusting serializer input.
"""
from typing import Optional

from rest_framework.exceptions import PermissionDenied


class TenantScopedMixin:
    """
    Apply to a DRF ViewSet whose model has `client = ForeignKey(Client)`.

    Provides:
      - get_queryset() that filters by the user's tenant
      - perform_create() that stamps `client_id` (and `created_by` when the
        model has it) — never lets clients spoof another tenant.
      - resolved_client_id() helper for non-CRUD action endpoints.

    Subclasses should override `client_field_name` if their model uses a
    different attribute (e.g. `client` is hidden behind a join).
    """
    client_field_name = 'client'

    # ── Helpers ──────────────────────────────────────────────────────────
    def _profile(self):
        try:
            return self.request.user.profile
        except Exception:
            return None

    def _agency_client_ids(self, profile):
        """Active client ids managed by this user's primary agency. Empty list
        when the user isn't an agency member or has no active relations.

        Checks AgencyMembership.is_active so a user removed from the agency
        loses visibility immediately, even if profile.primary_agency_id is
        a stale field that wasn't cleared on removal.
        """
        agency_id = getattr(profile, 'primary_agency_id', None)
        if not agency_id:
            return []
        from .marketplace_models import AgencyClientRelation, AgencyMembership

        if not AgencyMembership.objects.filter(
            user=self.request.user, agency_id=agency_id, is_active=True,
        ).exists():
            return []

        return list(
            AgencyClientRelation.objects.filter(
                agency_id=agency_id, status='active',
            ).values_list('client_id', flat=True)
        )

    def resolved_client_id(self) -> Optional[int]:
        """Returns the client_id the current user is *allowed* to operate on."""
        from .authorization import accessible_workspaces
        workspaces = accessible_workspaces(self.request.user)
        params = self.request.query_params
        data = self.request.data
        cid = params.get('workspace_id') or params.get('client_id') or data.get('workspace') or data.get('client')
        if cid:
            try:
                return int(cid) if workspaces.filter(pk=int(cid)).exists() else None
            except (TypeError, ValueError):
                return None
        profile = self._profile()
        if profile and profile.client_id and workspaces.filter(pk=profile.client_id).exists():
            return profile.client_id
        return None

    def get_queryset(self):
        from .authorization import accessible_workspaces
        qs = super().get_queryset()
        workspaces = accessible_workspaces(self.request.user)
        cid = self.request.query_params.get('workspace_id') or self.request.query_params.get('client_id')
        if cid:
            try:
                workspaces = workspaces.filter(pk=int(cid))
            except (TypeError, ValueError):
                return qs.none()
        qs = qs.filter(**{f'{self.client_field_name}__in': workspaces})
        read_action = {'Conversation': 'view_inbox', 'PlatformReview': 'view_inbox',
                       'DailyMetric': 'view_analytics', 'PostMetric': 'view_posts'}.get(qs.model.__name__)
        if read_action and self.client_field_name == 'client':
            from .authorization import scope_account_queryset
            qs = scope_account_queryset(qs, self.request.user, read_action)
        return qs

    def perform_create(self, serializer):
        client_id = self.resolved_client_id()
        if client_id is None:
            raise PermissionDenied('No workspace context available for this user')

        extra = {f'{self.client_field_name}_id': client_id}
        model = serializer.Meta.model
        field_names = {f.name for f in model._meta.get_fields()}
        if 'created_by' in field_names:
            extra['created_by'] = self.request.user
        serializer.save(**extra)

    _resolved_client_id = resolved_client_id
