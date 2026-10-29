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
from social_stats.brightdata_calendar import calendar_provider


class CalendarSourceSerializer(serializers.ModelSerializer):
    username = serializers.CharField(max_length=300)
    competitor_name = serializers.CharField(max_length=200, required=False, write_only=True, trim_whitespace=True)
    display_name = serializers.CharField(source='competitor.name', read_only=True, default='')
    is_competitor = serializers.SerializerMethodField()
    reader_ready = serializers.SerializerMethodField()
    provider = serializers.SerializerMethodField()
    publishing_ready = serializers.SerializerMethodField()
    public_data = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = CalendarSource
        fields = ['id', 'client', 'platform', 'username', 'is_active', 'last_synced_at',
                  'last_attempt_at', 'sync_status', 'error_code', 'reader_ready', 'provider', 'competitor_name', 'display_name', 'is_competitor', 'social_account', 'publishing_ready', 'permissions', 'public_data']
        read_only_fields = ['client', 'last_synced_at', 'last_attempt_at', 'sync_status', 'error_code', 'social_account']
        validators = []  # Workspace is stamped after validation; DB constraint is authoritative.

    def get_public_data(self, obj):
        from social_stats.public_monitoring import profile_summary
        return profile_summary(obj.public_profile)

    def get_permissions(self, obj):
        user = self.context['request'].user
        result = {}
        for action_name in ['connect_platforms', 'disconnect_platforms', 'publish_posts', 'schedule_posts']:
            decision = evaluate(user, obj.client, action_name, account=obj.social_account)
            result[action_name] = decision.allowed and (
                action_name in {'publish_posts', 'schedule_posts'} or not decision.requires_approval)
        return result

    def get_publishing_ready(self, obj):
        from social_stats.platforms.registry import get_provider
        from social_stats.platforms.account_health import connection_health
        account = obj.social_account
        credential = getattr(account, 'credential', None) if account else None
        provider = get_provider('instagram')
        if not account or not account.is_active or not connection_health(provider, credential).ready:
            return False
        scopes = set(credential.scope.split())
        return any(provider.manifest.capability(d.capability).enabled and
                   set(d.constraints.scopes) <= scopes for d in provider.manifest.publishing().values())

    def get_is_competitor(self, obj):
        return obj.competitor_id is not None

    def get_provider(self, obj):
        if obj.provider_snapshot_id:
            return 'brightdata'
        try:
            return calendar_provider()
        except Exception:
            return 'unavailable'

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
    queryset = CalendarSource.objects.select_related('client', 'competitor', 'social_account', 'social_account__credential', 'public_profile__profile_collection', 'public_profile__posts_collection')
    serializer_class = CalendarSourceSerializer
    pagination_class = None

    def require_permission(self, workspace, action_name):
        decision = evaluate(self.request.user, workspace, action_name)
        if not decision.allowed or decision.requires_approval:
            raise PermissionDenied('You cannot manage channel sources in this workspace.')

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get('include_inactive') != 'true':
            qs = qs.filter(is_active=True)
        allowed_ids = [source.pk for source in qs if evaluate(
            self.request.user, source.client, 'view_posts', account=source.social_account).allowed]
        return qs.filter(pk__in=allowed_ids)

    @transaction.atomic
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
            decision = evaluate(request.user, workspace, 'connect_platforms', account=source.social_account)
            if not decision.allowed or decision.requires_approval:
                raise PermissionDenied('Account permission denied.')
            name = serializer.validated_data.get('competitor_name')
            if name:
                competitor, _ = Competitor.objects.get_or_create(client=workspace, name=name)
                source.competitor = competitor
                source.save(update_fields=['competitor'])
                competitor.public_handles = {**competitor.public_handles, 'instagram': source.username}
                competitor.social_links = {**competitor.social_links,
                                           'instagram': f'https://www.instagram.com/{source.username}/'}
                competitor.save(update_fields=['public_handles', 'social_links'])
        if not source.is_active:
            source.is_active = True
            source.save(update_fields=['is_active'])
            from social_stats.watchlist import enqueue_source
            transaction.on_commit(lambda: enqueue_source(source.pk))
        from social_stats.watchlist import enroll_instagram
        source = enroll_instagram(workspace, source.username, competitor=source.competitor)
        return Response(self.get_serializer(source).data, status=201 if created else 200)

    def perform_destroy(self, instance):
        self.require_permission(instance.client, 'disconnect_platforms')
        decision = evaluate(self.request.user, instance.client, 'disconnect_platforms', account=instance.social_account)
        if not decision.allowed or decision.requires_approval:
            raise PermissionDenied('Account permission denied.')
        instance.is_active = False
        instance.save(update_fields=['is_active'])

    @action(detail=True, methods=['post'])
    def sync(self, request, pk=None):
        source = self.get_object()
        self.require_permission(source.client, 'connect_platforms')
        decision = evaluate(request.user, source.client, 'connect_platforms', account=source.social_account)
        if not decision.allowed or decision.requires_approval:
            raise PermissionDenied('Account permission denied.')
        if calendar_provider() != 'brightdata' and source.last_attempt_at and source.last_attempt_at > timezone.now() - timedelta(minutes=15):
            return Response({'error': 'cooldown'}, status=429)
        from social_stats.channel_calendar_tasks import sync_calendar_source
        try:
            sync_calendar_source.delay(source.id)
        except Exception:
            return Response({'error': 'queue_unavailable'}, status=503)
        return Response({'queued': True}, status=202)
