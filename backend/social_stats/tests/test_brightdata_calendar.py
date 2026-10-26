import os
import asyncio
import json
from io import StringIO
from datetime import timedelta
from unittest.mock import patch

import requests

from django.test import SimpleTestCase, TestCase
from django.core.management import call_command, CommandError
from django.utils import timezone

from social_stats import brightdata_calendar as provider
from social_stats.channel_calendar_tasks import sync_calendar_source
from social_stats.instagram_calendar import InstagramReadError
from social_stats.models import CalendarSource, ChannelCalendarPost, Client


def record(**changes):
    return dict({
        'url': 'https://www.instagram.com/p/ABC123/', 'pk': '123',
        'user_posted': 'example', 'description': 'hello',
        'date_posted': '2026-10-24T12:30:00Z', 'likes': 0, 'num_comments': 2,
        'photos': ['https://cdn.example/photo.jpg'],
    }, **changes)


def response(payload, status=200):
    result = requests.Response()
    result.status_code = status
    result._content = json.dumps(payload).encode()
    result._content_consumed = True
    return result


class BrightDataProfileTests(SimpleTestCase):
    def profile(self, **changes):
        return dict({'account': 'example', 'is_private': False, 'followers': 1531,
                     'posts': [{'id': '3965842766798039999', 'url': 'https://www.instagram.com/p/ABC123',
                                'caption': 'sample', 'datetime': '2026-08-17T00:00:00.000Z',
                                'image_url': 'https://cdn.example/image.jpg', 'content_type': 'Carousel'}]}, **changes)

    @patch.dict(os.environ, {'BRIGHTDATA_API_KEY': 'fixture', 'BRIGHTDATA_CALENDAR_DISCOVERY': 'profiles'})
    @patch('social_stats.brightdata_calendar._send')
    def test_real_sdk_profiles_uses_exact_username_and_one_profile_record(self, send):
        send.return_value = response({'snapshot_id': 'sd_profiles'})
        self.assertEqual(provider.start_discovery('example'), 'sd_profiles')
        params = send.call_args.kwargs['params']
        self.assertEqual(params['dataset_id'], 'gd_l1vikfch901nx3by4')
        self.assertEqual(params['discover_by'], 'user_name')
        self.assertEqual(send.call_args.kwargs['json'], {'input': [{'user_name': 'example'}], 'limit_per_input': 1})

    def test_nested_sample_keeps_id_date_carousel_and_unknown_metrics(self):
        post = provider.normalize_posts([self.profile()], 'example')[0]
        self.assertEqual(post['external_id'], '3965842766798039999')
        self.assertEqual(post['post_type'], 'carousel')
        self.assertEqual(post['metrics'], {})
        self.assertEqual(post['caption'], 'sample')
        self.assertEqual(post['published_at'].isoformat(), '2026-08-17T00:00:00+00:00')

    def test_private_wrong_owner_empty_and_malformed_samples_fail_closed(self):
        for changes in [{'is_private': True}, {'is_private': None}, {'account': 'other'},
                        {'posts': []}, {'posts': None}, {'posts': ['invalid']}, {'account': None}]:
            with self.subTest(changes=changes), self.assertRaises(InstagramReadError):
                provider.normalize_posts([self.profile(**changes)], 'example')

    @patch.dict(os.environ, {'BRIGHTDATA_CALENDAR_POST_LIMIT': '1'})
    def test_nested_posts_respect_local_cap(self):
        profile = self.profile()
        profile['posts'] *= 12
        self.assertEqual(len(provider.normalize_posts([profile], 'example')), 1)


class BrightDataProbeTests(SimpleTestCase):
    @patch('social_stats.management.commands.probe_brightdata_calendar.start_discovery', return_value='sd_probe')
    def test_collect_is_explicitly_capped_at_one_record(self, collect):
        output = StringIO()
        call_command('probe_brightdata_calendar', collect='example', stdout=output)
        collect.assert_called_once_with('example', amount=1)
        self.assertEqual(json.loads(output.getvalue())['snapshot_id'], 'sd_probe')

    @patch('social_stats.management.commands.probe_brightdata_calendar.start_discovery')
    @patch('social_stats.management.commands.probe_brightdata_calendar.download_snapshot', return_value=[])
    def test_reading_empty_snapshot_never_submits_a_new_job_or_claims_content(self, download, collect):
        output = StringIO()
        call_command('probe_brightdata_calendar', snapshot='sd_empty', stdout=output)
        collect.assert_not_called()
        self.assertEqual(json.loads(output.getvalue()), {
            'status': 'empty', 'post_count': 0, 'content_confirmed': False,
        })


@patch.dict(os.environ, {'BRIGHTDATA_CALENDAR_DISCOVERY': 'posts'})
class BrightDataAdapterTests(SimpleTestCase):
    @patch.dict(os.environ, {'BRIGHTDATA_API_KEY': 'fixture'})
    @patch('social_stats.brightdata_calendar._send')
    def test_real_sd_snapshot_identifier_from_production(self, request):
        snapshot = 'sd_mvnq33xsf3gy6hddy'
        request.return_value = response({'snapshot_id': snapshot})
        self.assertEqual(provider.start_discovery('example'), snapshot)
        request.side_effect = [response({'status': 'ready'}), response([record()])]
        self.assertEqual(len(provider.fetch_snapshot(snapshot, 'example')), 1)

    @patch('social_stats.brightdata_calendar._send')
    def test_invalid_snapshot_cannot_change_request_path(self, request):
        for snapshot in ['sd_../other', 'sd_x?token=bad', 'https://evil.test', '', None]:
            with self.subTest(snapshot=snapshot), self.assertRaises(InstagramReadError):
                provider.fetch_snapshot(snapshot, 'example')
        request.assert_not_called()

    def test_normalization_preserves_zero_unknown_metrics_and_date(self):
        post = provider.normalize_posts([record()], 'example')[0]
        self.assertEqual(post['metrics'], {'likes': 0, 'comments': 2})
        self.assertEqual(post['published_at'].hour, 12)
        self.assertEqual(post['external_id'], '123')
        self.assertEqual(post['post_type'], 'image')

    def test_rejects_cross_channel_bad_urls_missing_dates_and_provider_errors(self):
        for changes in [{'user_posted': 'other'}, {'url': 'https://evil.test/p/ABC123/'},
                        {'url': 'https://www.instagram.com:invalid/p/ABC123/'},
                        {'date_posted': None}, {'date_posted': 'yesterday'},
                        {'error': 'token=secret'}, {'date_posted': '2026-10-24T12:30:00'}]:
            with self.subTest(changes=changes), self.assertRaises(InstagramReadError):
                provider.normalize_posts([record(**changes)], 'example')

    @patch.dict(os.environ, {'BRIGHTDATA_API_KEY': 'test-secret', 'API_GATEWAY_KEY': 'gateway-secret',
                            'API_GATEWAY_URL': 'https://gateway.example', 'BRIGHTDATA_CALENDAR_POST_LIMIT': '500'})
    @patch('social_stats.brightdata_calendar.outbound_request')
    def test_trigger_is_discovery_bounded_and_gateway_only(self, send):
        send.return_value.status_code = 200
        send.return_value.json.return_value = {'snapshot_id': 's_fixture'}
        self.assertEqual(provider.start_discovery('example'), 's_fixture')
        args, kwargs = send.call_args
        self.assertEqual(args[:2], ('brightdata', 'POST'))
        self.assertEqual(kwargs['mode'], 'gateway')
        self.assertFalse(kwargs['allow_redirects'])
        self.assertEqual(kwargs['params']['type'], 'discover_new')
        self.assertEqual(kwargs['params']['discover_by'], 'url')
        self.assertNotIn('limit_per_input', kwargs['params'])
        self.assertEqual(kwargs['json']['limit_per_input'], 50)
        self.assertEqual(kwargs['json']['input'][0]['num_of_posts'], 50)
        self.assertEqual(kwargs['json']['input'][0]['url'], 'https://www.instagram.com/example/')

    @patch.dict(os.environ, {'BRIGHTDATA_API_KEY': ''})
    @patch('social_stats.brightdata_calendar.outbound_request')
    def test_missing_key_never_sends(self, send):
        with self.assertRaises(InstagramReadError) as caught:
            provider.start_discovery('example')
        self.assertEqual(caught.exception.code, 'brightdata_not_configured')
        send.assert_not_called()

    @patch.dict(os.environ, {'BRIGHTDATA_API_KEY': 'secret', 'API_GATEWAY_KEY': 'gateway',
                            'API_GATEWAY_URL': 'https://gateway.example'})
    @patch('social_stats.brightdata_calendar.outbound_request')
    def test_http_errors_are_safe_and_not_retried(self, send):
        for status, code in [(401, 'brightdata_access_denied'), (402, 'brightdata_quota'),
                             (429, 'rate_limited'), (302, 'brightdata_unavailable')]:
            send.reset_mock()
            send.return_value.status_code = status
            with self.assertRaises(InstagramReadError) as caught:
                provider.start_discovery('example')
            self.assertEqual(caught.exception.code, code)
            self.assertNotIn('secret', str(caught.exception))
            self.assertEqual(send.call_count, 1)

    @patch('social_stats.brightdata_calendar._send')
    def test_progress_only_downloads_ready_snapshot(self, request):
        request.return_value = response({'status': 'running'})
        self.assertIsNone(provider.fetch_snapshot('s_fixture', 'example'))
        self.assertEqual(request.call_count, 1)
        request.side_effect = [response({'status': 'ready'}), response([record()])]
        self.assertEqual(len(provider.fetch_snapshot('s_fixture', 'example')), 1)

    def test_production_empty_snapshots_are_not_successful_content(self):
        with self.assertRaises(InstagramReadError) as caught:
            provider.normalize_posts([], 'example')
        self.assertEqual(caught.exception.code, 'brightdata_empty_result')

    @patch('social_stats.brightdata_calendar._send')
    def test_sdk_download_202_is_pending_not_invalid_or_empty(self, send):
        send.side_effect = [response({'status': 'ready'}), response({'status': 'running'}, 202)]
        self.assertIsNone(provider.fetch_snapshot('sd_fixture', 'example'))

    def test_sdk_engine_rejects_unapproved_hosts_paths_and_methods(self):
        from social_stats.egress.brightdata_sdk import GatewayEngine
        from unittest.mock import Mock
        send = Mock()

        async def attempt(method, url):
            async with GatewayEngine(send)._request(method, url):
                self.fail('unapproved destination accepted')

        for method, url in [('GET', 'https://evil.test/datasets/v3/progress/sd_test'),
                            ('POST', 'https://api.brightdata.com/zone'),
                            ('GET', 'https://api.brightdata.com/datasets/v3/snapshot/sd_test?token=secret'),
                            ('POST', 'https://api.brightdata.com/datasets/v3/snapshot/sd_test/rerun')]:
            with self.subTest(url=url), self.assertRaises(InstagramReadError):
                asyncio.run(attempt(method, url))
        send.assert_not_called()

    @patch.dict(os.environ, {'BRIGHTDATA_API_KEY': 'service-secret', 'API_GATEWAY_KEY': 'gateway-secret',
                            'API_GATEWAY_URL': 'https://gateway.example', 'BRIGHTDATA_CALENDAR_POST_LIMIT': '5'})
    @patch('aiohttp.ClientSession', side_effect=AssertionError('SDK native session must never be opened'))
    @patch('requests.request')
    def test_real_sdk_trigger_and_download_reach_only_gateway(self, network, native_session):
        network.side_effect = [response({'snapshot_id': 'sd_fixture'}),
                               response({'status': 'ready'}), response([record()])]
        snapshot = provider.start_discovery('example')
        self.assertEqual(provider.fetch_snapshot(snapshot, 'example')[0]['external_id'], '123')
        self.assertEqual(network.call_count, 3)
        for call in network.call_args_list:
            kwargs = call.kwargs
            self.assertTrue(kwargs['url'].startswith('https://gateway.example/brightdata/datasets/v3/'))
            self.assertEqual(kwargs['headers']['Authorization'], 'Bearer service-secret')
            self.assertEqual(kwargs['headers']['X-API-Gateway-Key'], 'gateway-secret')
            self.assertFalse(kwargs['allow_redirects'])
            self.assertTrue(kwargs['verify'])
            self.assertEqual(kwargs['proxies'], {})
        payload = network.call_args_list[0].kwargs
        self.assertEqual(payload['json'], {'input': [{
            'url': 'https://www.instagram.com/example/', 'num_of_posts': 5,
        }], 'limit_per_input': 5})
        native_session.assert_not_called()


@patch.dict(os.environ, {'INSTAGRAM_CALENDAR_PROVIDER': 'brightdata'})
class BrightDataSyncTests(TestCase):
    def setUp(self):
        self.workspace = Client.objects.create(name='test', company='test', email='test@example.test')
        self.source = CalendarSource.objects.create(client=self.workspace, username='example')

    @patch('social_stats.brightdata_calendar.download_snapshot')
    def test_profile_snapshot_imports_into_calendar_without_submission(self, download):
        profile = BrightDataProfileTests().profile()
        download.return_value = [profile]
        self.source.provider_snapshot_id = 'sd_profile_ready'
        self.source.provider_started_at = timezone.now()
        self.source.save()
        with patch('social_stats.brightdata_calendar.start_discovery') as submit:
            sync_calendar_source(self.source.pk, snapshot_id='sd_profile_ready')
        submit.assert_not_called()
        self.source.refresh_from_db()
        self.assertEqual(self.source.sync_status, 'ok')
        post = ChannelCalendarPost.objects.get(source=self.source)
        self.assertEqual(post.external_id, '3965842766798039999')

    @patch('social_stats.channel_calendar_tasks.build_reader')
    @patch('social_stats.channel_calendar_tasks.sync_calendar_source.apply_async')
    @patch('social_stats.brightdata_calendar.fetch_snapshot')
    @patch('social_stats.brightdata_calendar.start_discovery', return_value='s_fixture')
    def test_trigger_poll_upsert_and_stale_delivery_never_retriggers(self, start, fetch, queue, reader):
        sync_calendar_source(self.source.pk)
        self.source.refresh_from_db()
        self.assertEqual(self.source.provider_snapshot_id, 's_fixture')
        self.assertEqual(self.source.sync_status, 'syncing')
        self.assertIsNone(self.source.last_synced_at)
        queue.assert_called_once_with(args=[self.source.pk], kwargs={'snapshot_id': 's_fixture'}, countdown=60)
        fetch.return_value = provider.normalize_posts([record()], 'example')
        sync_calendar_source(self.source.pk, snapshot_id='s_fixture')
        self.source.refresh_from_db()
        self.assertEqual(self.source.sync_status, 'ok')
        self.assertFalse(self.source.provider_snapshot_id)
        self.assertEqual(ChannelCalendarPost.objects.get().source.client_id, self.workspace.pk)
        sync_calendar_source(self.source.pk, snapshot_id='s_fixture')
        start.assert_called_once()
        reader.assert_not_called()

    @patch('social_stats.channel_calendar_tasks.sync_calendar_source.apply_async')
    @patch('social_stats.brightdata_calendar.start_discovery')
    @patch('social_stats.brightdata_calendar.fetch_snapshot')
    def test_transient_failure_retains_snapshot_and_previous_posts(self, fetch, start, queue):
        self.source.provider_snapshot_id = 's_fixture'
        self.source.provider_started_at = timezone.now()
        self.source.save()
        post = provider.normalize_posts([record()], 'example')[0]
        ChannelCalendarPost.objects.create(source=self.source, **post)
        fetch.side_effect = InstagramReadError('brightdata_unavailable')
        sync_calendar_source(self.source.pk, snapshot_id='s_fixture')
        self.source.refresh_from_db()
        self.assertEqual(self.source.provider_snapshot_id, 's_fixture')
        self.assertEqual(self.source.error_code, 'brightdata_unavailable')
        self.assertEqual(ChannelCalendarPost.objects.count(), 1)
        start.assert_not_called()

    @patch('social_stats.brightdata_calendar.start_discovery')
    @patch('social_stats.brightdata_calendar.fetch_snapshot')
    def test_expired_collection_stops_without_resubmitting(self, fetch, start):
        self.source.provider_snapshot_id = 's_fixture'
        self.source.provider_started_at = timezone.now() - timedelta(hours=1)
        self.source.save()
        sync_calendar_source(self.source.pk, snapshot_id='s_fixture')
        self.source.refresh_from_db()
        self.assertEqual(self.source.error_code, 'brightdata_timeout')
        self.assertFalse(self.source.provider_snapshot_id)
        fetch.assert_not_called()
        start.assert_not_called()

    @patch('social_stats.channel_calendar_tasks.build_reader')
    @patch('social_stats.brightdata_calendar.start_discovery', side_effect=InstagramReadError('brightdata_access_denied'))
    def test_provider_failure_never_falls_back_to_instagram(self, start, reader):
        sync_calendar_source(self.source.pk)
        self.source.refresh_from_db()
        self.assertEqual(self.source.error_code, 'brightdata_access_denied')
        reader.assert_not_called()

    @patch('social_stats.brightdata_calendar.fetch_snapshot')
    def test_deleted_source_does_not_download_snapshot(self, fetch):
        source_id = self.source.pk
        self.source.delete()
        sync_calendar_source(source_id, snapshot_id='s_fixture')
        fetch.assert_not_called()

    @patch('social_stats.brightdata_calendar.fetch_snapshot')
    def test_provider_switch_updates_same_post_without_duplicate(self, fetch):
        old = provider.normalize_posts([record()], 'example')[0]
        old.update(external_id='old-provider-id', post_url='https://www.instagram.com/reel/ABC123/')
        ChannelCalendarPost.objects.create(source=self.source, **old)
        self.source.provider_snapshot_id = 's_fixture'
        self.source.provider_started_at = timezone.now()
        self.source.save()
        fetch.return_value = provider.normalize_posts([record(likes=5)], 'example')
        sync_calendar_source(self.source.pk, snapshot_id='s_fixture')
        self.assertEqual(ChannelCalendarPost.objects.count(), 1)
        self.assertEqual(ChannelCalendarPost.objects.get().metrics['likes'], 5)

    @patch('social_stats.management.commands.recover_brightdata_calendar.sync_calendar_source.delay')
    @patch('social_stats.management.commands.recover_brightdata_calendar.download_snapshot')
    @patch('social_stats.brightdata_calendar.start_discovery')
    def test_recovery_queues_existing_snapshot_without_new_collection(self, start, download, delay):
        download.return_value = [record()]
        call_command('recover_brightdata_calendar', workspace=self.workspace.pk,
                     snapshot=['sd_recovery'], stdout=StringIO())
        self.source.refresh_from_db()
        self.assertEqual(self.source.provider_snapshot_id, 'sd_recovery')
        delay.assert_called_once_with(self.source.pk, snapshot_id='sd_recovery')
        start.assert_not_called()

    @patch('social_stats.management.commands.recover_brightdata_calendar.sync_calendar_source.delay')
    @patch('social_stats.management.commands.recover_brightdata_calendar.download_snapshot')
    def test_recovery_rejects_other_workspace_without_mutation(self, download, delay):
        other = Client.objects.create(name='other', company='other', email='other@example.test')
        download.return_value = [record()]
        with self.assertRaises(CommandError):
            call_command('recover_brightdata_calendar', workspace=other.pk,
                         snapshot=['sd_recovery'], stdout=StringIO())
        self.source.refresh_from_db()
        self.assertEqual(self.source.provider_snapshot_id, '')
        delay.assert_not_called()

    @patch('social_stats.management.commands.recover_brightdata_calendar.sync_calendar_source.delay')
    @patch('social_stats.management.commands.recover_brightdata_calendar.download_snapshot')
    def test_recovery_validates_all_snapshots_before_mutating_any_source(self, download, delay):
        download.side_effect = [[record()], [record(user_posted='unknown')]]
        with self.assertRaises(CommandError):
            call_command('recover_brightdata_calendar', workspace=self.workspace.pk,
                         snapshot=['sd_first', 'sd_second'], stdout=StringIO())
        self.source.refresh_from_db()
        self.assertEqual(self.source.provider_snapshot_id, '')
        delay.assert_not_called()

    @patch('social_stats.brightdata_calendar.fetch_snapshot')
    def test_empty_snapshot_never_updates_last_success_or_logs_completion(self, fetch):
        last_success = timezone.now() - timedelta(days=1)
        self.source.provider_snapshot_id = 'sd_empty'
        self.source.provider_started_at = timezone.now()
        self.source.last_synced_at = last_success
        self.source.save()
        ChannelCalendarPost.objects.create(source=self.source, **provider.normalize_posts([record()], 'example')[0])
        fetch.side_effect = lambda *args: provider.normalize_posts([], 'example')
        with self.assertLogs('social_stats.channel_calendar_tasks', level='INFO') as logs:
            sync_calendar_source(self.source.pk, snapshot_id='sd_empty')
        self.source.refresh_from_db()
        self.assertEqual(self.source.sync_status, 'error')
        self.assertEqual(self.source.error_code, 'brightdata_empty_result')
        self.assertEqual(self.source.last_synced_at, last_success)
        self.assertEqual(ChannelCalendarPost.objects.count(), 1)
        self.assertFalse(any('calendar_sync_completed' in item for item in logs.output))

    @patch('social_stats.management.commands.recover_brightdata_calendar.download_snapshot', return_value=[])
    @patch('social_stats.management.commands.recover_brightdata_calendar.sync_calendar_source.delay')
    def test_empty_recovery_reports_exact_cause_without_mutation(self, delay, download):
        with self.assertRaisesMessage(CommandError, 'ready but contains zero posts'):
            call_command('recover_brightdata_calendar', workspace=self.workspace.pk,
                         snapshot=['sd_empty'], stdout=StringIO())
        self.source.refresh_from_db()
        self.assertEqual(self.source.provider_snapshot_id, '')
        delay.assert_not_called()
