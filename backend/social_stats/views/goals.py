# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
from datetime import date, timedelta
from django.db.models import Sum
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


from social_stats.models import DailyMetric, ClientGoal, Alert
from social_stats.serializers.core import (
    ClientGoalSerializer,
    AlertSerializer,
)

from .helpers import _agency_client_ids, check_client_access


class GoalViewSet(viewsets.ModelViewSet):
    serializer_class = ClientGoalSerializer

    def get_queryset(self):
        client_ids = _agency_client_ids(self.request)
        client_id  = self.request.query_params.get('client')
        month      = self.request.query_params.get('month')
        year       = self.request.query_params.get('year')
        qs = ClientGoal.objects.select_related('client').filter(client_id__in=client_ids)
        if client_id:
            qs = qs.filter(client_id=client_id)
        if month:
            qs = qs.filter(month=month)
        if year:
            qs = qs.filter(year=year)
        return qs

    def perform_create(self, serializer):
        from rest_framework.exceptions import PermissionDenied
        try:
            role = self.request.user.profile.role
        except Exception:
            role = None
        if role not in ('superadmin', 'staff', 'client'):
            raise PermissionDenied()
        # Tenant guard: the goal's client must be one this user can access.
        client = serializer.validated_data.get('client')
        if not client or client.id not in _agency_client_ids(self.request):
            raise PermissionDenied('You cannot create goals for this client.')
        serializer.save()

    def perform_update(self, serializer):
        from rest_framework.exceptions import PermissionDenied
        try:
            profile = self.request.user.profile
            role = profile.role
        except Exception:
            role = None
            profile = None
        # Never allow moving a goal to a client outside the user's tenant.
        new_client = serializer.validated_data.get('client')
        if new_client and new_client.id not in _agency_client_ids(self.request):
            raise PermissionDenied('You cannot move goals to this client.')
        # Allow client to update their own record
        if role == 'client' and profile and profile.client_id == serializer.instance.client_id:
            serializer.save()
            return
        if role not in ('superadmin', 'staff'):
            raise PermissionDenied()
        serializer.save()

    def perform_destroy(self, instance):
        try:
            role = self.request.user.profile.role
        except Exception:
            role = None
        if role not in ('superadmin', 'staff'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied()
        instance.delete()

    @action(detail=False, methods=['get'], url_path='progress')
    def progress(self, request):
        client_id = request.query_params.get('client')
        month     = int(request.query_params.get('month', date.today().month))
        year      = int(request.query_params.get('year',  date.today().year))

        if not client_id:
            return Response({'error': 'client is required'}, status=400)
        if not check_client_access(request, client_id):
            return Response({'error': 'Access denied'}, status=403)

        goals = ClientGoal.objects.filter(client_id=client_id, month=month, year=year)

        since = date(year, month, 1)
        if month == 12:
            month_end = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(year, month + 1, 1) - timedelta(days=1)
        until = min(month_end, date.today())

        today = date.today()
        month_passed = today > month_end

        results = []
        for goal in goals:
            qs = DailyMetric.objects.filter(client_id=client_id, date__range=(since, until))
            if goal.platform != 'all':
                qs = qs.filter(platform=goal.platform)

            agg     = qs.aggregate(current=Sum(goal.metric))
            current = agg['current'] or 0
            pct     = round(current / goal.target_value * 100, 1) if goal.target_value > 0 else 0

            if current >= goal.target_value:
                goal_status = 'completed'
            elif month_passed:
                goal_status = 'missed'
            elif pct >= 80:
                goal_status = 'on_track'
            else:
                goal_status = 'at_risk'

            results.append({
                'id':            goal.id,
                'platform':      goal.platform,
                'metric':        goal.metric,
                'target_value':  goal.target_value,
                'current_value': current,
                'percentage':    min(pct, 100),
                'status':        goal_status,
                'month':         goal.month,
                'year':          goal.year,
            })

        return Response(results)


class AlertViewSet(viewsets.ModelViewSet):
    serializer_class   = AlertSerializer
    permission_classes = [IsAuthenticated]
    http_method_names  = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        try:
            self.request.user.profile
        except Exception:
            return Alert.objects.none()

        client_ids = _agency_client_ids(self.request)
        qs = Alert.objects.select_related('client').filter(client_id__in=client_ids)

        client_id = self.request.query_params.get('client')
        is_read   = self.request.query_params.get('is_read')
        if client_id:
            qs = qs.filter(client_id=client_id)
        if is_read is not None:
            qs = qs.filter(is_read=(is_read.lower() == 'true'))
        return qs

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        alert = self.get_object()
        alert.is_read = True
        alert.save(update_fields=['is_read'])
        return Response({'status': 'ok'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        qs = self.get_queryset().filter(is_read=False)
        client_id = request.query_params.get('client')
        if client_id:
            qs = qs.filter(client_id=client_id)
        qs.update(is_read=True)
        return Response({'status': 'ok'})

    @action(detail=False, methods=['post'], url_path='run_check')
    def run_check(self, request):
        """Manually trigger the alert check (admin only)."""
        try:
            if request.user.profile.role not in ('superadmin', 'staff'):
                return Response({'error': 'Forbidden'}, status=403)
        except Exception:
            return Response({'error': 'Forbidden'}, status=403)
        from social_stats.tasks import check_alerts
        check_alerts.delay()
        return Response({'status': 'check triggered'})

