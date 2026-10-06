"""Stage 5: real HTTP intent boundary plus transport-free provider delivery."""
from copy import deepcopy
from dataclasses import replace
from datetime import timedelta
from unittest.mock import patch
from uuid import uuid4

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from social_stats.models import PlatformCredential, SocialAccount, Client, UnifiedPost, MediaAsset, PostQueue, QueuedItem, SocialAccountPermissionOverride, PlatformPublishLog
from social_stats.platforms.connection_service import ConnectionService
from social_stats.platforms.manifest import Capability, PublishingMode
from social_stats.platforms.base import ProviderError
from social_stats.publishing_contract import validate_intent
from social_stats.orchestrator import publish_unified_post, publish_to_platform
from .test_provider_conformance import FixtureRegistration


class ComposerContractTests(FixtureRegistration, TestCase):
    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(username='composer-owner')
        self.workspace = Client.objects.create(name='Stage5', company='Stage5', email='stage5@example.test', owner_user=self.user)
        self.other = Client.objects.create(name='Other', company='Other', email='other-stage5@example.test')
        self.api = APIClient()
        self.api.force_authenticate(self.user)
        self.credentials = [ConnectionService().connect(self.workspace, self.provider.key, {'token': 'SECRET-NOT-PUBLIC', 'destination_id': name})[0] for name in ('first', 'second')]
        self.payload = {'title': 'Title', 'content': 'text', 'media_type': 'text', 'media_urls': [], 'target_platforms': [self.provider.key],
                        'platform_overrides': {self.provider.key: {'account_targets': [{'social_account_id': cred.social_account_id, 'destination_id': cred.social_account.external_id} for cred in self.credentials]}}}
        self.url = f'/api/composer/posts/?workspace_id={self.workspace.pk}'

    def save(self, payload=None, key=None):
        headers = {'HTTP_IDEMPOTENCY_KEY': str(key)} if key else {}
        return self.api.post(self.url, payload or self.payload, format='json', **headers)

    def post(self, payload=None, **kwargs):
        return UnifiedPost.objects.create(client=self.workspace, created_by=self.user, **(payload or self.payload), **kwargs)

    def scheduling(self):
        cls = type(self.provider)
        before = cls.manifest
        self.addCleanup(setattr, cls, 'manifest', before)
        cls.manifest = replace(before, support={**before.support, 'scheduling': 'supported'})

    def test_standard_fixture_validates_publishes_and_accounts_have_distinct_logs(self):
        saved = self.save()
        self.assertEqual(saved.status_code, 201, saved.data)
        post = UnifiedPost.objects.get(pk=saved.data['id'])
        post.status = 'queued'
        post.save()
        with patch('social_stats.orchestrator.publish_to_platform.delay', side_effect=lambda *args: publish_to_platform(*args)):
            publish_unified_post(post.pk)
            publish_unified_post(post.pk)
        post.refresh_from_db()
        self.assertEqual(post.status, 'published')
        self.assertEqual(set(post.publish_logs.values_list('social_account_id', flat=True)), {c.social_account_id for c in self.credentials})
        self.assertEqual(len(self.provider.deliveries), 2)

    def test_boundaries_and_disabled_capability_never_reach_provider(self):
        for length, status in ((100, 201), (101, 400)):
            with self.subTest(length=length):
                payload = {**self.payload, 'content': 'x' * length}
                response = self.save(payload)
                self.assertEqual(response.status_code, status, response.data)
        cls = type(self.provider)
        before = cls.manifest
        self.addCleanup(setattr, cls, 'manifest', before)
        cls.manifest = replace(before, support={**before.support, 'publish_text': 'not_available'}, constraints={})
        response = self.save()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['code'], 'unsupported')
        self.assertFalse(self.provider.deliveries)

    def test_account_destination_media_and_scope_isolation(self):
        other_cred, _ = ConnectionService().connect(self.other, self.provider.key, {'token': 'fake', 'destination_id': 'third'})
        for target in ({'social_account_id': other_cred.social_account_id},
                       {'social_account_id': self.credentials[0].social_account_id, 'destination_id': 'unowned'}):
            payload = deepcopy(self.payload)
            payload['platform_overrides'][self.provider.key]['account_targets'] = [target]
            response = self.save(payload)
            # Saving checks account isolation; destination checks run before scheduling/publish.
            if response.status_code == 201:
                response = self.api.post(f"/api/composer/posts/{response.data['id']}/publish_now/")
            self.assertIn(response.status_code, (400, 403), response.data)
        self.credentials[0].scope = ''
        self.credentials[0].save()
        post = self.post()
        response = self.api.post(f'/api/composer/posts/{post.pk}/publish_now/')
        self.assertEqual(response.status_code, 403)
        self.assertFalse(self.provider.deliveries)

    def test_account_permission_and_readiness_rechecked(self):
        post = self.post()
        SocialAccountPermissionOverride.objects.create(user=self.user, account=self.credentials[0].social_account, permissions={'publish_posts': False})
        response = self.api.post(f'/api/composer/posts/{post.pk}/publish_now/')
        self.assertEqual(response.status_code, 403)
        SocialAccountPermissionOverride.objects.all().delete()
        self.credentials[0].expires_at = timezone.now() - timedelta(seconds=1)
        self.credentials[0].save()
        response = self.api.post(f'/api/composer/posts/{post.pk}/publish_now/')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['code'], 'token_expired')

    def test_duplicate_save_retry_has_a_workspace_and_actor_scoped_key(self):
        key = uuid4()
        first, second = self.save(key=key), self.save(key=key)
        self.assertEqual(first.data['id'], second.data['id'])
        self.assertEqual(UnifiedPost.objects.count(), 1)
        conflict = self.save({**self.payload, 'content': 'changed'}, key)
        self.assertEqual(conflict.status_code, 409)
        response = self.api.get('/api/composer/posts/resolve_intent/', {'workspace_id': self.workspace.pk, 'intent_key': str(key)})
        self.assertEqual(response.data['id'], first.data['id'])
        self.assertNotIn('SECRET-NOT-PUBLIC', str(response.data))
        self.api.force_authenticate(User.objects.create_user(username='outsider'))
        self.assertEqual(self.api.get('/api/composer/posts/resolve_intent/', {'intent_key': str(key)}).status_code, 404)

    def test_schedule_requires_capability_and_aware_timestamp(self):
        post = self.post()
        path = f'/api/composer/posts/{post.pk}/schedule/'
        when = timezone.now() + timedelta(days=1)
        response = self.api.post(path, {'scheduled_at': when.isoformat()}, format='json')
        self.assertEqual(response.status_code, 400)
        self.scheduling()
        self.assertEqual(self.api.post(path, {'scheduled_at': when.replace(tzinfo=None).isoformat()}, format='json').status_code, 400)
        self.assertEqual(self.api.post(path, {'scheduled_at': when.isoformat()}, format='json').status_code, 200)
        post.refresh_from_db()
        self.assertEqual(post.scheduled_at, when)
        self.assertEqual(post.platform_overrides, self.payload['platform_overrides'])

    def test_queue_snapshot_is_scoped_faithful_and_deduplicated(self):
        self.scheduling()
        post = self.post()
        queue = PostQueue.objects.create(client=self.workspace, name='Queue', platforms=[self.provider.key])
        path = f'/api/composer/posts/{post.pk}/add_to_queue/'
        first = self.api.post(path, {'queue_id': queue.pk}, format='json')
        second = self.api.post(path, {'queue_id': queue.pk}, format='json')
        self.assertEqual(first.status_code, 201, first.data)
        self.assertEqual(first.data['id'], second.data['id'])
        item = QueuedItem.objects.get(pk=first.data['id'])
        self.assertEqual(item.platform_overrides, post.platform_overrides)
        wrong = PostQueue.objects.create(client=self.workspace, name='Wrong', platforms=['facebook'])
        self.assertEqual(self.api.post(path, {'queue_id': wrong.pk}, format='json').status_code, 400)
        other = PostQueue.objects.create(client=self.other, name='Other', platforms=[self.provider.key])
        self.assertEqual(self.api.post(path, {'queue_id': other.pk}, format='json').status_code, 404)

    def test_media_constraints_are_enforced_before_delivery(self):
        cls = type(self.provider)
        before = cls.manifest
        self.addCleanup(setattr, cls, 'manifest', before)
        cls.manifest = replace(before, support={**before.support, 'publish_image': 'supported'}, publishing_modes={
            'image': PublishingMode('publish_image', Capability('supported', max_items=1, max_bytes=100,
                                      mime_types=('image/jpeg',), aspect_min=0.8, aspect_max=1.9, max_seconds=10))})
        asset = MediaAsset.objects.create(client=self.workspace, file_size=100, mime_type='image/jpeg', width=100, height=100, duration_seconds=10)
        payload = {**self.payload, 'media_type': 'image', 'media_urls': [f'asset:{asset.pk}']}
        validate_intent(payload, self.workspace, self.user, ready=True)
        for field, value, code in [('file_size', 101, 'media_size'), ('mime_type', 'image/png', 'media_type'),
                                   ('width', 200, 'media_aspect'), ('duration_seconds', 11, 'media_duration')]:
            setattr(asset, field, value)
            asset.save()
            with self.assertRaises(ProviderError) as ctx:
                validate_intent(payload, self.workspace, self.user, ready=True)
            self.assertEqual(ctx.exception.code, code)
            setattr(asset, field, {'file_size': 100, 'mime_type': 'image/jpeg', 'width': 100, 'duration_seconds': 10}[field])
            asset.save()
        self.assertFalse(self.provider.deliveries)

    def test_approval_retains_intent_and_future_schedule(self):
        self.scheduling()
        self.workspace.requires_approval = True
        self.workspace.save()
        post = self.post()
        when = timezone.now() + timedelta(days=2)
        response = self.api.post(f'/api/composer/posts/{post.pk}/schedule/', {'scheduled_at': when.isoformat()}, format='json')
        self.assertEqual(response.status_code, 202, response.data)
        post.refresh_from_db()
        self.assertEqual(post.status, 'pending_approval')
        self.assertEqual(post.scheduled_at, when)
        with patch('social_stats.orchestrator.publish_unified_post.delay') as send:
            response = self.api.post(f'/api/composer/posts/{post.pk}/approve/')
            self.assertEqual(response.status_code, 200, response.data)
            self.assertEqual(response.data['status'], 'scheduled')
            send.assert_not_called()
        self.assertEqual(response.data['platform_overrides'], self.payload['platform_overrides'])

    def test_duplicate_preserves_media_order_extensions_and_destinations(self):
        post = self.post()
        response = self.api.post(f'/api/composer/posts/{post.pk}/duplicate/')
        self.assertEqual(response.status_code, 201)
        for field in ('content', 'media_urls', 'media_type', 'target_platforms', 'platform_overrides'):
            self.assertEqual(response.data[field], getattr(post, field))

    def test_legacy_success_is_preserved_when_target_becomes_explicit(self):
        post = self.post(status='partial')
        PlatformPublishLog.objects.create(unified_post=post, platform=self.provider.key,
            social_account=self.credentials[0].social_account, status='success', platform_post_id='already-sent')
        with patch('social_stats.orchestrator.publish_to_platform.delay', side_effect=lambda *args: publish_to_platform(*args)):
            publish_unified_post(post.pk)
        self.assertEqual(len(self.provider.deliveries), 1)
        self.assertEqual(post.publish_logs.count(), 2)
        self.assertTrue(post.publish_logs.filter(account_target_id=self.credentials[0].social_account_id, platform_post_id='already-sent').exists())

    def test_edited_intent_cannot_be_revived_by_stale_fanout(self):
        post = self.post(status='queued')
        from social_stats import authorization
        original = authorization.post_decision
        def edit_during_check(stale):
            decision = original(stale)
            UnifiedPost.objects.filter(pk=post.pk).update(status='draft', content='Edited after task started')
            return decision
        with patch('social_stats.authorization.post_decision', side_effect=edit_during_check), patch('social_stats.orchestrator.publish_to_platform.delay') as send:
            publish_unified_post(post.pk)
            send.assert_not_called()
        post.refresh_from_db()
        self.assertEqual(post.status, 'draft')
        self.assertFalse(self.provider.deliveries)

    def test_telegram_poll_fidelity_through_draft_edit_duplicate_schedule_and_queue(self):
        cred = PlatformCredential.objects.create(client=self.workspace, platform='telegram', access_token='private-test-token')
        account = SocialAccount.objects.create(client=self.workspace, platform='telegram', external_id='-100', display_name='Channel')
        cred.social_account = account
        cred.save()
        options = {'social_account_id': account.pk, 'destination_id': '-100',
            'destination_context': {'destination_type': 'forum_supergroup', 'message_thread_id': 22},
            'poll': {'question': 'Pick?', 'options': ['A', 'B'], 'is_anonymous': True, 'allows_multiple_answers': True}}
        payload = {**self.payload, 'content': '', 'media_type': 'poll', 'target_platforms': ['telegram'], 'platform_overrides': {'telegram': options}}
        response = self.save(payload)
        self.assertEqual(response.status_code, 201, response.data)
        post_id = response.data['id']
        path = f'/api/composer/posts/{post_id}/'
        response = self.api.patch(path, {'title': 'Edited'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['platform_overrides'], payload['platform_overrides'])
        response = self.api.post(path + 'duplicate/')
        self.assertEqual(response.data['platform_overrides'], payload['platform_overrides'])
        when = timezone.now() + timedelta(days=1)
        response = self.api.post(path + 'schedule/', {'scheduled_at': when.isoformat()}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['platform_overrides'], payload['platform_overrides'])
        self.api.patch(path, {'title': 'Queue copy'}, format='json')
        queue = PostQueue.objects.create(client=self.workspace, name='Telegram', platforms=['telegram'])
        response = self.api.post(path + 'add_to_queue/', {'queue_id': queue.pk}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['platform_overrides'], payload['platform_overrides'])

    def test_stale_task_cannot_publish_a_rescheduled_future_intent(self):
        post = self.post(status='scheduled', scheduled_at=timezone.now() + timedelta(days=1))
        with patch('social_stats.orchestrator.publish_to_platform.delay') as send:
            publish_unified_post(post.pk)
            send.assert_not_called()
        post.refresh_from_db()
        self.assertEqual(post.status, 'scheduled')
        self.assertFalse(self.provider.deliveries)

    def test_non_string_mode_is_typed_and_never_calls_provider(self):
        payload = deepcopy(self.payload)
        payload['platform_overrides'][self.provider.key]['media_type'] = []
        response = self.save(payload)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['code'], 'invalid_request')
        self.assertFalse(self.provider.deliveries)

    def test_publication_result_never_exposes_selected_credential(self):
        from social_stats.publishers.base import PublishResult
        post = self.post(status='queued')
        result = PublishResult(success=True, platform_post_id='public-id',
            platform_url='https://example.org/post?access_token=SECRET-NOT-PUBLIC',
            raw_response={'token': 'SECRET-NOT-PUBLIC', 'content': 'private-provider-copy'})
        with patch.object(type(self.provider), 'publish_request', return_value=result), patch('social_stats.orchestrator.publish_to_platform.delay', side_effect=lambda *args: publish_to_platform(*args)):
            publish_unified_post(post.pk)
        response = self.api.get(f'/api/composer/posts/{post.pk}/')
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('SECRET-NOT-PUBLIC', str(response.data))
        self.assertNotIn('private-provider-copy', str(response.data))

    def test_malformed_or_uncertain_provider_outcome_cannot_claim_success_or_replay(self):
        from social_stats.publishers.base import PublishResult
        for result in (None, PublishResult(success='true', platform_post_id='invalid-boolean')):
            with self.subTest(result=result):
                post = self.post(status='queued')
                with patch.object(type(self.provider), 'publish_request', return_value=result) as send, patch('social_stats.orchestrator.publish_to_platform.delay', side_effect=lambda *args: publish_to_platform(*args)):
                    publish_unified_post(post.pk)
                    publish_unified_post(post.pk)
                    self.assertEqual(send.call_count, 2)
                self.assertFalse(post.publish_logs.filter(status='success').exists())
                self.assertEqual(set(post.publish_logs.values_list('error_code', flat=True)), {'invalid_response'})
