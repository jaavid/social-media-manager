from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from io import StringIO
import json
import os
from unittest import skipUnless
from unittest.mock import patch
import uuid

from celery import current_app
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import SimpleTestCase, TestCase, override_settings
from django.utils import timezone
from kombu import Connection

from social_stats import runtime_metrics as metrics
from social_stats.models import Client, SocialAccount, SyncLog
from social_stats.observability import request_id_context, task_id_context


class MetricsFailureTests(SimpleTestCase):
    def test_prometheus_histogram_is_contiguous_and_labels_are_escaped(self):
        values = {'states': {'SUCCESS': 1}, 'duration_seconds_sum': 2,
                  'duration_seconds_buckets': {'1': 0, '5': 1}}
        text = metrics.prometheus_snapshot({
            'enabled': True, 'tasks': {'publishing': values, 'analytics': values},
            'queues': {'queue"\\\nفارسی': 3}, 'providers': {},
        })
        histogram = text.split('# TYPE socialstats_task_duration_seconds histogram\n')[1].split('# TYPE ')[0]
        self.assertIn('socialstats_task_duration_seconds_count{family="publishing"} 1', histogram)
        self.assertIn('socialstats_task_duration_seconds_bucket{family="analytics",le="+Inf"} 1', histogram)
        self.assertNotIn('task_runs_total', histogram)
        self.assertIn('queue="queue\\"\\\\\\nفارسی"', text)

    @override_settings(RUNTIME_METRICS_ENABLED=True)
    @patch('social_stats.runtime_metrics.metrics_store', side_effect=RuntimeError('token=private-value'))
    def test_counter_failure_does_not_break_task_or_log_connection_credentials(self, store):
        with self.assertLogs(metrics.logger, level='WARNING') as logs:
            metrics.record_task('social_stats.tasks.sync_youtube', 'FAILURE', 1)
        self.assertNotIn('private-value', str(logs.output))

    @override_settings(RUNTIME_METRICS_ENABLED=False)
    @patch('social_stats.runtime_metrics.metrics_store')
    def test_disabled_metrics_do_not_connect(self, store):
        metrics.record_task('unknown.private-task', 'SUCCESS', 1)
        self.assertFalse(metrics.runtime_snapshot()['enabled'])
        store.assert_not_called()

    @override_settings(RUNTIME_METRICS_ENABLED=True)
    @patch('social_stats.runtime_metrics.task_metrics', side_effect=RuntimeError('private-value'))
    @patch('social_stats.runtime_metrics.queue_depths', return_value={'celery': 0})
    @patch('social_stats.runtime_metrics.provider_sync_metrics', return_value={})
    def test_outage_is_unavailable_not_zero_and_strict_export_fails(self, providers, queues, tasks):
        output = StringIO()
        with self.assertRaisesMessage(CommandError, 'Runtime metrics unavailable'):
            call_command('runtime_metrics', strict=True, stdout=output)
        data = json.loads(output.getvalue())
        self.assertFalse(data['tasks_available'])
        self.assertTrue(data['queues_available'])
        self.assertEqual(data['tasks'], {})
        self.assertNotIn('private-value', output.getvalue())
        text = metrics.prometheus_snapshot(data)
        self.assertIn('socialstats_runtime_metrics_available{source="tasks"} 0', text)
        self.assertNotIn('socialstats_task_runs_total{', text)


TEST_REDIS = os.environ.get('TEST_RUNTIME_METRICS_REDIS_URL')


@skipUnless(TEST_REDIS, 'Set TEST_RUNTIME_METRICS_REDIS_URL to a disposable Redis database')
@override_settings(RUNTIME_METRICS_ENABLED=True, RUNTIME_METRICS_REDIS_URL=TEST_REDIS,
                   CELERY_TASK_ALWAYS_EAGER=True, CELERY_TASK_EAGER_PROPAGATES=False)
class SharedRedisMetricsTests(SimpleTestCase):
    def setUp(self):
        self.prefix = 'test:metrics:' + uuid.uuid4().hex + ':'
        patcher = patch.object(metrics, 'PREFIX', self.prefix)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.store = metrics.metrics_store()
        self.addCleanup(self.store.delete, *(self.prefix + family for family in metrics.FAMILIES))

    def test_parallel_workers_accumulate_atomic_counts_and_latency_histogram(self):
        with ThreadPoolExecutor(max_workers=8) as pool:
            list(pool.map(lambda _: metrics.record_task(
                'social_stats.tasks.sync_youtube', 'FAILURE', 2.5), range(40)))
        values = metrics.task_metrics()['analytics']
        self.assertEqual(values['states']['FAILURE'], 40)
        self.assertEqual(values['duration_seconds_sum'], 100)
        self.assertEqual(values['duration_seconds_buckets']['1'], 0)
        self.assertEqual(values['duration_seconds_buckets']['5'], 40)
        metrics.record_task('unknown-private-name', 'unknown-private-state', 2)
        self.assertEqual(metrics.task_metrics()['other']['states']['OTHER'], 1)
        text = metrics.prometheus_snapshot({'enabled': True, 'tasks': metrics.task_metrics(),
                                           'queues': {}, 'providers': {}})
        self.assertNotIn('private', text)
        self.assertIn('# TYPE socialstats_task_duration_seconds histogram', text)

    def test_real_eager_lifecycle_records_success_retry_failure_and_restores_context(self):
        @current_app.task(name='tests.metrics.success')
        def success():
            return 'private-result'

        @current_app.task(name='tests.metrics.failure')
        def failure():
            raise ValueError('private-exception')

        @current_app.task(bind=True, name='tests.metrics.retry', max_retries=1)
        def retry(task):
            if not task.request.retries:
                raise task.retry(exc=ValueError('private-retry'))
            return 'private-result'

        for task in (success, failure, retry):
            self.addCleanup(current_app.tasks.pop, task.name, None)
        context = request_id_context.set('outer-context')
        try:
            self.assertEqual(success.delay().get(), 'private-result')
            self.assertTrue(failure.delay().failed())
            self.assertEqual(retry.delay().get(), 'private-result')
            self.assertEqual(request_id_context.get(), 'outer-context')
            self.assertIsNone(task_id_context.get())
        finally:
            request_id_context.reset(context)
        values = metrics.task_metrics()['other']
        self.assertEqual(values['states']['SUCCESS'], 2)
        self.assertEqual(values['states']['FAILURE'], 1)
        self.assertEqual(values['states']['RETRY'], 1)
        self.assertNotIn('private', json.dumps(values))

    def test_redis_queue_depth_includes_priorities_and_prefix_without_consuming(self):
        queue = 'test-queue-' + uuid.uuid4().hex
        prefix = 'test-broker-' + uuid.uuid4().hex + ':'
        connection = Connection(TEST_REDIS, transport_options={'global_keyprefix': prefix})
        with connection.channel() as channel:
            keys = [prefix + channel._q_for_pri(queue, priority) for priority in channel.priority_steps]
        self.addCleanup(self.store.delete, *keys)
        for key in keys:
            self.store.rpush(key, 'private-payload')
        with patch.object(current_app, 'connection_for_read', return_value=connection), \
             patch.object(current_app.amqp, 'queues', {queue: {}}):
            self.assertEqual(metrics.queue_depths(), {queue: len(keys)})
        self.assertEqual([self.store.llen(key) for key in keys], [1] * len(keys))


class ProviderSyncMetricsTests(TestCase):
    def setUp(self):
        self.workspace = Client.objects.create(name='private-workspace', email='private@example.test')
        self.other = Client.objects.create(name='other-private', email='other-private@example.test')
        self.now = timezone.now()
        self.fresh = self.account('fresh')
        self.stale = self.account('stale')
        self.never = self.account('never')
        self.account('disabled', is_active=False)

    def account(self, external_id, **kwargs):
        return SocialAccount.objects.create(client=self.workspace, platform='youtube',
                                            external_id=external_id, **kwargs)

    def log(self, account, status, finished, **kwargs):
        return SyncLog.objects.create(client=self.workspace, social_account=account, platform='youtube',
                                      status=status, finished_at=finished, error_message='private-token', **kwargs)

    def test_failures_and_staleness_are_per_account_and_cross_workspace_success_does_not_mask_them(self):
        self.log(self.fresh, 'success', self.now)
        self.log(self.stale, 'success', self.now - timedelta(days=2))
        self.log(self.stale, 'failed', self.now)
        # A legacy/inconsistent log must never make another workspace's account fresh.
        SyncLog.objects.create(client=self.other, social_account=self.never, platform='youtube',
                               status='success', finished_at=self.now)
        running = self.log(self.never, 'running', None)
        SyncLog.objects.filter(pk=running.pk).update(started_at=self.now - timedelta(days=2))
        report = metrics.provider_sync_metrics()['youtube']
        self.assertEqual(report['active_accounts'], 3)
        self.assertEqual(report['stale_accounts'], 2)
        self.assertEqual(report['recent_failed'], 1)
        self.assertEqual(report['in_progress'], 1)
        self.assertEqual(report['stuck'], 1)
        self.assertEqual(report['last_success_timestamp'], self.now.timestamp())
        self.assertNotIn('private', json.dumps(report))

    def test_no_sync_is_unknown_timestamp_and_inactive_workspace_is_excluded(self):
        self.workspace.is_active = False
        self.workspace.save(update_fields=['is_active'])
        report = metrics.provider_sync_metrics()['youtube']
        self.assertEqual(report['active_accounts'], 0)
        self.assertEqual(report['stale_accounts'], 0)
        self.assertIsNone(report['last_success_timestamp'])
