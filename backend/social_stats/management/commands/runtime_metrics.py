"""Export operational aggregates for operators and textfile collectors."""
import json

from django.core.management.base import BaseCommand, CommandError

from social_stats.runtime_metrics import prometheus_snapshot, runtime_snapshot


class Command(BaseCommand):
    help = 'Export secret-free task, Redis queue and provider sync metrics.'

    def add_arguments(self, parser):
        parser.add_argument('--format', choices=['json', 'prometheus'], default='json')
        parser.add_argument('--strict', action='store_true', help='Fail when any metric source is unavailable.')

    def handle(self, *args, **options):
        snapshot = runtime_snapshot()
        self.stdout.write(prometheus_snapshot(snapshot) if options['format'] == 'prometheus'
                          else json.dumps(snapshot, sort_keys=True))
        if options['strict'] and (not snapshot['enabled'] or any(
            not snapshot.get(source + '_available') for source in ('tasks', 'queues', 'providers')
        )):
            raise CommandError('Runtime metrics unavailable; check enabled setting, Redis, broker and database.')
