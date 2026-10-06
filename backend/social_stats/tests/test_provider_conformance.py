"""Manifest-selected conformance plus an independently discovered reference adapter."""

import importlib
import json
import sys
from dataclasses import replace
from io import StringIO
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from django.core.management import call_command
from django.test import SimpleTestCase, TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from django.contrib.auth.models import User

from social_stats.models import Client, PlatformCredential, UserProfile
from social_stats.platform_registry import public_registry
from social_stats.platforms import get_provider
from social_stats.platforms.base import (
    ConnectionResult,
    ProviderError,
    ProviderResult,
    StatsResult,
)
from social_stats.platforms.conformance import (
    conformance_errors,
    registered_conformance_errors,
)
from social_stats.platforms.connection_service import ConnectionService
from social_stats.platforms.contracts import (
    DestinationContext,
    PublishRequest,
    InboundEvent,
    ReplyRequest,
)
from social_stats.platforms.execution import ProviderExecution
from social_stats.platforms.manifest import Capability
from social_stats.platforms import provider_registry as registry
from social_stats.publishers.base import PublishError, RateLimitError

FIXTURE_MODULE = 'social_stats.tests.platform_fixtures.example'


class FixtureRegistration:
    def setUp(self):
        super().setUp()
        registry._autoload()
        self.before_providers = dict(registry._PROVIDERS)
        self.before_manifests = dict(registry._MANIFESTS)
        self.addCleanup(self.restore_registry)
        sys.modules.pop(FIXTURE_MODULE, None)
        self.module = importlib.import_module(FIXTURE_MODULE)
        self.provider = get_provider('contract_example')
        self.provider.deliveries.clear()
        self.provider.events.clear()
        self.provider.threads.clear()

    def restore_registry(self):
        registry._PROVIDERS.clear()
        registry._PROVIDERS.update(self.before_providers)
        registry._MANIFESTS.clear()
        registry._MANIFESTS.update(self.before_manifests)
        sys.modules.pop(FIXTURE_MODULE, None)


class RegisteredProviderConformanceTests(SimpleTestCase):
    def test_every_registered_provider(self):
        for provider in registry.iter_providers():
            with self.subTest(provider=provider.manifest.key):
                self.assertEqual(conformance_errors(provider), [])
        self.assertEqual(registered_conformance_errors(), [])

    def test_every_provider_rejects_disabled_operations_before_adapter(self):
        for provider in registry.iter_providers():
            with self.subTest(provider=provider.manifest.key):
                account = SimpleNamespace(
                    pk=7,
                    client_id=2,
                    platform=provider.manifest.key,
                    external_id='account',
                    is_active=True,
                )
                credential = SimpleNamespace(
                    social_account=account,
                    client_id=2,
                    platform=provider.manifest.key,
                    is_active=True,
                    is_expired=False,
                    access_token='test-only',
                    scope='',
                )
                destination = DestinationContext(
                    7, 2, kind=provider.manifest.destination_types[0]
                )
                execution = ProviderExecution(provider, credential, destination)
                self.assertTrue(execution.call('health').ready)
                with patch.object(provider, 'publish_request') as adapter:
                    with self.assertRaises(ProviderError) as ctx:
                        execution.call(
                            'publish',
                            PublishRequest(
                                media_type='unknown', idempotency_key='intent'
                            ),
                        )
                    self.assertEqual(ctx.exception.code, 'unsupported')
                    adapter.assert_not_called()
                with self.assertRaises(ProviderError) as ctx:
                    ProviderExecution(
                        provider, credential, replace(destination, workspace_id=3)
                    ).call('health')
                self.assertEqual(ctx.exception.code, 'scope_denied')

    def test_ci_runner(self):
        output = StringIO()
        call_command('check_provider_conformance', stdout=output)
        self.assertIn('11 providers', output.getvalue())

    def test_discovery_order_and_catalogue_are_deterministic(self):
        modules = registry.discover_modules('social_stats.platforms.providers')
        self.assertEqual(modules, tuple(sorted(modules)))
        self.assertEqual(public_registry(), public_registry())
        self.assertNotIn(
            'contract_example', [p['key'] for p in public_registry()['platforms']]
        )


class ReferenceFixtureTests(FixtureRegistration, SimpleTestCase):
    def setUp(self):
        super().setUp()
        account = SimpleNamespace(
            pk=7,
            client_id=2,
            platform=self.provider.key,
            external_id='fake-account',
            is_active=True,
        )
        self.credential = SimpleNamespace(
            social_account=account,
            client_id=2,
            platform=self.provider.key,
            is_active=True,
            is_expired=False,
            access_token='DO-NOT-LEAK',
            scope='publish',
        )
        self.destination = DestinationContext(7, 2, remote_id='fake-account')
        self.execution = ProviderExecution(
            self.provider, self.credential, self.destination
        )

    def test_fixture_is_in_runtime_and_real_metadata_endpoint(self):
        api = APIClient()
        response = api.get(reverse('platform_metadata'))
        self.assertEqual(response.status_code, 200)
        metadata = next(
            p for p in response.json()['platforms'] if p['key'] == self.provider.key
        )
        self.assertEqual(metadata['capabilities']['publish_text'], 'supported')
        self.assertEqual(metadata['auth_type'], 'custom')
        root = Path(__file__).resolve().parents[3]
        shared = json.loads(
            (
                root / 'frontend/src/services/__fixtures__/platformExample.json'
            ).read_text()
        )
        self.assertEqual(shared['platforms'][0], json.loads(json.dumps(metadata)))
        self.assertEqual(conformance_errors(self.provider), [])
        self.assertNotIn('DO-NOT-LEAK', json.dumps(response.json()))
        self.assertNotIn(
            'access_token', repr(ConnectionResult(access_token='DO-NOT-LEAK'))
        )

    def test_duplicate_key_fails_before_mutating_registry(self):
        before = dict(registry._PROVIDERS)
        with self.assertRaisesRegex(ValueError, 'registration.duplicate'):
            registry.register_provider(
                type('Duplicate', (self.module.ExampleProvider,), {})
            )
        self.assertEqual(before, registry._PROVIDERS)

    def test_alias_collision_and_legacy_opt_out_fail_fast(self):
        for manifest, message in [
            (
                replace(
                    self.provider.manifest, key='gmb', output_service='other_fixture'
                ),
                'registration.duplicate',
            ),
            (
                replace(
                    self.provider.manifest,
                    key='other_fixture',
                    output_service='other_fixture',
                    legacy_adapter=True,
                ),
                'registration.legacy',
            ),
        ]:
            with (
                self.subTest(message=message),
                self.assertRaisesRegex(ValueError, message),
            ):
                registry.register_provider(
                    type(
                        'InvalidProvider',
                        (self.module.ExampleProvider,),
                        {'key': manifest.output_service, 'manifest': manifest},
                    )
                )
        with self.assertRaisesRegex(ValueError, 'registration.key'):
            registry.register_provider(
                type(
                    'WrongAlias', (self.module.ExampleProvider,), {'key': 'wrong_alias'}
                )
            )

    def test_manifest_validation_reports_broken_contract(self):
        for changes, message in [
            ({'auth_type': 'password'}, 'manifest.auth_type'),
            ({'status': 'production'}, 'manifest.status'),
            ({'category': 'unknown'}, 'manifest.category'),
            ({'support': {'publish_text': 'yes'}}, 'manifest.support'),
        ]:
            with (
                self.subTest(changes=changes),
                self.assertRaisesRegex(ValueError, message),
            ):
                replace(self.provider.manifest, **changes)
        with self.assertRaisesRegex(ValueError, 'max_items'):
            Capability(max_items=-1)

    def test_unsupported_capability_rejected_before_adapter_call(self):
        with patch.object(self.provider, 'publish_request') as adapter:
            with self.assertRaises(ProviderError) as ctx:
                self.execution.call(
                    'publish',
                    PublishRequest(media_type='video', idempotency_key='intent'),
                )
            self.assertEqual(ctx.exception.code, 'unsupported')
            adapter.assert_not_called()

    def test_scope_is_fail_closed(self):
        for destination in [
            replace(self.destination, workspace_id=3),
            replace(self.destination, account_id=8),
            replace(self.destination, remote_id='other-account'),
            replace(self.destination, kind='topic'),
        ]:
            with (
                self.subTest(destination=destination),
                patch.object(self.provider, 'health') as adapter,
            ):
                with self.assertRaises(ProviderError) as ctx:
                    ProviderExecution(self.provider, self.credential, destination).call(
                        'health'
                    )
                self.assertEqual(ctx.exception.code, 'scope_denied')
                adapter.assert_not_called()
        self.credential.social_account.client_id = 3
        with self.assertRaises(ProviderError):
            self.execution.call('health')

    def test_validation_permissions_and_idempotency_before_network(self):
        for request in [
            PublishRequest(content='x' * 101, idempotency_key='intent'),
            PublishRequest(content='hello'),
            PublishRequest(idempotency_key='intent', extensions={'unknown': 'value'}),
        ]:
            with (
                self.subTest(request=request),
                patch.object(self.provider, 'publish_request') as adapter,
            ):
                with self.assertRaises(ProviderError):
                    self.execution.call('publish', request)
                adapter.assert_not_called()
        self.credential.scope = ''
        with self.assertRaises(ProviderError) as ctx:
            self.execution.call('publish', PublishRequest(idempotency_key='intent'))
        self.assertEqual(ctx.exception.code, 'permission_denied')

    def test_typed_publish_fidelity_and_account_scoped_idempotency(self):
        request = PublishRequest(
            content='approved content', idempotency_key='scheduled-intent'
        )
        with patch.object(
            self.provider.publisher,
            'publish_text',
            wraps=self.provider.publisher.publish_text,
        ) as adapter:
            first = self.execution.call('publish', request)
            self.assertIs(first, self.execution.call('publish', request))
            adapter.assert_called_once_with(self.credential, 'approved content')
        self.assertEqual(len(self.provider.deliveries), 1)

    def test_inbound_authenticity_cursor_and_deduplication(self):
        with patch.object(self.provider, 'ingest') as adapter:
            with self.assertRaises(ProviderError):
                self.execution.call('ingest', InboundEvent('event'))
            adapter.assert_not_called()
        event = InboundEvent('event', authenticity_verified=True, cursor='next')
        first = self.execution.call('ingest', event)
        self.assertEqual(first.cursor, 'next')
        self.assertEqual(len(first.items), 1)
        self.assertEqual(self.execution.call('ingest', event).items, [])

    def test_lifecycle_metrics_and_reply_results(self):
        self.assertTrue(self.execution.call('health').ready)
        self.assertIsInstance(self.execution.call('refresh'), ConnectionResult)
        self.assertIsInstance(self.execution.call('disconnect'), ProviderResult)
        self.assertEqual(self.execution.call('sync').metrics, {'views': 1})
        self.assertEqual(self.execution.call('analytics').raw_response, {})
        event = self.execution.call(
            'ingest', InboundEvent('reply-event', authenticity_verified=True)
        )
        thread_id = event.items[0]['thread_id']
        self.assertEqual(
            self.execution.call('reply', ReplyRequest(thread_id, 'reply')).data[
                'thread_id'
            ],
            thread_id,
        )
        with self.assertRaises(ProviderError) as ctx:
            self.execution.call('reply', ReplyRequest('thread:2:8', 'cross-account'))
        self.assertEqual(ctx.exception.code, 'permission_denied')
        self.credential.is_expired = True
        self.assertEqual(self.execution.call('health').state, 'expired')
        with self.assertRaises(ProviderError) as ctx:
            self.execution.call('sync')
        self.assertEqual(ctx.exception.code, 'token_expired')

    def test_errors_are_typed_redacted_and_preserve_backoff(self):
        for error in [
            PublishError(
                'DO-NOT-LEAK', code='invalid_response', raw={'token': 'DO-NOT-LEAK'}
            ),
            RateLimitError('DO-NOT-LEAK', retry_after=12),
            RuntimeError('DO-NOT-LEAK'),
        ]:
            with (
                self.subTest(error=type(error).__name__),
                patch.object(self.provider, 'sync', side_effect=error),
            ):
                with self.assertRaises(ProviderError) as ctx:
                    self.execution.call('sync')
                self.assertNotIn('DO-NOT-LEAK', str(ctx.exception))
                self.assertIsNone(ctx.exception.raw)
                if isinstance(error, RateLimitError):
                    self.assertEqual(ctx.exception.retry_after, 12)
        with patch.object(self.provider, 'sync', return_value={'untyped': True}):
            with self.assertRaises(ProviderError) as ctx:
                self.execution.call('sync')
            self.assertEqual(ctx.exception.code, 'invalid_response')

    def test_egress_and_media_inputs_follow_shared_policy(self):
        with self.assertRaises(ProviderError) as ctx:
            self.provider.outbound_request('GET', 'https://example.test/')
        self.assertEqual(ctx.exception.code, 'egress_denied')
        self.provider.manifest = replace(
            self.provider.manifest, egress_service='telegram'
        )
        with patch('social_stats.egress.router.requests.request') as network:
            with self.assertRaises(ValueError):
                self.provider.outbound_request('GET', 'https://untrusted.test/')
            network.assert_not_called()
        for url in (
            'file:///etc/passwd',
            'http://127.0.0.1/private',
            'https://127.0.0.1/private',
        ):
            self.provider.manifest = replace(
                self.provider.manifest,
                support={
                    **self.provider.manifest.support,
                    'publish_image': 'supported',
                },
            )
            with (
                self.subTest(url=url),
                patch.object(self.provider, 'publish_request') as adapter,
            ):
                with self.assertRaises(ProviderError) as ctx:
                    self.execution.call(
                        'publish',
                        PublishRequest(
                            media_type='image',
                            media_urls=(url,),
                            idempotency_key='intent',
                        ),
                    )
                self.assertEqual(ctx.exception.code, 'media_invalid')
                adapter.assert_not_called()

    def test_log_and_connection_payloads_do_not_expose_secrets(self):
        import logging
        from social_stats.observability import ProductionJSONFormatter

        record = logging.LogRecord(
            'provider',
            logging.WARNING,
            __file__,
            1,
            'provider token=%s',
            ('DO-NOT-LEAK',),
            None,
        )
        record.provider_data = {
            'access_token': 'DO-NOT-LEAK',
            'destination_id': 'private-id',
        }
        self.assertNotIn('DO-NOT-LEAK', ProductionJSONFormatter().format(record))
        result = ConnectionResult(
            access_token='DO-NOT-LEAK',
            data={'custom': 'DO-NOT-LEAK', 'access_token': 'DO-NOT-LEAK'},
        )
        self.assertNotIn('DO-NOT-LEAK', json.dumps(result.public_data()))

    def test_composer_dispatch_uses_fixture_without_platform_branch(self):
        from social_stats.orchestrator import _dispatch_publish

        post = SimpleNamespace(pk=99, client_id=2, platform_overrides={})
        result = _dispatch_publish(
            self.provider, self.credential, 'approved content', [], 'text', post=post
        )
        self.assertTrue(result.success)
        self.assertIn((2, 7, 'post:99:account:7'), self.provider.deliveries)

    def test_metrics_must_be_normalized_finite_numbers(self):
        for metrics in ({'views': 'one'}, {'views': float('nan')}, {'views': True}):
            with (
                self.subTest(metrics=metrics),
                patch.object(
                    self.provider, 'sync', return_value=StatsResult(metrics=metrics)
                ),
            ):
                with self.assertRaises(ProviderError) as ctx:
                    self.execution.call('sync')
                self.assertEqual(ctx.exception.code, 'invalid_response')

    def test_failure_identifies_provider_and_contract(self):
        self.provider.capabilities = replace(self.provider.capabilities, publish=False)
        self.assertIn(
            'contract_example: publishing.publish_text: runtime media support missing',
            conformance_errors(self.provider),
        )


class ReferenceConnectionTests(FixtureRegistration, TestCase):
    def setUp(self):
        super().setUp()
        self.workspace = Client.objects.create(
            name='Example', company='Example', email='example@test.dev'
        )
        self.other = Client.objects.create(
            name='Other', company='Other', email='other@test.dev'
        )

    def test_multiple_accounts_reconnect_and_disconnect_isolation(self):
        service = ConnectionService()
        first, _ = service.connect(
            self.workspace,
            self.provider.key,
            {'token': 'one', 'destination_id': 'first'},
        )
        second, _ = service.connect(
            self.workspace,
            self.provider.key,
            {'token': 'two', 'destination_id': 'second'},
        )
        reconnect, _ = service.connect(
            self.workspace,
            self.provider.key,
            {'token': 'rotated', 'destination_id': 'first'},
        )
        self.assertEqual(first.pk, reconnect.pk)
        self.assertNotEqual(first.social_account_id, second.social_account_id)
        self.assertEqual(reconnect.access_token, 'rotated')
        self.assertNotIn('token', json.dumps(reconnect.social_account.metadata))
        self.assertFalse(
            service.disconnect(
                self.other, self.provider.key, social_account_id=first.social_account_id
            )
        )
        with self.assertRaises(ProviderError) as ctx:
            service.disconnect(self.workspace, self.provider.key)
        self.assertEqual(ctx.exception.code, 'account_required')
        self.assertTrue(
            service.disconnect(
                self.workspace,
                self.provider.key,
                social_account_id=first.social_account_id,
            )
        )
        self.assertTrue(PlatformCredential.objects.filter(pk=second.pk).exists())
        first.social_account.refresh_from_db()
        self.assertFalse(first.social_account.is_active)

    def test_connected_accounts_http_surface_without_core_switch_edit(self):
        user = User.objects.create_user(username='fixture-user')
        UserProfile.objects.create(user=user, client=self.workspace, role='client')
        api = APIClient()
        api.force_authenticate(user)
        response = api.post(
            f'/api/bot-channels/{self.workspace.pk}/{self.provider.key}/',
            {'token': 'DO-NOT-LEAK', 'destination_id': 'first'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('DO-NOT-LEAK', json.dumps(response.json()))
        statuses = api.get(f'/api/bot-channels/{self.workspace.pk}/status/')
        self.assertEqual(statuses.data[self.provider.key]['status'], 'active')
        denied = api.post(
            f'/api/bot-channels/{self.other.pk}/{self.provider.key}/',
            {'token': 'fake', 'destination_id': 'first'},
            format='json',
        )
        self.assertEqual(denied.status_code, 403)
