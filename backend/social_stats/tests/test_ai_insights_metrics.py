from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from social_stats.ai.insights_views import _build_metrics_snapshot, _series_for_metric
from social_stats.models import Client, PostMetric


class InsightMetricTimestampTests(TestCase):
    def setUp(self):
        self.client_obj = Client.objects.create(
            name='AI metrics',
            company='AI Metrics',
            email='ai-metrics@example.test',
        )
        self.recent_at = timezone.now() - timedelta(days=2)
        PostMetric.objects.create(
            client=self.client_obj,
            platform='facebook',
            post_id='recent-post',
            published_at=self.recent_at,
            reach=120,
            impressions=300,
            likes=20,
            comments=5,
            shares=3,
        )
        PostMetric.objects.create(
            client=self.client_obj,
            platform='facebook',
            post_id='stale-post',
            published_at=timezone.now() - timedelta(days=120),
            reach=999,
            impressions=999,
        )

    def test_snapshot_filters_and_serializes_published_at(self):
        snapshot = _build_metrics_snapshot(self.client_obj, days=30)

        self.assertEqual(snapshot['total_posts'], 1)
        self.assertEqual(len(snapshot['top_posts']), 1)
        self.assertEqual(snapshot['top_posts'][0]['platform'], 'facebook')
        # `posted_at` is retained as the external snapshot key for prompt/API
        # compatibility, but its value must come from PostMetric.published_at.
        self.assertEqual(snapshot['top_posts'][0]['posted_at'], self.recent_at.isoformat())
        self.assertEqual(snapshot['totals_by_platform'][0]['reach'], 120)

    def test_series_groups_by_published_at(self):
        series = _series_for_metric(self.client_obj, 'reach', days=30, platform='facebook')

        self.assertEqual(series, [{
            'date': self.recent_at.date().isoformat(),
            'value': 120,
        }])
