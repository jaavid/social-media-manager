"""
Orchestrator integration tests.

Spins up real Client + PlatformCredential + UnifiedPost rows, then mocks
the publisher methods so we can assert the orchestrator:
  - fans out to all target platforms
  - applies platform_overrides
  - persists success rows + transitions parent status to 'published'
  - on partial failure, marks parent 'partial'
  - on TokenExpiredError, deactivates the credential + writes an Alert
  - on PublishError, marks the child 'failed'
"""
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.utils import timezone

from social_stats.models import (
    Client, PlatformCredential, UnifiedPost, PlatformPublishLog, Alert,
)
from social_stats.publishers import (
    PublishResult, TokenExpiredError, PublishError,
)


@override_settings(CELERY_TASK_ALWAYS_EAGER=True, CELERY_TASK_EAGER_PROPAGATES=True)
class OrchestratorTests(TestCase):
    def setUp(self):
        self.client_obj = Client.objects.create(
            name='Acme', company='Acme Inc', email=f'acme-{id(self)}@x.test',
        )
        self.actor = User.objects.create_user(username='publisher')
        self.client_obj.owner_user = self.actor
        self.client_obj.save(update_fields=['owner_user'])
        # Need active credentials for fb + ig
        for p in ('facebook', 'instagram'):
            PlatformCredential.objects.create(
                client=self.client_obj, platform=p,
                access_token='tok',
                page_id='100', instagram_account_id='200',
                is_active=True,
            )

    def _make_post(self, **kwargs):
        defaults = dict(
            client=self.client_obj,
            created_by=self.actor,
            content='hello world',
            media_type='text',
            target_platforms=['facebook', 'instagram'],
            status='queued',
        )
        defaults.update(kwargs)
        return UnifiedPost.objects.create(**defaults)

    # ── Happy path ───────────────────────────────────────────────────────
    def test_fanout_publishes_to_all_targets_and_marks_published(self):
        post = self._make_post(media_type='text')
        # IG doesn't support text; orchestrator will skip via PublishError(supported=False).
        # For this test we use carousel-style media so both publishers work.
        post.media_type = 'image'
        post.media_urls = ['https://x/img.jpg']
        post.save()

        with patch.object(__import__('social_stats.publishers.facebook', fromlist=['FacebookPublisher']).FacebookPublisher,
                          'publish_image',
                          return_value=PublishResult(success=True, platform_post_id='fb1', platform_url='https://fb/1')) as fb_m, \
             patch.object(__import__('social_stats.publishers.instagram', fromlist=['InstagramPublisher']).InstagramPublisher,
                          'publish_image',
                          return_value=PublishResult(success=True, platform_post_id='ig1', platform_url='https://ig/1')) as ig_m:
            from social_stats.orchestrator import publish_unified_post
            publish_unified_post(post.id)

        post.refresh_from_db()
        self.assertEqual(post.status, 'published')
        self.assertIsNotNone(post.published_at)

        logs = {pl.platform: pl for pl in post.publish_logs.all()}
        self.assertEqual(logs['facebook'].status, 'success')
        self.assertEqual(logs['facebook'].platform_post_id, 'fb1')
        self.assertEqual(logs['instagram'].status, 'success')
        self.assertEqual(logs['instagram'].platform_post_id, 'ig1')

        fb_m.assert_called_once()
        ig_m.assert_called_once()

    # ── Partial: one success, one failed ─────────────────────────────────
    def test_partial_status_when_one_fails(self):
        post = self._make_post(media_type='image', media_urls=['https://x/img.jpg'])
        from social_stats.publishers.facebook import FacebookPublisher
        from social_stats.publishers.instagram import InstagramPublisher

        with patch.object(FacebookPublisher, 'publish_image',
                          return_value=PublishResult(success=True, platform_post_id='fb1')), \
             patch.object(InstagramPublisher, 'publish_image',
                          side_effect=PublishError('IG broken', code='graph_error')):
            from social_stats.orchestrator import publish_unified_post
            publish_unified_post(post.id)

        post.refresh_from_db()
        self.assertEqual(post.status, 'partial')
        logs = {pl.platform: pl for pl in post.publish_logs.all()}
        self.assertEqual(logs['facebook'].status, 'success')
        self.assertEqual(logs['instagram'].status, 'failed')
        self.assertEqual(logs['instagram'].error_code, 'graph_error')

    # ── Token expired: deactivates cred + writes Alert ───────────────────
    def test_token_expired_deactivates_cred_and_writes_alert(self):
        post = self._make_post(media_type='image', media_urls=['https://x/img.jpg'])
        from social_stats.publishers.facebook import FacebookPublisher
        from social_stats.publishers.instagram import InstagramPublisher

        with patch.object(FacebookPublisher, 'publish_image',
                          side_effect=TokenExpiredError('expired')), \
             patch.object(InstagramPublisher, 'publish_image',
                          return_value=PublishResult(success=True, platform_post_id='ig1')):
            from social_stats.orchestrator import publish_unified_post
            publish_unified_post(post.id)

        fb_cred = PlatformCredential.objects.get(client=self.client_obj, platform='facebook')
        self.assertFalse(fb_cred.is_active)
        self.assertEqual(fb_cred.auth_failure_code, 'token_expired')

        alerts = Alert.objects.filter(client=self.client_obj, platform='facebook',
                                       alert_type='token_expired')
        self.assertEqual(alerts.count(), 1)

        post.refresh_from_db()
        self.assertEqual(post.status, 'partial')

    # ── No credential: parent fails, no API call attempted ───────────────
    def test_missing_credential_marks_failed(self):
        # Remove the FB cred
        PlatformCredential.objects.filter(client=self.client_obj, platform='facebook').delete()
        post = self._make_post(media_type='image', media_urls=['https://x/img.jpg'],
                               target_platforms=['facebook'])
        from social_stats.orchestrator import publish_unified_post
        publish_unified_post(post.id)

        post.refresh_from_db()
        self.assertEqual(post.status, 'failed')
        log = post.publish_logs.get(platform='facebook')
        self.assertEqual(log.status, 'failed')
        self.assertEqual(log.error_code, 'no_credential')

    # ── Approval gate ────────────────────────────────────────────────────
    def test_approval_gate_blocks_publish_until_approved(self):
        self.client_obj.requires_approval = True
        self.client_obj.save(update_fields=['requires_approval'])
        post = self._make_post(media_type='image', media_urls=['https://x/img.jpg'])

        from social_stats.orchestrator import publish_unified_post
        # First call: should be parked in pending_approval, no API calls.
        with patch('social_stats.publishers.facebook.FacebookPublisher.publish_image') as fb_m:
            publish_unified_post(post.id)
            fb_m.assert_not_called()

        post.refresh_from_db()
        self.assertEqual(post.status, 'pending_approval')

    # ── Status update helper ─────────────────────────────────────────────
    def test_update_unified_post_status_aggregates_children(self):
        from social_stats.orchestrator import update_unified_post_status
        post = self._make_post(media_type='image', media_urls=['https://x/img.jpg'])
        # Manually create logs simulating mixed outcome
        PlatformPublishLog.objects.create(unified_post=post, platform='facebook', status='success')
        PlatformPublishLog.objects.create(unified_post=post, platform='instagram', status='failed')
        update_unified_post_status(post.id)
        post.refresh_from_db()
        self.assertEqual(post.status, 'partial')


    def test_partial_retry_preserves_successful_delivery(self):
        post = self._make_post(status='partial', media_type='image', media_urls=['https://x/img.jpg'])
        PlatformPublishLog.objects.create(unified_post=post, platform='facebook', status='success',
                                         platform_post_id='already-sent')
        PlatformPublishLog.objects.create(unified_post=post, platform='instagram', status='failed')
        with patch('social_stats.publishers.facebook.FacebookPublisher.publish_image') as fb, \
             patch('social_stats.publishers.instagram.InstagramPublisher.publish_image',
                   return_value=PublishResult(success=True, platform_post_id='ig1')) as ig:
            from social_stats.orchestrator import publish_unified_post
            publish_unified_post(post.id)
        fb.assert_not_called()
        ig.assert_called_once()
        self.assertEqual(post.publish_logs.get(platform='facebook').platform_post_id, 'already-sent')
        post.refresh_from_db()
        self.assertEqual(post.status, 'published')

    def test_redelivered_worker_does_not_send_completed_or_claimed_delivery(self):
        from social_stats.orchestrator import publish_to_platform
        for status in ('success', 'publishing'):
            post = self._make_post(status='publishing', target_platforms=['facebook'])
            PlatformPublishLog.objects.create(unified_post=post, platform='facebook', status=status)
            with patch('social_stats.publishers.facebook.FacebookPublisher.publish_text') as send:
                publish_to_platform(post.id, 'facebook')
            send.assert_not_called()

    def test_ambiguous_delivery_is_not_automatically_resent(self):
        post = self._make_post(status='failed', target_platforms=['facebook'])
        PlatformPublishLog.objects.create(unified_post=post, platform='facebook', status='failed',
                                         error_code='timeout')
        with patch('social_stats.publishers.facebook.FacebookPublisher.publish_text') as send:
            from social_stats.orchestrator import publish_unified_post
            publish_unified_post(post.id)
        send.assert_not_called()
        self.assertEqual(post.publish_logs.get().error_code, 'timeout')

    def test_structured_message_ids_are_retained_on_delivery_log(self):
        post = self._make_post(target_platforms=['facebook'])
        with patch('social_stats.publishers.facebook.FacebookPublisher.publish_text',
                   return_value=PublishResult(success=True, platform_post_id='1,2',
                                              platform_post_ids=['1', '2'])):
            from social_stats.orchestrator import publish_unified_post
            publish_unified_post(post.id)
        self.assertEqual(post.publish_logs.get().raw_response['platform_post_ids'], ['1', '2'])

    def test_rate_limit_uses_celery_countdown_and_bounded_retry_budget(self):
        from celery.exceptions import Retry
        from social_stats.orchestrator import publish_to_platform
        from social_stats.publishers.base import RateLimitError
        post = self._make_post(status='publishing', target_platforms=['facebook'])
        with patch('social_stats.publishers.facebook.FacebookPublisher.publish_text',
                   side_effect=RateLimitError(retry_after=117)), \
             patch.object(publish_to_platform, 'retry', side_effect=Retry()) as retry:
            with self.assertRaises(Retry):
                publish_to_platform(post.id, 'facebook')
        self.assertEqual(retry.call_args.kwargs['countdown'], 117)
        self.assertEqual(post.publish_logs.get().status, 'pending')
        publish_to_platform.push_request(retries=3)
        try:
            with patch('social_stats.publishers.facebook.FacebookPublisher.publish_text',
                       side_effect=RateLimitError(retry_after=117)), \
                 patch.object(publish_to_platform, 'retry') as retry:
                publish_to_platform.run(post.id, 'facebook')
            retry.assert_not_called()
            self.assertEqual(post.publish_logs.get().status, 'failed')
        finally:
            publish_to_platform.pop_request()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class SchedulerTests(TestCase):
    def setUp(self):
        self.client_obj = Client.objects.create(
            name='Acme', company='Acme Inc', email=f'acme-{id(self)}@x.test',
        )
        self.actor = User.objects.create_user(username='publisher')
        self.client_obj.owner_user = self.actor
        self.client_obj.save(update_fields=['owner_user'])
        PlatformCredential.objects.create(
            client=self.client_obj, platform='facebook',
            access_token='tok', page_id='100', is_active=True,
        )

    def test_process_scheduled_posts_picks_up_due_posts(self):
        post = UnifiedPost.objects.create(
            client=self.client_obj,
            created_by=self.actor,
            content='hi', media_type='text',
            target_platforms=['facebook'],
            status='scheduled',
            scheduled_at=timezone.now() - timedelta(seconds=30),
        )
        with patch('social_stats.publishers.facebook.FacebookPublisher.publish_text',
                   return_value=PublishResult(success=True, platform_post_id='fb1')) as fb_m:
            from social_stats.scheduler import process_scheduled_posts
            n = process_scheduled_posts()

        self.assertEqual(n, 1)
        fb_m.assert_called_once()
        post.refresh_from_db()
        self.assertEqual(post.status, 'published')

    def test_process_scheduled_posts_skips_future_posts(self):
        UnifiedPost.objects.create(
            client=self.client_obj,
            created_by=self.actor,
            content='later', media_type='text',
            target_platforms=['facebook'],
            status='scheduled',
            scheduled_at=timezone.now() + timedelta(hours=1),
        )
        from social_stats.scheduler import process_scheduled_posts
        with patch('social_stats.publishers.facebook.FacebookPublisher.publish_text') as fb_m:
            n = process_scheduled_posts()
        self.assertEqual(n, 0)
        fb_m.assert_not_called()
