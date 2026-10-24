"""Import an operator-created instagrapi settings file without exposing secrets over HTTP."""
import json
from pathlib import Path

from django.utils import timezone
from django.core.management.base import BaseCommand, CommandError
from social_stats.models import Client, InstagramReaderSession


class Command(BaseCommand):
    help = 'Import an existing instagrapi settings JSON into encrypted workspace storage.'

    def add_arguments(self, parser):
        parser.add_argument('--workspace', type=int, required=True)
        parser.add_argument('--settings-file', required=True)

    def handle(self, *args, **options):
        if not Client.objects.filter(pk=options['workspace']).exists():
            raise CommandError('Workspace does not exist.')
        try:
            raw = Path(options['settings_file']).read_text()
            data = json.loads(raw)
            if not isinstance(data, dict) or not (
                data.get('authorization_data', {}).get('sessionid') or data.get('cookies', {}).get('sessionid')
            ):
                raise ValueError
        except (OSError, ValueError, AttributeError):
            raise CommandError('A valid authenticated instagrapi settings JSON is required.') from None
        if InstagramReaderSession.objects.filter(client_id=options['workspace'], locked_until__gt=timezone.now()).exists():
            raise CommandError('Reader is syncing. Wait before replacing its session.')
        InstagramReaderSession.objects.update_or_create(
            client_id=options['workspace'], defaults={'settings_json': json.dumps(data)},
        )
        from social_stats.models import CalendarSource
        CalendarSource.objects.filter(client_id=options['workspace']).update(error_code='', sync_status='idle')
        self.stdout.write(self.style.SUCCESS('Reader session imported into encrypted storage.'))
