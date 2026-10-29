# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from social_stats.authorization import evaluate, accessible_workspaces


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
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = SocialAccount.objects.filter(
            client__in=accessible_workspaces(self.request.user),
        ).select_related('credential')
        client_id = self.request.query_params.get('client')
        platform = self.request.query_params.get('platform')
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        if platform:
            queryset = queryset.filter(platform=platform)
        actions = {'observed_posts': ['view_posts'], 'observations': ['view_analytics']}.get(
            self.action, ['view_posts', 'view_analytics', 'view_inbox', 'draft_posts',
                          'publish_posts', 'schedule_posts', 'connect_platforms'])
        return queryset.filter(pk__in=[a.pk for a in queryset.select_related('client')
            if any(evaluate(self.request.user, a.client, name, account=a).allowed for name in actions)])

    @action(detail=True, methods=['get'])
    def observed_posts(self, request, pk=None):
        """Reusable stored public content; opening a view never triggers collection."""
        from social_stats.models import ChannelCalendarPost
        account = self.get_object()
        posts = ChannelCalendarPost.objects.filter(source__social_account=account).order_by('-published_at', '-pk')
        page = self.paginate_queryset(posts)
        def row(post):
            return {'id': post.pk, 'social_account_id': account.pk, 'caption': post.caption,
                    'post_url': post.post_url, 'post_type': post.post_type, 'media_url': post.media_url,
                    'published_at': post.published_at, 'fetched_at': post.observed_at or post.fetched_at, 'metrics': post.metrics, 'details': post.details}
        rows = [row(p) for p in (page if page is not None else posts[:100])]
        return self.get_paginated_response(rows) if page is not None else Response(rows)

    @action(detail=True, methods=['get'])
    def observations(self, request, pk=None):
        from social_stats.models import ChannelPostObservation
        account = self.get_object()
        observations = ChannelPostObservation.objects.filter(post__source__social_account=account).select_related('post')
        page = self.paginate_queryset(observations)
        rows = [{'post_id': o.post_id, 'external_id': o.post.external_id, 'provider': o.provider,
                 'metrics': o.metrics, 'observed_at': o.observed_at}
                for o in (page if page is not None else observations[:100])]
        return self.get_paginated_response(rows) if page is not None else Response(rows)


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

