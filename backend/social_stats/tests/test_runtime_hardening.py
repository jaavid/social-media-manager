from pathlib import Path

from django.conf import settings
from django.test import SimpleTestCase

from dashboard.celery import app as celery_app


class CeleryRegistrationTests(SimpleTestCase):
    """Catch beat/worker drift before production silently discards messages."""

    REQUIRED_MODULES = {
        'social_stats.notification_watchers',
        'social_stats.security.privacy_tasks',
        'social_stats.events.publisher',
    }
    REQUIRED_TASKS = {
        'social_stats.notification_watchers.run_smart_notifications',
        'social_stats.security.privacy_tasks.sweep_pending_deletions',
        'social_stats.events.publisher.dispatch_event',
    }

    def test_nonstandard_task_modules_are_imported_at_worker_startup(self):
        configured = set(celery_app.conf.imports or ())
        self.assertTrue(
            self.REQUIRED_MODULES <= configured,
            f'Missing Celery imports: {sorted(self.REQUIRED_MODULES - configured)}',
        )

    def test_previously_discarded_tasks_are_registered(self):
        # Mirrors worker initialization closely enough to prove the explicit
        # imports actually register the named shared tasks.
        celery_app.loader.import_default_modules()
        registered = set(celery_app.tasks.keys())
        self.assertTrue(
            self.REQUIRED_TASKS <= registered,
            f'Unregistered Celery tasks: {sorted(self.REQUIRED_TASKS - registered)}',
        )


class RuntimeProxyHardeningTests(SimpleTestCase):
    def setUp(self):
        self.repo_root = Path(settings.BASE_DIR).parent

    def test_internal_health_probe_cannot_trigger_https_redirect(self):
        nginx = (self.repo_root / 'docker/nginx.conf').read_text(encoding='utf-8')
        health_block = nginx.split('location = /healthz {', 1)[1].split('}', 1)[0]
        self.assertIn('proxy_set_header X-Forwarded-Proto https;', health_block)

    def test_access_logs_do_not_persist_query_strings(self):
        nginx = (self.repo_root / 'docker/nginx.conf').read_text(encoding='utf-8')
        supervisor = (self.repo_root / 'docker/supervisord.conf').read_text(encoding='utf-8')

        self.assertIn('\"path\":\"$uri\"', nginx)
        self.assertNotIn('$http_referer', nginx)
        self.assertNotIn('$http_user_agent', nginx)
        self.assertNotIn('$request_uri', nginx)
        self.assertIn('access_log /dev/stdout socialstats_safe;', nginx)
        self.assertIn('--access-log /dev/null', supervisor)
