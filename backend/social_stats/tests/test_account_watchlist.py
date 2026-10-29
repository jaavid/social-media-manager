import os
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from social_stats.models import (
    Client, SocialAccount, Competitor, CalendarSource, ChannelCalendarPost,
    ChannelPostObservation, SocialAccountPermissionOverride,
)
from social_stats.watchlist import enroll_instagram
from social_stats.channel_calendar_tasks import sync_calendar_source
from social_stats.views.oauth import _save_credential


@patch.dict(os.environ, {'INSTAGRAM_CALENDAR_PROVIDER': 'instagrapi'})
class WatchlistTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='watch-owner')
        self.workspace = Client.objects.create(name='watch', company='Watch', email='watch@example.test', owner_user=self.user)
        self.api = APIClient()
        self.api.force_authenticate(self.user)

    def test_registration_is_durable_idempotent_and_queues_after_commit(self):
        with patch('social_stats.watchlist.enqueue_source') as enqueue:
            with self.captureOnCommitCallbacks(execute=True):
                source = enroll_instagram(self.workspace, '@EXAMPLE')
            enqueue.assert_called_once_with(source.pk)
            enroll_instagram(self.workspace, 'https://instagram.com/example/')
        self.assertEqual(SocialAccount.objects.count(), 1)
        self.assertEqual(CalendarSource.objects.count(), 1)
        self.assertFalse(hasattr(source.social_account, 'credential'))

    def test_competitor_and_owned_account_join_the_same_monitor(self):
        competitor = Competitor.objects.create(client=self.workspace, name='Example', public_handles={'instagram': '@example'})
        source = CalendarSource.objects.get(competitor=competitor)
        account = SocialAccount.objects.create(client=self.workspace, platform='instagram', external_id='123', username='example')
        source.refresh_from_db()
        self.assertEqual(source.social_account_id, account.pk)
        self.assertEqual(CalendarSource.objects.count(), 1)

    def test_verified_provider_identity_upgrades_placeholder_preserving_access_and_content(self):
        source = enroll_instagram(self.workspace, 'example')
        account_id = source.social_account_id
        _save_credential(self.workspace.pk, 'instagram', {
            'access_token': 'secret', 'instagram_account_id': '123', 'page_name': 'Example',
            '_public_username': 'example', 'scope': 'instagram_content_publish',
        })
        source.refresh_from_db()
        self.assertEqual(source.social_account_id, account_id)
        account = SocialAccount.objects.get(pk=account_id)
        self.assertEqual(account.external_id, '123')
        self.assertEqual(account.credential.access_token, 'secret')
        self.assertEqual(SocialAccount.objects.count(), 1)

    def test_public_registration_does_not_accept_ownership_claims(self):
        response = self.api.post('/api/calendar/sources/', {
            'client': self.workspace.pk, 'username': 'example', 'publishing_ready': True,
            'is_admin': True, 'social_account': 999,
        }, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertFalse(response.data['publishing_ready'])
        self.assertFalse(hasattr(SocialAccount.objects.get(), 'credential'))

    def test_pause_retains_content_and_readding_resumes(self):
        source = enroll_instagram(self.workspace, 'example')
        post = self.post(source)
        response = self.api.delete(f'/api/calendar/sources/{source.pk}/')
        self.assertEqual(response.status_code, 204)
        source.refresh_from_db()
        self.assertFalse(source.is_active)
        self.assertTrue(ChannelCalendarPost.objects.filter(pk=post.pk).exists())
        response = self.api.post('/api/calendar/sources/', {'client': self.workspace.pk, 'username': 'example'}, format='json')
        self.assertEqual(response.status_code, 200)
        source.refresh_from_db()
        self.assertTrue(source.is_active)

    def post(self, source):
        return ChannelCalendarPost.objects.create(source=source, external_id='1', caption='Stored',
            post_type='image', post_url='https://www.instagram.com/p/abc/', published_at=timezone.now(), metrics={'likes': 2})

    def test_stored_content_is_reusable_but_account_denials_hide_it(self):
        source = enroll_instagram(self.workspace, 'example')
        self.post(source)
        url = f'/api/social-accounts/{source.social_account_id}/observed_posts/'
        response = self.api.get(url)
        self.assertEqual(response.status_code, 200, response.data)
        SocialAccountPermissionOverride.objects.create(account=source.social_account, user=self.user, permissions={'view_posts': False})
        self.assertEqual(self.api.get(url).status_code, 404)
        self.assertEqual(self.api.get('/api/calendar/sources/').data, [])

    @patch('social_stats.channel_calendar_tasks.build_reader')
    @patch('social_stats.channel_calendar_tasks.fetch_public_posts')
    def test_recollection_keeps_metric_history_and_paused_workspaces_are_skipped(self, fetch, build):
        source = enroll_instagram(self.workspace, 'example')
        fetch.side_effect = lambda *a, **kw: [dict(external_id='1', caption='text', post_type='image',
            post_url='https://www.instagram.com/p/abc/', published_at=timezone.now(), metrics={'likes': fetch.call_count})]
        sync_calendar_source(source.pk)
        CalendarSource.objects.filter(pk=source.pk).update(last_attempt_at=timezone.now() - timedelta(hours=1))
        sync_calendar_source(source.pk)
        self.assertEqual(ChannelCalendarPost.objects.count(), 1)
        self.assertEqual(list(ChannelPostObservation.objects.order_by('pk').values_list('metrics', flat=True)), [{'likes': 1}, {'likes': 2}])
        self.workspace.is_processing_paused = True
        self.workspace.save()
        sync_calendar_source(source.pk)
        self.assertEqual(fetch.call_count, 2)

    def test_cross_workspace_account_cannot_be_enrolled(self):
        other = Client.objects.create(name='other', company='other', email='other@example.test')
        account = SocialAccount.objects.create(client=other, platform='instagram', external_id='1')
        with self.assertRaises(ValueError):
            enroll_instagram(self.workspace, 'example', account=account)
        self.assertFalse(CalendarSource.objects.exists())

    def test_public_account_cannot_publish_or_schedule_and_missing_scopes_stay_blocked(self):
        from social_stats.models import PlatformCredential
        from social_stats.publishing_contract import validate_intent
        from social_stats.platforms.base import ProviderError
        source = enroll_instagram(self.workspace, 'example')
        payload = {'content': 'hello', 'media_type': 'image', 'media_urls': ['https://example.test/photo.jpg'],
                   'target_platforms': ['instagram'], 'platform_overrides': {
                       'instagram': {'social_account_id': source.social_account_id}}}
        with patch('social_stats.security.ssrf.check_url'):
            for action in ['publish_posts', 'schedule_posts']:
                with self.assertRaises(ProviderError):
                    validate_intent(payload, self.workspace, self.user, action=action, ready=True)
            credential = PlatformCredential.objects.create(client=self.workspace, platform='instagram',
                social_account=source.social_account, access_token='fixture', scope='instagram_basic')
            with self.assertRaises(ProviderError) as error:
                validate_intent(payload, self.workspace, self.user, action='schedule_posts', ready=True)
            self.assertEqual(error.exception.code, 'permission_denied')
            credential.scope = 'instagram_basic instagram_content_publish'
            credential.save()
            self.assertFalse(validate_intent(payload, self.workspace, self.user, action='schedule_posts', ready=True))
