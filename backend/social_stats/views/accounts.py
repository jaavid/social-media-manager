# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
from rest_framework import viewsets


from social_stats.models import SocialAccount, PlatformCredential, SyncLog
from social_stats.serializers.core import (
    SocialAccountSerializer, PlatformCredentialSerializer,
    SyncLogSerializer,
)

from .helpers import _agency_client_ids


class CredentialViewSet(viewsets.ModelViewSet):
    serializer_class = PlatformCredentialSerializer

    def get_queryset(self):
        client_ids = _agency_client_ids(self.request)
        client_id  = self.request.query_params.get('client')
        qs = PlatformCredential.objects.select_related('client').filter(client_id__in=client_ids)
        if client_id:
            qs = qs.filter(client_id=client_id)
        return qs

    def _assert_client_allowed(self, serializer):
        client = serializer.validated_data.get('client')
        if client and client.id not in _agency_client_ids(self.request):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You cannot manage credentials for this client.')

    def perform_create(self, serializer):
        self._assert_client_allowed(serializer)
        serializer.save()

    def perform_update(self, serializer):
        self._assert_client_allowed(serializer)
        serializer.save()


class SocialAccountViewSet(viewsets.ReadOnlyModelViewSet):
    """Tenant-scoped, token-free identities for account pickers and filters."""
    serializer_class = SocialAccountSerializer

    def get_queryset(self):
        queryset = SocialAccount.objects.filter(
            client_id__in=_agency_client_ids(self.request),
        ).select_related('credential')
        client_id = self.request.query_params.get('client')
        platform = self.request.query_params.get('platform')
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        if platform:
            queryset = queryset.filter(platform=platform)
        return queryset


class SyncLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SyncLogSerializer

    def get_queryset(self):
        client_ids = _agency_client_ids(self.request)
        client_id  = self.request.query_params.get('client')
        qs = SyncLog.objects.select_related('client').filter(client_id__in=client_ids)
        if client_id:
            qs = qs.filter(client_id=client_id)
        if self.request.query_params.get('social_account'):
            qs = qs.filter(social_account_id=self.request.query_params['social_account'])
        return qs.order_by('-started_at')[:100]

