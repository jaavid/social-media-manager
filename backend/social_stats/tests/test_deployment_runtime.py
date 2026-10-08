from io import StringIO
import json
from unittest.mock import patch

from celery import current_app
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings
from django_celery_beat.models import PeriodicTask

from social_stats.management.commands.check_deployment_runtime import oauth_endpoint_report


class DeploymentRuntimeTests(TestCase):
    def setUp(self):
        current_app.loader.import_default_modules()
        current_app.autodiscover_tasks(force=True)

    def run_check(self, **options):
        output = StringIO()
        call_command('check_deployment_runtime', stdout=output, **options)
        return json.loads(output.getvalue())

    def test_local_contract_loads_every_beat_and_event_task(self):
        report = self.run_check(local_only=True)
        for name in (
            'social_stats.events.publisher.run_event_handler',
            'social_stats.competitor_tasks.snapshot_competitors',
            'social_stats.meta_capi_tasks.sync_active_ctwa_campaigns',
            'social_stats.security.platform_compliance_tasks.process_platform_deletion_task',
            'social_stats.bot_webhook_tasks.dispatch_webhook',
            'social_stats.bot_engine.handlers.timed.resume_bot_conversation',
        ):
            self.assertIn(name, report['expected_tasks'])
        self.assertEqual(report['workers_checked'], [])
        self.assertIn('facebook', report['oauth'])
        self.assertIn('linkedin', report['oauth'])

    @override_settings(CELERY_BEAT_SCHEDULE={'new': {'task': 'missing.beat.task'}})
    def test_source_drift_fails_before_worker_inspection(self):
        with self.assertRaisesMessage(CommandError, 'missing.beat.task'):
            self.run_check(local_only=True)

    @patch('social_stats.management.commands.check_deployment_runtime.current_app.control.inspect')
    def test_each_worker_must_register_event_tasks(self, inspect):
        complete = list(current_app.tasks)
        event = 'social_stats.events.publisher.run_event_handler'
        inspect.return_value._request.return_value = {
            'healthy': complete, 'broken': [name for name in complete if name != event],
        }
        with self.assertRaisesMessage(CommandError, f'broken: missing tasks: {event}'):
            self.run_check()

    @patch('social_stats.management.commands.check_deployment_runtime.current_app.control.inspect')
    def test_no_response_missing_worker_and_broker_error_fail_safely(self, inspect):
        inspect.return_value._request.return_value = None
        with self.assertRaisesMessage(CommandError, 'No Celery workers responded'):
            self.run_check()
        inspect.return_value._request.return_value = {'healthy': list(current_app.tasks)}
        with self.assertRaisesMessage(CommandError, 'Workers did not respond: absent'):
            self.run_check(worker=['healthy', 'absent'])
        inspect.return_value._request.side_effect = RuntimeError('redis://user:private-value@host')
        with self.assertRaisesMessage(CommandError, 'Cannot inspect Celery workers') as error:
            self.run_check()
        self.assertNotIn('private-value', str(error.exception))

    @patch('social_stats.management.commands.check_deployment_runtime.current_app.control.inspect')
    def test_enabled_database_schedule_checked_and_disabled_ignored(self, inspect):
        PeriodicTask.objects.create(name='enabled', task='missing.enabled.task', interval_id=None,
                                    one_off=True, clocked=self._clocked())
        with self.assertRaisesMessage(CommandError, 'missing.enabled.task'):
            self.run_check()
        PeriodicTask.objects.update(enabled=False)
        inspect.return_value._request.return_value = {'healthy': list(current_app.tasks)}
        self.assertEqual(self.run_check()['workers_checked'], ['healthy'])
        inspect.return_value._request.assert_called_with('registered', builtins=True)

    def _clocked(self):
        from django.utils import timezone
        from django_celery_beat.models import ClockedSchedule
        return ClockedSchedule.objects.create(clocked_time=timezone.now())

    @override_settings(META_APP_ID='private-id', META_APP_SECRET='private-secret',
                       META_REDIRECT_URI='https://callback.invalid/?private-data',
                       LINKEDIN_CLIENT_ID='', LINKEDIN_CLIENT_SECRET='')
    def test_endpoint_report_allowlists_configuration_boolean_only(self):
        report = self.run_check(local_only=True, require_oauth=['facebook'])
        self.assertEqual(report['oauth']['facebook'], {'configured': True})
        self.assertNotIn('private-', json.dumps(report))
        with self.assertRaisesMessage(CommandError, 'OAuth not configured: linkedin'):
            self.run_check(local_only=True, require_oauth=['linkedin'])
        with self.assertRaisesMessage(CommandError, 'Unknown OAuth platform'):
            self.run_check(local_only=True, require_oauth=['invalid'])

    @patch('social_stats.management.commands.check_deployment_runtime.resolve')
    def test_broken_endpoint_or_invalid_envelope_is_not_ready(self, resolve):
        response = resolve.return_value.func.return_value
        response.status_code = 403
        with self.assertRaisesMessage(CommandError, 'OAuth readiness endpoint failed'):
            oauth_endpoint_report()
        response.status_code = 200
        for data in ({'oauth': {}}, {'oauth': {'youtube': {'configured': 'yes'}}}):
            response.data = data
            with self.assertRaises(CommandError):
                oauth_endpoint_report()

    @patch('social_stats.management.commands.check_deployment_runtime.current_app.control.inspect')
    def test_builtin_cleanup_is_required_on_running_worker(self, inspect):
        PeriodicTask.objects.create(name='cleanup', task='celery.backend_cleanup',
                                    one_off=True, clocked=self._clocked())
        inspect.return_value._request.return_value = {
            'worker': [name for name in current_app.tasks if name != 'celery.backend_cleanup'],
        }
        with self.assertRaisesMessage(CommandError, 'missing tasks: celery.backend_cleanup'):
            self.run_check()
        inspect.return_value._request.assert_called_once_with('registered', builtins=True)
        inspect.return_value._request.return_value = {'worker': list(current_app.tasks)}
        self.assertEqual(self.run_check()['workers_checked'], ['worker'])
