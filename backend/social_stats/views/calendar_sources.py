"""Workspace-scoped read-only channel tracking configuration."""
from datetime import timedelta

from django.utils import timezone
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from social_stats.authorization import evaluate
from social_stats.instagram_calendar import normalize_username
from social_stats.models import CalendarSource, InstagramReaderSession
from social_stats.tenant_mixins import TenantScopedMixin


class CalendarSourceSerializer(serializers.ModelSerializer):
    username = serializers.CharField(max_length=300)
    reader_ready = serializers.SerializerMethodField()

    class Meta:
        model = CalendarSource
        fields = ['id', 'client', 'platform', 'username', 'is_active', 'last_synced_at',
                  'last_attempt_at', 'sync_status', 'error_code', 'reader_ready']
        read_only_fields = ['client', 'last_synced_at', 'last_attempt_at', 'sync_status', 'error_code']
        validators = []  # Workspace is stamped after validation; DB constraint is authoritative.

    def get_reader_ready(self, obj):
        return InstagramReaderSession.objects.filter(client_id=obj.client_id).exists()

    def validate_username(self, value):
        try:
            return normalize_username(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from None


class CalendarSourceViewSet(TenantScopedMixin, mixins.ListModelMixin, mixins.CreateModelMixin,
                            mixins.DestroyModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    queryset = CalendarSource.objects.select_related('client')
    serializer_class = CalendarSourceSerializer
    pagination_class = None

    def require_permission(self, workspace, action_name):
        if not evaluate(self.request.user, workspace, action_name).allowed:
            raise PermissionDenied('You cannot manage channel sources in this workspace.')

    def get_queryset(self):
        qs = super().get_queryset()
        allowed_ids = [source.pk for source in qs if evaluate(
            self.request.user, source.client, 'view_posts').allowed]
        return qs.filter(pk__in=allowed_ids)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        from social_stats.authorization import accessible_workspaces
        workspace = accessible_workspaces(request.user).filter(pk=self.resolved_client_id()).first()
        if not workspace:
            raise PermissionDenied('No workspace context available.')
        self.require_permission(workspace, 'connect_platforms')
        source, created = CalendarSource.objects.get_or_create(
            client=workspace, platform=serializer.validated_data.get('platform', 'instagram'),
            username=serializer.validated_data['username'],
        )
        return Response(self.get_serializer(source).data, status=201 if created else 200)

    def perform_destroy(self, instance):
        self.require_permission(instance.client, 'disconnect_platforms')
        instance.delete()

    @action(detail=True, methods=['post'])
    def sync(self, request, pk=None):
        source = self.get_object()
        self.require_permission(source.client, 'connect_platforms')
        if not InstagramReaderSession.objects.filter(client_id=source.client_id).exists():
            return Response({'error': 'session_required'}, status=409)
        if source.last_attempt_at and source.last_attempt_at > timezone.now() - timedelta(minutes=15):
            return Response({'error': 'cooldown'}, status=429)
        from social_stats.channel_calendar_tasks import sync_calendar_source
        try:
            sync_calendar_source.delay(source.id)
        except Exception:
            return Response({'error': 'queue_unavailable'}, status=503)
        return Response({'queued': True}, status=202)
