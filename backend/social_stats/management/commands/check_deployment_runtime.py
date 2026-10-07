"""Read-only deployment contracts for the running Django/Celery release."""
import json
from types import SimpleNamespace
import uuid

from celery import current_app
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.urls import resolve
from rest_framework.test import APIRequestFactory, force_authenticate


EVENT_TASKS = {
    'social_stats.events.publisher.dispatch_event',
    'social_stats.events.publisher.run_event_handler',
}


def oauth_endpoint_report():
    # Exercise the real URL resolver, DRF authorization and response contract.
    # The synthetic operator is never saved and needs no deployment credential.
    request = APIRequestFactory().get('/api/egress/connectivity/', {'mode': 'oauth'})
    force_authenticate(request, user=SimpleNamespace(
        pk='deployment-smoke-' + uuid.uuid4().hex, is_authenticated=True,
        profile=SimpleNamespace(role='staff'),
    ))
    try:
        response = resolve('/api/egress/connectivity/').func(request)
    except Exception as error:
        raise CommandError('OAuth readiness endpoint failed; check routing and server configuration.') from error
    if response.status_code != 200:
        raise CommandError('OAuth readiness endpoint failed; check operator access and routing.')
    oauth = response.data.get('oauth')
    if not isinstance(oauth, dict) or not oauth:
        raise CommandError('OAuth readiness endpoint returned an invalid report.')
    result = {}
    for provider, report in oauth.items():
        if not isinstance(report, dict) or type(report.get('configured')) is not bool:
            raise CommandError('OAuth readiness endpoint returned an invalid provider state.')
        # Do not print callback URLs, tokens, scopes, or unexpected response data.
        result[provider] = {'configured': report['configured']}
    return result


class Command(BaseCommand):
    help = 'Check OAuth endpoint and all expected tasks on every responding Celery worker.'

    def add_arguments(self, parser):
        parser.add_argument('--local-only', action='store_true',
                            help='CI source contracts only; does not verify running workers or DB schedules.')
        parser.add_argument('--timeout', type=float, default=10.0)
        parser.add_argument('--worker', action='append', default=[],
                            help='Require these worker names to respond; repeat for each expected worker.')
        parser.add_argument('--require-oauth', action='append', default=[],
                            help='Fail unless this canonical OAuth platform is configured; repeat as needed.')

    def handle(self, *args, **options):
        if not 0 < options['timeout'] <= 60:
            raise CommandError('--timeout must be between 0 and 60 seconds.')
        if options['local_only'] and options['worker']:
            raise CommandError('--worker requires a running-worker check.')
        current_app.loader.import_default_modules()
        current_app.autodiscover_tasks(force=True)
        expected = EVENT_TASKS | {
            entry['task'] for entry in settings.CELERY_BEAT_SCHEDULE.values()
        }
        if not options['local_only']:
            from django_celery_beat.models import PeriodicTask
            expected.update(PeriodicTask.objects.filter(enabled=True).values_list('task', flat=True))
        missing = expected - set(current_app.tasks)
        if missing:
            raise CommandError('Tasks missing from local release: ' + ', '.join(sorted(missing)))
        # Event-triggered feature tasks also need to be present on all workers.
        expected.update(name for name in current_app.tasks if name.startswith('social_stats.'))
        oauth = oauth_endpoint_report()
        for provider in options['require_oauth']:
            if provider not in oauth:
                raise CommandError(f'Unknown OAuth platform: {provider}')
            if not oauth[provider]['configured']:
                raise CommandError(f'OAuth not configured: {provider}; inspect server settings.')
        workers = {}
        if not options['local_only']:
            try:
                workers = current_app.control.inspect(
                    destination=options['worker'] or None, timeout=options['timeout'],
                ).registered()
            except Exception as error:
                raise CommandError('Cannot inspect Celery workers; check broker access.') from error
            if not workers:
                raise CommandError('No Celery workers responded; check broker and worker startup.')
            absent = set(options['worker']) - set(workers)
            if absent:
                raise CommandError('Workers did not respond: ' + ', '.join(sorted(absent)))
            for worker, tasks in workers.items():
                missing = expected - set(tasks)
                if missing:
                    raise CommandError(f'{worker}: missing tasks: ' + ', '.join(sorted(missing)))
        self.stdout.write(json.dumps({
            'mode': 'local-only' if options['local_only'] else 'running-workers',
            'expected_tasks': sorted(expected), 'workers_checked': sorted(workers), 'oauth': oauth,
        }, sort_keys=True))
