"""Authenticated administration endpoints for outbound API connectivity."""
from __future__ import annotations

from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

from .egress.health import probe_all_services, probe_gateway_health, probe_service
from .egress.registry import SERVICES


class EgressDiagnosticsThrottle(UserRateThrottle):
    # Each request performs real network probes. Keep the button useful without
    # allowing an authenticated browser to hammer third-party APIs continuously.
    rate = '20/hour'


def _is_operator(request) -> bool:
    try:
        return request.user.profile.role in ('superadmin', 'staff')
    except Exception:
        return bool(request.user.is_superuser or request.user.is_staff)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@throttle_classes([EgressDiagnosticsThrottle])
def egress_connectivity(request):
    """Run direct + gateway reachability checks without using user credentials.

    Query parameter ``service`` limits the check to one allowlisted service.
    This endpoint intentionally does not expose API_GATEWAY_KEY or credential
    material in the response.
    """
    if not _is_operator(request):
        return Response({'detail': 'Operator access required'}, status=403)

    service = (request.query_params.get('service') or '').strip()
    if service and service not in SERVICES:
        return Response({'detail': 'Unknown service'}, status=400)

    services = [probe_service(service)] if service else probe_all_services()
    gateway = probe_gateway_health()

    return Response({
        'checked_at': timezone.now().isoformat(),
        'gateway': gateway,
        'services': services,
    })
