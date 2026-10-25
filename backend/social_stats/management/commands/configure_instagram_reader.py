"""Interactive operator login; passwords are never stored or passed as CLI arguments."""
import getpass
import json

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from social_stats.models import Client, InstagramReaderSession, CalendarSource


class Command(BaseCommand):
    help = 'Sign in interactively and store an encrypted Instagram reader session for a workspace.'

    def add_arguments(self, parser):
        parser.add_argument('--workspace', type=int, required=True)

    def handle(self, *args, **options):
        workspace_id = options['workspace']
        if not Client.objects.filter(pk=workspace_id).exists():
            raise CommandError('Workspace does not exist.')
        if InstagramReaderSession.objects.filter(client_id=workspace_id, locked_until__gt=timezone.now()).exists():
            raise CommandError('Reader is syncing. Wait before replacing its session.')
        try:
            from instagrapi.exceptions import TwoFactorRequired
        except ImportError:
            raise CommandError('Install backend requirements first.') from None
        from social_stats.instagram_calendar import new_gateway_reader, InstagramReadError
        try:
            reader = new_gateway_reader()
        except InstagramReadError:
            raise CommandError('Configure API_GATEWAY_URL and API_GATEWAY_KEY before login.') from None
        reader.with_challenge_flow = True  # Only this interactive operator command may request a code.
        username = input('Instagram reader username: ').strip()
        password = getpass.getpass('Instagram reader password: ')
        reader.challenge_code_handler = lambda *args, **kwargs: getpass.getpass('Instagram verification code: ')
        try:
            try:
                reader.login(username, password)
            except TwoFactorRequired:
                reader.login(username, password, verification_code=getpass.getpass('Two-factor code: '))
            if not reader.user_id:
                raise ValueError
            settings_json = json.dumps(reader.get_settings())
        except Exception:
            raise CommandError('Instagram login failed. Complete verification in Instagram before trying again.') from None
        finally:
            password = None
        InstagramReaderSession.objects.update_or_create(
            client_id=workspace_id, defaults={'settings_json': settings_json},
        )
        CalendarSource.objects.filter(client_id=workspace_id).update(sync_status='idle', error_code='')
        self.stdout.write(self.style.SUCCESS('Reader session saved in encrypted workspace storage.'))
