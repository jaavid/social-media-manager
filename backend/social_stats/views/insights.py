# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
from datetime import date, timedelta
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response


from social_stats.models import AIInsight, WeeklyTopPost
from social_stats.serializers.core import (
    AIInsightSerializer, WeeklyTopPostSerializer,
)

from .helpers import check_client_access


class AIInsightViewSet(viewsets.GenericViewSet):
    serializer_class = AIInsightSerializer

    def list(self, request):
        client_id = request.query_params.get('client')
        month     = request.query_params.get('month')
        year      = request.query_params.get('year')

        if not client_id:
            return Response({'error': 'client is required'}, status=400)
        if not check_client_access(request, client_id):
            return Response({'error': 'Access denied'}, status=403)

        qs = AIInsight.objects.filter(client_id=client_id)
        if month:
            qs = qs.filter(month=month)
        if year:
            qs = qs.filter(year=year)
        return Response(AIInsightSerializer(qs, many=True).data)

    @action(detail=False, methods=['post'], url_path='generate')
    def generate(self, request):
        """Superadmin/staff only — queues the Celery task."""
        try:
            role = request.user.profile.role
        except Exception:
            role = None
        if role not in ('superadmin', 'staff'):
            return Response({'error': 'Forbidden'}, status=403)

        client_id = request.data.get('client')
        month     = request.data.get('month', date.today().month)
        year      = request.data.get('year',  date.today().year)

        if not client_id:
            return Response({'error': 'client is required'}, status=400)

        from social_stats.tasks import generate_ai_insights
        generate_ai_insights.delay(int(client_id), int(month), int(year))
        return Response({'status': 'generating'})


class WeeklyTopPostViewSet(viewsets.GenericViewSet):
    serializer_class = WeeklyTopPostSerializer

    @staticmethod
    def _current_week_start():
        today = date.today()
        return today - timedelta(days=today.weekday())  # This Monday

    def list(self, request):
        client_id = request.query_params.get('client')
        week_str  = request.query_params.get('week')

        try:
            week_start = date.fromisoformat(week_str) if week_str else self._current_week_start()
        except ValueError:
            return Response({'error': 'Invalid week format (use YYYY-MM-DD)'}, status=400)

        if client_id:
            if not check_client_access(request, client_id):
                return Response({'error': 'Access denied'}, status=403)
            qs = WeeklyTopPost.objects.filter(
                client_id=client_id, week_start=week_start, rank=1
            ).select_related('post_metric', 'client')
        else:
            # Admin: all clients for this week
            try:
                if request.user.profile.role not in ('superadmin', 'staff'):
                    return Response({'error': 'client is required'}, status=400)
            except Exception:
                return Response({'error': 'client is required'}, status=400)
            qs = WeeklyTopPost.objects.filter(
                week_start=week_start, rank=1
            ).select_related('post_metric', 'client').order_by('-score')

        data = WeeklyTopPostSerializer(qs, many=True).data

        # Attach avg_score for "vs average" comparison per platform
        from django.db.models import Avg
        for item in data:
            avg = WeeklyTopPost.objects.filter(
                client_id=item['client'], platform=item['platform'], rank=1
            ).aggregate(v=Avg('score'))['v'] or 0
            item['avg_score'] = round(avg, 2)

        return Response(data)

    @action(detail=False, methods=['get'], url_path='all-time')
    def all_time(self, request):
        client_id = request.query_params.get('client')
        platform  = request.query_params.get('platform')

        if client_id:
            if not check_client_access(request, client_id):
                return Response({'error': 'Access denied'}, status=403)
            qs = WeeklyTopPost.objects.filter(client_id=client_id, rank=1)
        else:
            try:
                if request.user.profile.role not in ('superadmin', 'staff'):
                    return Response({'error': 'client is required'}, status=400)
            except Exception:
                return Response({'error': 'client is required'}, status=400)
            qs = WeeklyTopPost.objects.filter(rank=1)

        if platform:
            qs = qs.filter(platform=platform)
        qs = qs.select_related('post_metric', 'client').order_by('-score')[:10]
        return Response(WeeklyTopPostSerializer(qs, many=True).data)

    @action(detail=False, methods=['post'], url_path='run')
    def run(self, request):
        try:
            if request.user.profile.role not in ('superadmin', 'staff'):
                return Response({'error': 'Forbidden'}, status=403)
        except Exception:
            return Response({'error': 'Forbidden'}, status=403)
        from social_stats.tasks import find_best_posts
        find_best_posts.delay()
        return Response({'status': 'triggered'})

