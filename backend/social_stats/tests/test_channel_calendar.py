from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.contrib.auth.models import User
from django.db import connection
from django.test import TestCase, SimpleTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from social_stats.instagram_calendar import fetch_public_posts, normalize_username, InstagramReadError
from social_stats.models import (
    Client, UserProfile, CalendarSource, ChannelCalendarPost, InstagramReaderSession,
)
from social_stats.channel_calendar_tasks import sync_calendar_source


class AdapterTests(SimpleTestCase):
    def test_profile_urls_and_reject_untrusted_hosts(self):
        self.assertEqual(normalize_username('https://www.instagram.com/Example/?hl=en'), 'example')
        for value in ['https://evil.test/example', 'https://instagram.com/p/abc', '@bad..name',
                      'http://instagram.com/example', 'https://instagram.com:99/example']:
            with self.assertRaises(ValueError):
                normalize_username(value)

    def test_private_profile_rejected_even_if_reader_follows_it(self):
        reader = MagicMock()
        reader.user_info_by_username_v1.return_value.is_private = True
        with self.assertRaises(InstagramReadError) as error:
            fetch_public_posts(reader, 'example')
        self.assertEqual(error.exception.code, 'private_profile')
        reader.user_medias_v1.assert_not_called()

    def test_unknown_metrics_remain_absent_and_counts_are_not_invented(self):
        reader = MagicMock()
        reader.user_info_by_username_v1.return_value = SimpleNamespace(pk='1', is_private=False)
        reader.user_medias_v1.return_value = [SimpleNamespace(
            pk='11', taken_at=timezone.now(), code='abc', media_type=8, product_type='',
            caption_text='hello', thumbnail_url=None, like_count=0, comment_count=2,
            view_count=None, like_and_view_counts_disabled=False,
        )]
        post = fetch_public_posts(reader, 'example')[0]
        self.assertEqual(post['metrics'], {'likes': 0, 'comments': 2})
        self.assertEqual(post['post_type'], 'carousel')

    def test_sdk_errors_do_not_leak_credentials(self):
        reader = MagicMock()
        reader.user_info_by_username_v1.side_effect = type('ChallengeRequired', (Exception,), {})('sessionid=secret')
        with self.assertRaises(InstagramReadError) as error:
            fetch_public_posts(reader, 'example')
        self.assertEqual(str(error.exception), 'challenge_required')


class ChannelCalendarTests(TestCase):
    def setUp(self):
        self.workspace = Client.objects.create(name='test', company='test', email='test@example.test')
        self.other = Client.objects.create(name='other', company='other', email='other@example.test')
        self.user = User.objects.create_user(username='reader', password='test')
        UserProfile.objects.create(user=self.user, role='client', client=self.workspace)
        self.api = APIClient()
        self.api.force_authenticate(self.user)
        self.source = CalendarSource.objects.create(client=self.workspace, username='example')
        self.session = InstagramReaderSession.objects.create(client=self.workspace, settings_json='{"secret":"session"}')

    def test_workspace_isolation_and_session_not_exposed(self):
        other_source = CalendarSource.objects.create(client=self.other, username='other')
        response = self.api.get('/api/calendar/sources/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row['id'] for row in response.data], [self.source.id])
        self.assertNotIn('session', response.data[0])
        response = self.api.post(f'/api/calendar/sources/{other_source.pk}/sync/')
        self.assertEqual(response.status_code, 404)
        response = self.api.post('/api/calendar/sources/', {'client': self.other.pk, 'username': 'third'}, format='json')
        self.assertEqual(response.status_code, 403)

    def test_add_source_normalizes_and_is_idempotent(self):
        response = self.api.post('/api/calendar/sources/', {
            'client': self.workspace.pk, 'username': '@EXAMPLE', 'platform': 'instagram',
        }, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(CalendarSource.objects.count(), 1)

    def test_encrypted_storage(self):
        with connection.cursor() as cursor:
            cursor.execute('SELECT settings_json FROM social_stats_instagramreadersession WHERE id=%s', [self.session.pk])
            raw = cursor.fetchone()[0]
        self.assertTrue(raw.startswith('enc::'))
        self.assertNotIn('session', raw)

    @patch('social_stats.channel_calendar_tasks.build_reader')
    @patch('social_stats.channel_calendar_tasks.fetch_public_posts')
    def test_sync_upserts_and_retains_content_on_failure(self, fetch, build):
        build.return_value.get_settings.return_value = {'authorization_data': {'sessionid': 'secret'}}
        data = {'external_id': '1', 'caption': 'post', 'post_type': 'image', 'post_url': 'https://www.instagram.com/p/a/',
                'media_url': '', 'published_at': timezone.now(), 'metrics': {'likes': 2}}
        fetch.side_effect = lambda *args, **kwargs: [dict(data)]
        sync_calendar_source(self.source.pk)
        self.assertEqual(ChannelCalendarPost.objects.count(), 1)
        CalendarSource.objects.filter(pk=self.source.pk).update(last_attempt_at=timezone.now() - timedelta(hours=1))
        data['metrics'] = {'likes': 5}
        sync_calendar_source(self.source.pk)
        self.assertEqual(ChannelCalendarPost.objects.get().metrics['likes'], 5)
        CalendarSource.objects.filter(pk=self.source.pk).update(last_attempt_at=timezone.now() - timedelta(hours=1))
        fetch.side_effect = InstagramReadError('challenge_required')
        sync_calendar_source(self.source.pk)
        self.assertEqual(ChannelCalendarPost.objects.count(), 1)
        self.source.refresh_from_db()
        self.assertEqual(self.source.error_code, 'challenge_required')
        response = self.api.get('/api/calendar/posts/', {'client_id': self.workspace.pk,
                                'month': data['published_at'].month, 'year': data['published_at'].year})
        self.assertEqual(response.status_code, 200, response.data)
        post = next(iter(response.data.values()))[0]
        self.assertTrue(post['is_external'])
        self.assertIsNone(post['impressions'])
        self.assertEqual(post['likes'], 5)

    @patch('social_stats.channel_calendar_tasks.build_reader')
    def test_active_reader_lease_prevents_parallel_calls(self, build):
        self.session.locked_until = timezone.now() + timedelta(minutes=2)
        self.session.save()
        sync_calendar_source(self.source.pk)
        build.assert_not_called()

    def test_profile_url_can_exceed_username_field_length(self):
        response = self.api.post('/api/calendar/sources/', {
            'client': self.workspace.pk,
            'username': 'https://www.instagram.com/another.example/?hl=en',
        }, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['username'], 'another.example')

    def test_invalid_channel_filter_returns_validation_error(self):
        response = self.api.get('/api/calendar/posts/', {
            'client_id': self.workspace.pk, 'source_id': 'invalid',
        })
        self.assertEqual(response.status_code, 400)

    @patch('social_stats.channel_calendar_tasks.sync_calendar_source.delay')
    def test_anonymous_sync_can_be_queued_without_a_reader_session(self, delay):
        self.session.delete()
        response = self.api.post(f'/api/calendar/sources/{self.source.pk}/sync/')
        self.assertEqual(response.status_code, 202)
        delay.assert_called_once_with(self.source.pk)

    @patch('social_stats.channel_calendar_tasks.sync_calendar_source.delay')
    def test_cooldown_blocks_repeated_queueing(self, delay):
        self.source.last_attempt_at = timezone.now()
        self.source.save()
        response = self.api.post(f'/api/calendar/sources/{self.source.pk}/sync/')
        self.assertEqual(response.status_code, 429)
        delay.assert_not_called()

    def test_add_named_competitor_uses_workspace_and_reuses_source(self):
        from social_stats.models import Competitor
        payload = {'client': self.workspace.pk, 'username': '@rival', 'competitor_name': 'Rival'}
        first = self.api.post('/api/calendar/sources/', payload, format='json')
        self.assertEqual(first.status_code, 201, first.data)
        self.assertTrue(first.data['is_competitor'])
        self.assertEqual(first.data['display_name'], 'Rival')
        second = self.api.post('/api/calendar/sources/', payload, format='json')
        self.assertEqual(second.status_code, 200, second.data)
        self.assertEqual(first.data['id'], second.data['id'])
        competitor = Competitor.objects.get(client=self.workspace, name='Rival')
        self.assertEqual(competitor.public_handles['instagram'], 'rival')
        source = CalendarSource.objects.get(pk=first.data['id'])
        self.assertEqual(source.competitor_id, competitor.pk)
        ChannelCalendarPost.objects.create(source=source, external_id='rival1', caption='Rival post',
            post_type='image', post_url='https://www.instagram.com/p/rival1/', published_at=timezone.now())
        response = self.api.get('/api/calendar/posts/', {'client_id': self.workspace.pk})
        post = next(iter(response.data.values()))[0]
        self.assertTrue(post['is_competitor'])
        self.assertEqual(post['source_name'], 'Rival')

    def test_same_competitor_name_in_another_workspace_is_not_reused(self):
        from social_stats.models import Competitor
        other = Competitor.objects.create(client=self.other, name='Rival')
        response = self.api.post('/api/calendar/sources/', {
            'client': self.workspace.pk, 'username': 'rival', 'competitor_name': 'Rival',
        }, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        source = CalendarSource.objects.get(pk=response.data['id'])
        self.assertNotEqual(source.competitor_id, other.pk)
        self.assertEqual(source.competitor.client_id, self.workspace.pk)

    @patch('social_stats.channel_calendar_tasks.build_reader')
    @patch('social_stats.channel_calendar_tasks.fetch_public_posts')
    def test_public_success_never_loads_or_writes_session(self, fetch, build):
        fetch.return_value = []
        sync_calendar_source(self.source.pk)
        build.assert_called_once_with()
        fetch.assert_called_once_with(build.return_value, 'example', anonymous=True)
        self.session.refresh_from_db()
        self.assertEqual(self.session.settings_json, '{"secret":"session"}')

    @patch('social_stats.channel_calendar_tasks.build_reader')
    @patch('social_stats.channel_calendar_tasks.fetch_public_posts')
    def test_anonymous_login_requirement_falls_back_to_saved_session(self, fetch, build):
        fetch.side_effect = [InstagramReadError('session_required'), []]
        build.return_value.get_settings.return_value = {'authorization_data': {'sessionid': 'refreshed'}}
        sync_calendar_source(self.source.pk)
        self.assertEqual(build.call_count, 2)
        self.assertEqual(build.call_args.args, (self.session.settings_json,))
        self.source.refresh_from_db()
        self.assertEqual(self.source.sync_status, 'ok')

    @patch('social_stats.channel_calendar_tasks.build_reader')
    @patch('social_stats.channel_calendar_tasks.fetch_public_posts')
    def test_anonymous_limit_without_saved_login_reports_session_required(self, fetch, build):
        self.session.delete()
        fetch.side_effect = InstagramReadError('anonymous_unavailable')
        sync_calendar_source(self.source.pk)
        self.source.refresh_from_db()
        self.assertEqual(self.source.error_code, 'session_required')
        build.assert_called_once_with()
        self.assertFalse(InstagramReaderSession.objects.get(client=self.workspace).settings_json)

    @patch('social_stats.channel_calendar_tasks.build_reader')
    @patch('social_stats.channel_calendar_tasks.fetch_public_posts')
    def test_gateway_failure_never_attempts_saved_login_or_direct_connection(self, fetch, build):
        fetch.side_effect = InstagramReadError('gateway_unavailable')
        sync_calendar_source(self.source.pk)
        build.assert_called_once_with()
        self.source.refresh_from_db()
        self.assertEqual(self.source.error_code, 'gateway_unavailable')
