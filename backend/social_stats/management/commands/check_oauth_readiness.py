"""Report OAuth provider readiness without exposing credential values."""
import json

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


YOUTUBE_SCOPES = [
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
    'openid',
    'email',
    'profile',
]


def google_readiness():
    required = {
        'GOOGLE_CLIENT_ID': getattr(settings, 'GOOGLE_CLIENT_ID', ''),
        'GOOGLE_CLIENT_SECRET': getattr(settings, 'GOOGLE_CLIENT_SECRET', ''),
        'GOOGLE_REDIRECT_URI': getattr(settings, 'GOOGLE_REDIRECT_URI', ''),
    }
    missing = [name for name, value in required.items() if not str(value or '').strip()]
    return {
        'provider': 'google',
        'youtube': {
            'configured': not missing,
            'missing': missing,
            'redirect_uri': str(required['GOOGLE_REDIRECT_URI'] or ''),
            'scopes': YOUTUBE_SCOPES,
            'required_apis': [
                'YouTube Data API v3',
                'YouTube Analytics API',
            ],
        },
    }


class Command(BaseCommand):
    help = 'Check Google/YouTube OAuth readiness without printing credential values.'

    def add_arguments(self, parser):
        parser.add_argument('--json', action='store_true', dest='as_json')
        parser.add_argument(
            '--strict',
            action='store_true',
            help='Exit non-zero when required OAuth settings are missing.',
        )

    def handle(self, *args, **options):
        report = google_readiness()
        youtube = report['youtube']

        if options['as_json']:
            self.stdout.write(json.dumps(report, ensure_ascii=False, sort_keys=True))
        else:
            state = 'READY' if youtube['configured'] else 'NOT READY'
            self.stdout.write(f'Google / YouTube OAuth: {state}')
            self.stdout.write(f"Redirect URI: {youtube['redirect_uri'] or '(missing)'}")
            self.stdout.write('Required APIs:')
            for api_name in youtube['required_apis']:
                self.stdout.write(f'  - {api_name}')
            self.stdout.write('Required scopes:')
            for scope in youtube['scopes']:
                self.stdout.write(f'  - {scope}')
            if youtube['missing']:
                self.stdout.write('Missing settings:')
                for name in youtube['missing']:
                    self.stdout.write(f'  - {name}')

        if options['strict'] and not youtube['configured']:
            raise CommandError('Google / YouTube OAuth is not ready.')
