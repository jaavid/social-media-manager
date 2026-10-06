# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
from django.db.models import Sum, Avg
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from social_stats.workspace_vocabulary import (
    WorkspaceJSONParser as JSONParser, WorkspaceFormParser as FormParser,
    WorkspaceMultiPartParser as MultiPartParser,
)


from social_stats.models import Client, PlatformCredential, DailyMetric, PostMetric, SyncLog
from social_stats.serializers.core import (
    ClientSerializer, DailyMetricSerializer, PostMetricSerializer, SyncLogSerializer,
)

from .helpers import _select_metric_attribution, check_client_access, parse_dates


class ClientViewSet(viewsets.ModelViewSet):
    serializer_class = ClientSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        from django.db.models import Q
        profile = getattr(self.request.user, 'profile', None)

        if profile and profile.role == 'superadmin':
            if self.action == 'list':
                # AllClientsPage: only show properly onboarded clients
                # (admin-created OR accepted invitation from this agency)
                return Client.objects.filter(
                    Q(userprofile__isnull=True) |
                    Q(userprofile__is_self_registered=False) |
                    Q(userprofile__agency=self.request.user)
                ).distinct().order_by('company')
            # All other actions (trigger_sync, dashboard, settings, etc.)
            # allow full access to every client
            return Client.objects.all().order_by('company')
        from social_stats.authorization import accessible_workspaces
        return accessible_workspaces(self.request.user).order_by('company')

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        try:
            profile = self.request.user.profile
            role = profile.role
        except Exception:
            role = None
            profile = None
        if role not in ('superadmin', 'staff', 'client'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied()
        # Preserve staff/platform creation semantics; creating a workspace must
        # not turn a staff member into an unrestricted workspace owner.
        client = serializer.save(
            owner_user=self.request.user if role == 'client' else None,
        )
        # Link new client to this user's profile if they don't have one yet
        if role == 'client' and profile and not profile.client:
            profile.client = client
            profile.save()

    @action(detail=True, methods=['get'])
    def organization_context(self, request, pk=None):
        from social_stats.tenancy import resolve_organization_context

        workspace = self.get_object()
        organization = resolve_organization_context(
            request.user, workspace.pk,
            organization_id=request.query_params.get('organization_id'),
        )
        # Workspace delegates may resolve the boundary, never enumerate its team.
        return Response({
            'workspace_id': workspace.pk,
            'organization_id': organization.pk,
            'requires_approval': organization.requires_approval,
        })

    @action(detail=True, methods=['get'])
    def analytics_report(self, request, pk=None):
        from datetime import date
        from social_stats.models import SocialAccount
        from social_stats.authorization import evaluate
        from social_stats.platforms.analytics import report
        from social_stats.platforms.base import ProviderError
        workspace = self.get_object()
        try:
            account_id = int(request.query_params.get('social_account', ''))
            since = date.fromisoformat(request.query_params.get('since', ''))
            until = date.fromisoformat(request.query_params.get('until', ''))
            page = int(request.query_params.get('page', '1'))
            if since > until or page < 1:
                raise ValueError
        except (ValueError, TypeError):
            return Response({'code': 'invalid_request'}, status=400)
        account = SocialAccount.objects.filter(pk=account_id, client=workspace).first()
        if account is None:
            return Response({'code': 'not_found'}, status=404)
        if not evaluate(request.user, workspace, 'view_analytics', account=account).allowed:
            return Response({'code': 'permission_denied'}, status=403)
        try:
            data = report(account, since, until, page)
        except ProviderError:
            return Response({'code': 'invalid_response'}, status=502)
        if request.query_params.get('export') == 'csv':
            import csv
            from io import StringIO
            from django.http import HttpResponse
            # Export every row in this exact authorized account/date filter.
            count = data['pagination']['count']
            data = report(account, since, until, 1, max(count, 1))
            output = StringIO()
            writer = csv.writer(output)
            keys = [m['key'] for m in data['metrics']]
            writer.writerow(['provider', 'account_id', 'date', 'observed_at', 'state', *keys])
            for row in data['rows']:
                writer.writerow([data['provider'], account.pk, row['date'], row['observed_at'], row['state'],
                                 *[row['values'][key] if row['values'][key] is not None else '' for key in keys]])
            response = HttpResponse(output.getvalue(), content_type='text/csv; charset=utf-8')
            response['Content-Disposition'] = 'attachment; filename="analytics.csv"'
            response['Cache-Control'] = 'no-store'
            return response
        return Response(data)

    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        """Aggregate workspace metrics without overlapping unassigned history."""
        if not check_client_access(request, pk):
            return Response({'error': 'Access denied'}, status=403)

        client = self.get_object()
        since, until = parse_dates(request)
        platform = request.query_params.get('platform')

        qs = DailyMetric.objects.filter(client=client, date__range=(since, until))
        if platform and platform != 'all':
            qs = qs.filter(platform=platform)
        from social_stats.authorization import scope_account_queryset
        qs = scope_account_queryset(qs, request.user, 'view_analytics')
        social_account_id = request.query_params.get('social_account')
        if social_account_id:
            qs = qs.filter(social_account_id=social_account_id)

        unassigned = qs.filter(social_account_id__isnull=True)
        unassigned_history = DailyMetricSerializer(unassigned, many=True).data
        qs = _select_metric_attribution(qs, request.query_params.get('attribution'))
        agg = qs.aggregate(
            total_impressions=Sum('impressions'),
            total_reach=Sum('reach'),
            total_clicks=Sum('clicks'),
            total_likes=Sum('likes'),
            total_comments=Sum('comments'),
            total_shares=Sum('shares'),
            total_saves=Sum('saves'),
            total_video_views=Sum('video_views'),
            total_followers=Sum('followers'),
            total_profile_views=Sum('profile_views'),
            total_website_clicks=Sum('website_clicks'),
            total_phone_calls=Sum('phone_calls'),
            total_direction_requests=Sum('direction_requests'),
            total_watch_time_minutes=Sum('watch_time_minutes'),
            total_subscribers_lost=Sum('subscribers_lost'),
            avg_view_duration=Avg('avg_view_duration'),
            # Facebook
            total_followers_lost=Sum('followers_lost'),
            total_negative_feedback=Sum('negative_feedback'),
            total_fb_video_views=Sum('fb_video_views'),
            total_fb_video_watch_time=Sum('fb_video_watch_time'),
            # Instagram
            total_accounts_engaged=Sum('accounts_engaged'),
            total_total_interactions=Sum('total_interactions'),
            total_email_contacts=Sum('email_contacts'),
            total_phone_call_clicks=Sum('phone_call_clicks'),
            total_direction_clicks=Sum('direction_clicks'),
            total_ig_followers_lost=Sum('ig_followers_lost'),
            avg_ctr=Avg('ctr'),
            avg_engagement=Avg('engagement_rate'),
        )
        for k, v in agg.items():
            if v is None:
                agg[k] = 0

        by_platform = list(qs.values('platform').annotate(
            impressions=Sum('impressions'),
            reach=Sum('reach'),
            clicks=Sum('clicks'),
            likes=Sum('likes'),
            video_views=Sum('video_views'),
            followers=Sum('followers'),
        ))

        return Response({
            'client':      ClientSerializer(client).data,
            'period':      {'since': since.isoformat(), 'until': until.isoformat()},
            'totals':      agg,
            'by_platform': by_platform,
            'unassigned_history': unassigned_history,
        })

    @action(detail=True, methods=['get'])
    def timeseries(self, request, pk=None):
        """Return dated metrics with optional social-account filtering."""
        if not check_client_access(request, pk):
            return Response({'error': 'Access denied'}, status=403)

        client = self.get_object()
        since, until = parse_dates(request)
        platform = request.query_params.get('platform')

        qs = DailyMetric.objects.filter(
            client=client, date__range=(since, until)
        ).order_by('date')
        if platform and platform != 'all':
            qs = qs.filter(platform=platform)
        from social_stats.authorization import scope_account_queryset
        qs = scope_account_queryset(qs, request.user, 'view_analytics')
        social_account_id = request.query_params.get('social_account')
        if social_account_id:
            qs = qs.filter(social_account_id=social_account_id)

        qs = _select_metric_attribution(qs, request.query_params.get('attribution'))
        return Response(DailyMetricSerializer(qs, many=True).data)

    @action(detail=True, methods=['get'])
    def posts(self, request, pk=None):
        """List workspace post metrics with optional account filtering."""
        if not check_client_access(request, pk):
            return Response({'error': 'Access denied'}, status=403)

        client   = self.get_object()
        platform = request.query_params.get('platform')
        limit    = int(request.query_params.get('limit', 20))
        offset   = int(request.query_params.get('offset', 0))
        since, until = parse_dates(request)

        qs = PostMetric.objects.filter(
            client=client,
            published_at__date__gte=since,
            published_at__date__lte=until,
        )
        if platform and platform != 'all':
            qs = qs.filter(platform=platform)
        from social_stats.authorization import scope_account_queryset
        qs = scope_account_queryset(qs, request.user, 'view_posts')
        social_account_id = request.query_params.get('social_account')
        if social_account_id:
            qs = qs.filter(social_account_id=social_account_id)

        total = qs.count()
        posts = list(PostMetricSerializer(qs[offset:offset + limit], many=True).data)

        return Response({
            'results': posts,
            'total': total,
            'has_more': (offset + limit) < total,
        })

    @action(detail=True, methods=['post'])
    def trigger_sync(self, request, pk=None):
        """Queue analytics syncs for the requested eligible accounts."""
        if not check_client_access(request, pk):
            return Response({'error': 'Access denied'}, status=403)

        from social_stats.platforms.analytics import queue_sync
        from social_stats.platforms.registry import iter_providers
        from social_stats.platforms.base import ProviderError
        client = self.get_object()
        platforms = request.data.get('platforms')
        if platforms is None:
            platforms = [p.manifest.key for p in iter_providers() if p.manifest.capability('analytics').enabled]
        if not isinstance(platforms, list) or any(not isinstance(p, str) for p in platforms):
            return Response({'code': 'invalid_request'}, status=400)
        requested_accounts = request.data.get('social_account_ids')
        if requested_accounts is not None and (not isinstance(requested_accounts, list) or
            any(type(value) is not int or value <= 0 for value in requested_accounts)):
            return Response({'code': 'invalid_request'}, status=400)
        credentials = PlatformCredential.objects.filter(client=client, platform__in=platforms,
            is_active=True).exclude(access_token='').select_related('social_account__client')
        if requested_accounts is not None:
            credentials = credentials.filter(social_account_id__in=requested_accounts)
        queued = []
        for credential in credentials:
            try:
                queue_sync(credential, request.user)
            except ProviderError:
                continue
            queued.append({'platform': credential.platform, 'social_account_id': credential.social_account_id})

        return Response({'queued': queued})

    @action(detail=True, methods=['get'])
    def sync_status(self, request, pk=None):
        """Return workspace sync status, optionally scoped to an account."""
        if not check_client_access(request, pk):
            return Response({'error': 'Access denied'}, status=403)

        logs = SyncLog.objects.filter(client_id=pk)
        if request.query_params.get('social_account'):
            logs = logs.filter(social_account_id=request.query_params['social_account'])
        logs = logs.order_by('-started_at')[:20]
        return Response(SyncLogSerializer(logs, many=True).data)
