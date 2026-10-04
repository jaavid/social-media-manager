# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
from django.db.models import Sum
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from django.db.models import F
from django.utils import timezone

from social_stats.models import DailyMetric, PostMetric, SharedReport
from social_stats.serializers.core import (
    SharedReportSerializer,
)

from .helpers import _agency_client_ids


class SharedReportViewSet(viewsets.ModelViewSet):
    serializer_class = SharedReportSerializer

    def get_queryset(self):
        qs = SharedReport.objects.select_related('client', 'created_by').filter(
            client_id__in=_agency_client_ids(self.request)
        )
        client_id = self.request.query_params.get('client')
        if client_id:
            qs = qs.filter(client_id=client_id)
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        client = serializer.validated_data.get('client')
        if not client or client.id not in _agency_client_ids(self.request):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You cannot share reports for this client.')
        raw_password = self.request.data.get('password', '')
        instance = serializer.save(created_by=self.request.user)
        if raw_password:
            instance.is_password_protected = True
            instance.set_password(raw_password)
            instance.save(update_fields=['is_password_protected', 'password_hash'])

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)


def _build_report_data(report):
    """Aggregate metrics for the shared report date range and platforms."""
    date_range = (report.date_from, report.date_until)
    qs = DailyMetric.objects.filter(
        client=report.client,
        date__range=date_range,
    )
    if report.platforms:
        qs = qs.filter(platform__in=report.platforms)

    by_platform = list(qs.values('platform').annotate(
        impressions=Sum('impressions'),
        reach=Sum('reach'),
        clicks=Sum('clicks'),
        likes=Sum('likes'),
        followers=Sum('followers'),
        video_views=Sum('video_views'),
    ))

    timeseries = list(
        qs.values('date', 'platform')
          .annotate(
              impressions=Sum('impressions'),
              reach=Sum('reach'),
              clicks=Sum('clicks'),
              likes=Sum('likes'),
          )
          .order_by('date')
    )

    totals = qs.aggregate(
        impressions=Sum('impressions'),
        reach=Sum('reach'),
        clicks=Sum('clicks'),
        likes=Sum('likes'),
        followers=Sum('followers'),
        video_views=Sum('video_views'),
    )

    top_posts = list(
        PostMetric.objects.filter(
            client=report.client,
            published_at__date__range=date_range,
        ).order_by('-likes', '-video_views')[:5]
        .values('platform', 'caption', 'post_url', 'thumbnail_url',
                'likes', 'comments', 'shares', 'video_views', 'published_at')
    )

    return {
        'client': {'name': report.client.company, 'industry': getattr(report.client, 'industry', '')},
        'period': {'from': report.date_from.isoformat(), 'until': report.date_until.isoformat()},
        'totals': totals,
        'by_platform': by_platform,
        'timeseries': timeseries,
        'top_posts': top_posts,
    }


@api_view(['GET'])
@permission_classes([AllowAny])
def public_report(request, token):
    try:
        report = SharedReport.objects.select_related('client').get(token=token, is_active=True)
    except SharedReport.DoesNotExist:
        return Response({'error': 'Report not found'}, status=404)

    if report.is_expired:
        return Response({'error': 'This report link has expired'}, status=410)

    if report.is_password_protected:
        # Require password to be sent via POST (handled by public_report_verify)
        # GET returns meta only so the frontend can show the password gate
        return Response({
            'requires_password': True,
            'client_name': report.client.company,
            'period': {'from': report.date_from.isoformat(), 'until': report.date_until.isoformat()},
        })

    # Increment view counter atomically
    SharedReport.objects.filter(pk=report.pk).update(
        view_count=F('view_count') + 1,
        last_viewed_at=timezone.now(),
    )

    data = _build_report_data(report)
    data['requires_password'] = False
    return Response(data)


@api_view(['POST'])
@permission_classes([AllowAny])
def public_report_verify(request, token):
    try:
        report = SharedReport.objects.select_related('client').get(token=token, is_active=True)
    except SharedReport.DoesNotExist:
        return Response({'error': 'Report not found'}, status=404)

    if report.is_expired:
        return Response({'error': 'This report link has expired'}, status=410)

    if not report.is_password_protected:
        # No password needed — redirect to normal view
        SharedReport.objects.filter(pk=report.pk).update(
            view_count=F('view_count') + 1,
            last_viewed_at=timezone.now(),
        )
        data = _build_report_data(report)
        data['requires_password'] = False
        return Response(data)

    raw_password = request.data.get('password', '')
    if not report.verify_password(raw_password):
        return Response({'error': 'Incorrect password'}, status=401)

    SharedReport.objects.filter(pk=report.pk).update(
        view_count=F('view_count') + 1,
        last_viewed_at=timezone.now(),
    )
    data = _build_report_data(report)
    data['requires_password'] = False
    return Response(data)

