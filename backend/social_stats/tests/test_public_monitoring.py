"""Paid collection invariants: shared identity, freshness, batches and safe fan-out."""
import os
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase, SimpleTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from social_stats import brightdata_calendar as provider
from social_stats.instagram_calendar import InstagramReadError
from social_stats.models import (Client, UserProfile, CalendarSource, ChannelCalendarPost,
    ChannelPostObservation, PublicCollection, PublicProfile, PublicObservation, Competitor, CompetitorSnapshot)
from social_stats.public_monitoring import (attach_source, dispatch_public_collections, collect_public_batch,
                                           project_source, profile_summary)
from social_stats.tests.test_brightdata_calendar import record, response


@patch.dict(os.environ, {'INSTAGRAM_CALENDAR_PROVIDER': 'brightdata',
                        'BRIGHTDATA_DAILY_RECORD_LIMIT': '2000', 'BRIGHTDATA_BATCH_SIZE': '25', 'BRIGHTDATA_CALENDAR_POST_LIMIT': '5'})
class SharedCollectionTests(TestCase):
    def setUp(self):
        self.workspace = Client.objects.create(company='One')
        self.other = Client.objects.create(company='Two')
        self.source = CalendarSource.objects.create(client=self.workspace, username='example')
        self.source2 = CalendarSource.objects.create(client=self.other, username='example')
        self.profile = attach_source(self.source)
        attach_source(self.source2)

    def job(self, kind='posts', snapshot='sd_fixture'):
        job = PublicCollection.objects.create(kind=kind, status='running', snapshot_id=snapshot, reserved_records=5)
        setattr(self.profile, f'{kind}_collection', job)
        self.profile.save()
        return job

    @patch('social_stats.public_monitoring.collect_public_batch.delay')
    def test_deduplication_batching_and_repeated_dispatch_do_not_reserve_again(self, queue):
        CalendarSource.objects.create(client=self.workspace, username='second')
        dispatch_public_collections()
        self.assertEqual(PublicProfile.objects.count(), 2)
        self.assertEqual(PublicCollection.objects.count(), 2)
        self.assertEqual(sum(PublicCollection.objects.values_list('reserved_records', flat=True)), 12)
        dispatch_public_collections()
        self.assertEqual(PublicCollection.objects.count(), 2)
        self.assertEqual(PublicCollection.objects.get(kind='posts').posts_targets.count(), 2)

    @patch('social_stats.public_monitoring.collect_public_batch.delay')
    def test_freshness_manual_requests_and_late_enrollment_use_cache(self, queue):
        self.profile.profile_fetched_at = timezone.now()
        self.profile.posts_fetched_at = timezone.now()
        self.profile.profile = {'followers': 100}
        self.profile.posts = [{**provider.normalize_posts([record()], 'example')[0], 'details': {'hashtags': ['hello']}}]
        self.profile.posts[0]['published_at'] = self.profile.posts[0]['published_at'].isoformat()
        self.profile.save()
        dispatch_public_collections()
        dispatch_public_collections()
        self.assertEqual(PublicCollection.objects.count(), 0)
        self.assertEqual(ChannelCalendarPost.objects.count(), 2)
        self.assertEqual(ChannelPostObservation.objects.count(), 2)
        self.assertEqual(ChannelCalendarPost.objects.get(source=self.source).observed_at, self.profile.posts_fetched_at)
        from social_stats.channel_calendar_tasks import sync_calendar_source
        with patch('social_stats.public_monitoring.dispatch_public_collections.apply_async'):
            sync_calendar_source(self.source.pk)
        self.assertEqual(ChannelPostObservation.objects.count(), 2)

    @patch('social_stats.public_monitoring.collect_public_batch.delay')
    def test_only_stale_half_is_collected(self, queue):
        self.profile.profile_fetched_at = timezone.now() - timedelta(hours=49)
        self.profile.posts_fetched_at = timezone.now()
        self.profile.save()
        dispatch_public_collections()
        self.assertEqual(list(PublicCollection.objects.values_list('kind', flat=True)), ['profile'])

    @patch.dict(os.environ, {'BRIGHTDATA_DAILY_RECORD_LIMIT': '1'})
    @patch('social_stats.public_monitoring.collect_public_batch.delay')
    def test_daily_reservations_bound_records_even_across_repeated_dispatch(self, queue):
        dispatch_public_collections()
        dispatch_public_collections()
        self.assertEqual(PublicCollection.objects.count(), 1)
        self.assertEqual(PublicCollection.objects.get().reserved_records, 1)

    @patch('social_stats.public_monitoring.collect_public_batch.delay')
    def test_paused_workspaces_and_inactive_sources_do_not_trigger_paid_work(self, queue):
        self.workspace.is_processing_paused = True
        self.workspace.save()
        self.source2.is_active = False
        self.source2.save()
        dispatch_public_collections()
        self.assertEqual(PublicCollection.objects.count(), 0)

    @patch('social_stats.brightdata_calendar.start_batch')
    @patch('social_stats.brightdata_calendar.download_snapshot')
    def test_an_active_batch_lease_blocks_concurrent_delivery(self, download, trigger):
        job = self.job()
        job.locked_until = timezone.now() + timedelta(minutes=5)
        job.save()
        collect_public_batch(job.pk)
        trigger.assert_not_called()
        download.assert_not_called()

    @patch.dict(os.environ, {'INSTAGRAM_CALENDAR_PROVIDER': 'instagrapi'})
    @patch('social_stats.channel_calendar_tasks.sync_calendar_source.apply_async')
    def test_hourly_sweep_preserves_daily_legacy_reader_cadence(self, queue):
        from social_stats.channel_calendar_tasks import sync_calendar_sources
        CalendarSource.objects.all().update(last_attempt_at=timezone.now())
        sync_calendar_sources()
        queue.assert_not_called()
        CalendarSource.objects.filter(pk=self.source.pk).update(last_attempt_at=timezone.now() - timedelta(hours=25))
        sync_calendar_sources()
        queue.assert_called_once_with(args=[self.source.pk], countdown=0)

    @patch('social_stats.brightdata_calendar.start_batch', return_value='sd_batch')
    @patch('social_stats.public_monitoring.collect_public_batch.apply_async')
    def test_trigger_saved_once_duplicate_delivery_only_polls(self, queue, trigger):
        job = self.job(snapshot='')
        job.status = 'queued'
        job.save()
        collect_public_batch(job.pk)
        with patch('social_stats.brightdata_calendar.download_snapshot', return_value=None):
            collect_public_batch(job.pk)
        trigger.assert_called_once_with(['example'], 'posts', limit=5)
        job.refresh_from_db()
        self.assertEqual(job.snapshot_id, 'sd_batch')
        self.assertEqual(job.status, 'running')

    @patch('social_stats.brightdata_calendar.start_batch')
    def test_uncertain_submission_never_reposts(self, trigger):
        job = self.job(snapshot='')
        job.status = 'submitting'
        job.save()
        collect_public_batch(job.pk)
        trigger.assert_not_called()
        job.refresh_from_db()
        self.assertEqual(job.error_code, 'brightdata_submission_unknown')

    @patch('social_stats.brightdata_calendar.download_snapshot', return_value=[record()])
    def test_download_once_projects_to_two_workspaces_and_retains_payload(self, download):
        job = self.job()
        collect_public_batch(job.pk)
        collect_public_batch(job.pk)
        self.assertEqual(download.call_count, 1)
        self.assertEqual(ChannelCalendarPost.objects.count(), 2)
        self.assertEqual(ChannelPostObservation.objects.count(), 2)
        self.assertEqual(PublicObservation.objects.count(), 1)
        self.assertEqual(PublicObservation.objects.get().raw[0]['likes'], 0)
        self.profile.refresh_from_db()
        self.assertIsNotNone(self.profile.posts_fetched_at)
        self.assertEqual(ChannelCalendarPost.objects.get(source=self.source).metrics['likes'], 0)

    @patch('social_stats.brightdata_calendar.download_snapshot')
    def test_failure_of_one_target_does_not_discard_successful_target(self, download):
        job = self.job()
        second = PublicProfile.objects.create(username='second', posts_collection=job)
        CalendarSource.objects.create(client=self.workspace, username='second', public_profile=second)
        download.return_value = [record(), {'user_posted': 'second', 'error': 'not found'}]
        collect_public_batch(job.pk)
        self.profile.refresh_from_db()
        second.refresh_from_db()
        self.assertIsNotNone(self.profile.posts_fetched_at)
        self.assertIsNone(second.posts_fetched_at)
        self.assertEqual(second.posts_error, 'brightdata_collection_failed')
        self.assertEqual(PublicObservation.objects.count(), 2)

    @patch('social_stats.brightdata_calendar.download_snapshot')
    def test_retry_after_partial_database_failure_does_not_reobserve_completed_target(self, download):
        job = self.job()
        second = PublicProfile.objects.create(username='second', posts_collection=job)
        CalendarSource.objects.create(client=self.workspace, username='second', public_profile=second)
        download.return_value = [record(), record(user_posted='second', pk='second')]
        real_project = project_source
        def fail_second(source, profile):
            if profile.pk == second.pk:
                raise RuntimeError('Synthetic database failure')
            return real_project(source, profile)
        with patch('social_stats.public_monitoring.project_source', side_effect=fail_second):
            collect_public_batch(job.pk)
        first_time = PublicProfile.objects.get(pk=self.profile.pk).posts_fetched_at
        collect_public_batch(job.pk)
        self.assertEqual(PublicProfile.objects.get(pk=self.profile.pk).posts_fetched_at, first_time)
        self.assertEqual(ChannelPostObservation.objects.filter(post__source=self.source).count(), 1)
        self.assertTrue(all(PublicObservation.objects.values_list('applied', flat=True)))

    @patch('social_stats.brightdata_calendar.download_snapshot', return_value=[record(user_posted='outsider')])
    def test_unknown_owner_cannot_contaminate_shared_cache(self, download):
        job = self.job()
        collect_public_batch(job.pk)
        self.assertEqual(ChannelCalendarPost.objects.count(), 0)
        job.refresh_from_db()
        self.assertEqual(job.error_code, 'brightdata_invalid_response')

    @patch('social_stats.brightdata_calendar.download_snapshot', side_effect=InstagramReadError('brightdata_unavailable'))
    @patch('social_stats.brightdata_calendar.start_batch')
    def test_transient_download_failure_retains_snapshot(self, trigger, download):
        job = self.job()
        collect_public_batch(job.pk)
        job.refresh_from_db()
        self.assertEqual(job.snapshot_id, 'sd_fixture')
        self.assertEqual(job.status, 'running')
        trigger.assert_not_called()

    @patch('social_stats.brightdata_calendar.download_snapshot')
    def test_profile_metrics_saved_and_competitor_history_projected_without_fake_zeroes(self, download):
        competitor = Competitor.objects.create(client=self.workspace, name='Rival')
        self.source.competitor = competitor
        self.source.save()
        download.return_value = [{'account': 'example', 'is_private': False, 'followers': 120,
                                  'following': 20, 'biography': 'Actual bio', 'is_verified': True}]
        job = self.job(kind='profile')
        collect_public_batch(job.pk)
        snapshot = CompetitorSnapshot.objects.get(competitor=competitor)
        self.assertEqual(snapshot.followers, 120)
        self.assertIsNone(snapshot.engagement_rate)
        self.assertIsNone(snapshot.posts_count)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.profile['biography'], 'Actual bio')
        self.assertEqual(profile_summary(self.profile)['status'], 'partial')

    @patch('social_stats.brightdata_calendar.download_snapshot')
    def test_embedded_profile_sample_is_available_without_claiming_full_post_sync(self, download):
        from social_stats.tests.test_brightdata_calendar import BrightDataProfileTests
        download.return_value = [BrightDataProfileTests().profile()]
        collect_public_batch(self.job(kind='profile').pk)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.stored_posts.count(), 1)
        self.assertIsNone(self.profile.posts_fetched_at)
        self.assertEqual(ChannelCalendarPost.objects.filter(source=self.source).count(), 1)
        self.assertEqual(ChannelCalendarPost.objects.get(source=self.source).metrics, {})

    @patch('social_stats.brightdata_calendar.download_snapshot', return_value=[])
    def test_empty_result_retains_old_content_and_exposes_partial_failure(self, download):
        self.profile.posts_fetched_at = timezone.now() - timedelta(days=3)
        self.profile.save()
        before = self.profile.posts_fetched_at
        job = self.job()
        collect_public_batch(job.pk)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.posts_fetched_at, before)
        self.assertEqual(profile_summary(self.profile)['status'], 'error')

    @patch('social_stats.brightdata_calendar.download_snapshot')
    def test_late_subscriber_receives_historical_posts_without_another_paid_request(self, download):
        download.return_value = [record()]
        collect_public_batch(self.job().pk)
        download.return_value = [record(pk='456', url='https://www.instagram.com/p/NEW/')]
        collect_public_batch(self.job().pk)
        late = CalendarSource.objects.create(client=Client.objects.create(company='Late'), username='example')
        profile = attach_source(late)
        project_source(late, profile)
        self.assertEqual(ChannelCalendarPost.objects.filter(source=late).count(), 2)
        self.assertEqual(download.call_count, 2)
        self.assertEqual(profile.stored_posts.count(), 2)

    def test_restricted_account_hides_shared_profile_and_projected_snapshots(self):
        from social_stats.watchlist import enroll_instagram
        from social_stats.models import SocialAccountPermissionOverride
        competitor = Competitor.objects.create(client=self.workspace, name='Protected')
        source = enroll_instagram(self.workspace, 'example', competitor=competitor)
        self.profile.profile = {'followers': 123}
        self.profile.profile_fetched_at = timezone.now()
        self.profile.save()
        project_source(source, self.profile)
        user = User.objects.create_user('restricted')
        UserProfile.objects.create(user=user, role='client', client=self.workspace)
        SocialAccountPermissionOverride.objects.create(account=source.social_account, user=user,
                                                       permissions={'view_posts': False})
        api = APIClient()
        api.force_authenticate(user)
        payload = api.get(f'/api/competitors/{competitor.pk}/').data
        self.assertIsNone(payload['public_data'])
        self.assertEqual(payload['latest_snapshots'], [])
        self.assertNotIn('instagram', payload['follower_history'])
        self.assertEqual(api.get(f'/api/competitors/{competitor.pk}/timeline/').data['snapshots'], [])
        self.assertEqual(api.get('/api/calendar/sources/').data, [])

    def test_workspace_api_does_not_expose_other_subscribers_or_internal_snapshots(self):
        user = User.objects.create_user('public-cache-user')
        UserProfile.objects.create(user=user, role='client', client=self.workspace)
        api = APIClient()
        api.force_authenticate(user)
        self.profile.profile = {'followers': 100, 'biography': 'Shared public bio'}
        self.profile.save()
        response = api.get('/api/calendar/sources/', {'client_id': self.workspace.pk})
        self.assertEqual(response.status_code, 200)
        rows = response.data
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['public_data']['profile']['followers'], 100)
        self.assertNotIn('snapshot_id', str(rows))
        self.assertNotIn('raw', str(rows))
        foreign = api.get('/api/calendar/sources/', {'client_id': self.other.pk})
        self.assertNotIn('Shared public bio', str(foreign.data))


class OfficialBatchContractTests(SimpleTestCase):
    @patch.dict(os.environ, {'BRIGHTDATA_API_KEY': 'fixture'})
    @patch('social_stats.brightdata_calendar._send')
    def test_real_sdk_groups_distinct_profile_urls_with_cap(self, send):
        send.return_value = response({'snapshot_id': 'sd_group'})
        self.assertEqual(provider.start_batch(['Example', '@example', 'second'], 'profile', limit=5), 'sd_group')
        self.assertEqual(send.call_count, 1)
        self.assertEqual(send.call_args.kwargs['params']['dataset_id'], 'gd_l1vikfch901nx3by4')
        self.assertEqual(send.call_args.kwargs['json'], {'input': [
            {'url': 'https://www.instagram.com/example/'}, {'url': 'https://www.instagram.com/second/'}], 'limit_per_input': 1})

    @patch.dict(os.environ, {'BRIGHTDATA_API_KEY': 'fixture'})
    @patch('social_stats.brightdata_calendar._send')
    def test_real_sdk_post_discovery_has_per_account_cap(self, send):
        send.return_value = response({'snapshot_id': 'sd_posts'})
        provider.start_batch(['example', 'second'], 'posts', limit=5)
        self.assertEqual(send.call_args.kwargs['json']['limit_per_input'], 5)
        self.assertEqual(send.call_args.kwargs['params']['discover_by'], 'url')
        self.assertEqual(len(send.call_args.kwargs['json']['input']), 2)
