# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""Serializers for the competitor tracking module."""
from rest_framework import serializers

from social_stats.models import Competitor, CompetitorSnapshot


class CompetitorSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompetitorSnapshot
        fields = [
            'id', 'competitor', 'platform', 'date',
            'followers', 'posts_count', 'engagement_rate',
            'avg_likes', 'avg_comments', 'sample_top_posts',
            'created_at',
        ]
        read_only_fields = fields


class CompetitorSerializer(serializers.ModelSerializer):
    latest_snapshots = serializers.SerializerMethodField()
    public_data = serializers.SerializerMethodField()
    follower_history = serializers.SerializerMethodField()

    def get_follower_history(self, obj):
        history = dict(obj.follower_history or {})
        from social_stats.public_monitoring import can_read_competitor_instagram
        request = self.context.get('request')
        if request and not can_read_competitor_instagram(request.user, obj):
            history.pop('instagram', None)
        return history

    def get_public_data(self, obj):
        from social_stats.public_monitoring import profile_summary
        from social_stats.authorization import evaluate
        request = self.context.get('request')
        for source in obj.calendar_sources.filter(is_active=True).select_related('public_profile__profile_collection', 'public_profile__posts_collection', 'social_account'):
            if request and evaluate(request.user, obj.client, 'view_posts', account=source.social_account).allowed:
                return profile_summary(source.public_profile)
        return None

    class Meta:
        model = Competitor
        fields = [
            'id', 'client',
            'name', 'social_links', 'public_handles',
            'follower_history', 'last_synced_at',
            'created_at',
            'latest_snapshots', 'public_data',
        ]
        read_only_fields = ['follower_history', 'last_synced_at',
                            'created_at', 'latest_snapshots']
        extra_kwargs = {
            'client': {'required': False, 'read_only': True},
        }

    def get_latest_snapshots(self, obj):
        """Most recent snapshot per platform."""
        from django.db.models import Max
        # One row per platform — latest by date
        latest = (CompetitorSnapshot.objects
                  .filter(competitor=obj)
                  .values('platform')
                  .annotate(max_date=Max('date')))
        if not latest:
            return []
        keys = [(row['platform'], row['max_date']) for row in latest]
        rows = CompetitorSnapshot.objects.filter(
            competitor=obj,
            platform__in=[k[0] for k in keys],
            date__in=[k[1] for k in keys],
        )
        from social_stats.public_monitoring import can_read_competitor_instagram
        request = self.context.get('request')
        if request and not can_read_competitor_instagram(request.user, obj):
            rows = rows.exclude(platform='instagram')
        return CompetitorSnapshotSerializer(rows, many=True).data
