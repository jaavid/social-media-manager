"""Explicit one-record collection or read-only SDK snapshot verification; no DB writes."""
import json

from django.core.management.base import BaseCommand, CommandError

from social_stats.brightdata_calendar import download_snapshot, normalize_posts, snapshot_owner, start_discovery
from social_stats.instagram_calendar import InstagramReadError, normalize_username


class Command(BaseCommand):
    help = 'Test the real SDK through Cloudflare. --collect submits ONE bounded job; --snapshot only reads an existing job.'

    def add_arguments(self, parser):
        group = parser.add_mutually_exclusive_group(required=True)
        group.add_argument('--collect', metavar='USERNAME')
        group.add_argument('--snapshot', metavar='SNAPSHOT_ID')
        parser.add_argument('--username', help='Expected snapshot owner (optional).')

    def handle(self, *args, **options):
        try:
            if options['collect']:
                username = normalize_username(options['collect'])
                snapshot = start_discovery(username, amount=1)
                result = {'status': 'submitted', 'snapshot_id': snapshot, 'max_provider_records': 1}
            else:
                rows = download_snapshot(options['snapshot'])
                if rows is None:
                    result = {'status': 'processing'}
                elif rows == []:
                    result = {'status': 'empty', 'post_count': 0, 'content_confirmed': False}
                else:
                    if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
                        raise InstagramReadError('brightdata_invalid_response')
                    owner = normalize_username(options['username'] or snapshot_owner(rows))
                    posts = normalize_posts(rows, owner)
                    result = {'status': 'content_verified', 'post_count': len(posts), 'content_confirmed': True,
                              'posts': [{'post_url': post['post_url'], 'published_at': post['published_at'].isoformat()}
                                        for post in posts[:5]]}
        except InstagramReadError as error:
            raise CommandError(error.code) from None
        except ValueError:
            raise CommandError('Invalid Instagram username.') from None
        self.stdout.write(json.dumps(result, ensure_ascii=False))
