# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from django.db.models import F
from django.utils import timezone

from social_stats.models import SharedReport
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
        from social_stats.authorization import evaluate, acting_context
        from social_stats.models import SocialAccount
        visible = []
        for shared in qs:
            ids = shared.social_account_ids
            if not ids:
                if (shared.created_by_id == self.request.user.pk or acting_context(self.request.user, shared.client)[0] == 'superadmin') and evaluate(self.request.user, shared.client, 'generate_reports').allowed:
                    visible.append(shared.pk)
                continue
            accounts = list(SocialAccount.objects.filter(client=shared.client, pk__in=ids))
            if len(accounts) == len(set(ids)) and all(evaluate(self.request.user, shared.client, action, account=account).allowed
                for account in accounts for action in ('view_analytics', 'generate_reports')):
                visible.append(shared.pk)
        return qs.filter(pk__in=visible).order_by('-created_at')

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


def _build_report_data(shared):
    """A share freezes account scope; metric meanings remain provider-owned."""
    from social_stats.models import SocialAccount
    from social_stats.authorization import evaluate
    from social_stats.platforms.analytics import report
    from social_stats.platforms.base import ProviderError
    actor = shared.created_by
    reports = []
    available = bool(shared.social_account_ids) and actor is not None and actor.is_active
    accounts = SocialAccount.objects.filter(client=shared.client, pk__in=shared.social_account_ids or [])
    if available and accounts.count() != len(set(shared.social_account_ids)):
        available = False
    for account in accounts if available else []:
        if not evaluate(actor, shared.client, 'view_analytics', account=account).allowed or not evaluate(actor, shared.client, 'generate_reports', account=account).allowed:
            available = False; reports = []; break
        try:
            data = report(account, shared.date_from, shared.date_until)
            data = report(account, shared.date_from, shared.date_until, 1, max(1, data['pagination']['count']))
            reports.append(data)
        except ProviderError:
            from rest_framework.exceptions import APIException
            error = APIException('Report data could not be loaded', code='invalid_response')
            error.status_code = 502
            raise error from None
    return {'version': 2, 'availability': 'available' if available else 'unavailable',
        'client': {'name': shared.client.company},
        'period': {'from': shared.date_from.isoformat(), 'until': shared.date_until.isoformat()},
        'reports': reports}


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

