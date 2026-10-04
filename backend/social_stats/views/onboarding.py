# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
from rest_framework import viewsets
from rest_framework.response import Response


from social_stats.models import OnboardingStep
from social_stats.serializers.core import (
    OnboardingStepSerializer,
)

from .helpers import check_client_access


class OnboardingViewSet(viewsets.ModelViewSet):
    serializer_class = OnboardingStepSerializer
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_queryset(self):
        client_id = self.request.query_params.get('client')
        if client_id:
            if not check_client_access(self.request, client_id):
                return OnboardingStep.objects.none()
            return OnboardingStep.objects.filter(client_id=client_id)
        try:
            profile = self.request.user.profile
            if profile.role == 'superadmin':
                return OnboardingStep.objects.all()
            if profile.role == 'staff':
                return OnboardingStep.objects.filter(client__in=profile.assigned_clients.all())
            if profile.client_id:
                return OnboardingStep.objects.filter(client_id=profile.client_id)
        except Exception:
            pass
        return OnboardingStep.objects.none()

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        is_completed = request.data.get('is_completed')
        if is_completed is True or is_completed == 'true':
            instance.mark_complete(user=request.user)
        elif is_completed is False or is_completed == 'false':
            instance.is_completed = False
            instance.completed_at = None
            instance.completed_by = None
            instance.save(update_fields=['is_completed', 'completed_at', 'completed_by'])
        return Response(OnboardingStepSerializer(instance).data)

