"""Workspace-scoped read-only channel tracking configuration."""
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from social_stats.authorization import evaluate
from social_stats.instagram_calendar import normalize_username
from social_stats.models import CalendarSource, InstagramReaderSession, Competitor, Client
from social_stats.tenant_mixins import TenantScopedMixin


class CalendarSourceSerializer(serializers.ModelSerializer):
    username = serializers.CharField(max_length=300)
    competitor_name = serializers.CharField(max_length=200, required=False, write_only=True, trim_whitespace=True)
    display_name = serializers.CharField(source='competitor.name', read_only=True, default='')
    is_competitor = serializers.SerializerMethodField()
    reader_ready = serializers.SerializerMethodField()

    class Meta:
        model = CalendarSource
        fields = ['id', 'client', 'platform', 'username', 'is_active', 'last_synced_at',
                  'last_attempt_at', 'sync_status', 'error_code', 'reader_ready', 'competitor_name', 'display_name', 'is_competitor']
        read_only_fields = ['client', 'last_synced_at', 'last_attempt_at', 'sync_status', 'error_code']
        validators = []  # Workspace is stamped after validation; DB constraint is authoritative.

    def get_is_competitor(self, obj):
        return obj.competitor_id is not None

    def get_reader_ready(self, obj):
        session = InstagramReaderSession.objects.filter(client_id=obj.client_id).first()
        return bool(session and session.settings_json)

    def validate_username(self, value):
        try:
            return normalize_username(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from None


class CalendarSourceViewSet(TenantScopedMixin, mixins.ListModelMixin, mixins.CreateModelMixin,
                            mixins.DestroyModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    queryset = CalendarSource.objects.select_related('client', 'competitor')
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
        with transaction.atomic():
            # Serialize source/competitor creation within the workspace.
            Client.objects.select_for_update().get(pk=workspace.pk)
            source, created = CalendarSource.objects.get_or_create(
                client=workspace, platform=serializer.validated_data.get('platform', 'instagram'),
                username=serializer.validated_data['username'],
            )
            name = serializer.validated_data.get('competitor_name')
            if name:
                competitor, _ = Competitor.objects.get_or_create(client=workspace, name=name)
                source.competitor = competitor
                source.save(update_fields=['competitor'])
                competitor.public_handles = {**competitor.public_handles, 'instagram': source.username}
                competitor.social_links = {**competitor.social_links,
                                           'instagram': f'https://www.instagram.com/{source.username}/'}
                competitor.save(update_fields=['public_handles', 'social_links'])
        return Response(self.get_serializer(source).data, status=201 if created else 200)

    def perform_destroy(self, instance):
        self.require_permission(instance.client, 'disconnect_platforms')
        instance.delete()

    @action(detail=True, methods=['post'])
    def sync(self, request, pk=None):
        source = self.get_object()
        self.require_permission(source.client, 'connect_platforms')
        if source.last_attempt_at and source.last_attempt_at > timezone.now() - timedelta(minutes=15):
            return Response({'error': 'cooldown'}, status=429)
        from social_stats.channel_calendar_tasks import sync_calendar_source
        try:
            sync_calendar_source.delay(source.id)
        except Exception:
            return Response({'error': 'queue_unavailable'}, status=503)
        return Response({'queued': True}, status=202)
