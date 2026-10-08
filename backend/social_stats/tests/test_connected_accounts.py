"""Behavior of the shared health/connection API, including authorization."""
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import patch
from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from social_stats.models import Client, PlatformCredential, SocialAccount, SyncLog, UserProfile, SocialAccountPermissionOverride
from social_stats.platforms.contracts import HealthResult, DestinationContext
from social_stats.platforms.execution import ProviderExecution
from social_stats.platforms.connection_service import ConnectionService
from social_stats.tests.test_provider_conformance import FixtureRegistration
from social_stats.views.oauth import _save_credential


class ConnectedAccountsTests(FixtureRegistration, TestCase):
    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user('owner')
        self.workspace = Client.objects.create(name='Workspace', company='Workspace', email='stage4@example.com', owner_user=self.user)
        self.other = Client.objects.create(name='Other', company='Other', email='stage4-other@example.com')
        UserProfile.objects.create(user=self.user, role='client', client=self.workspace)
        self.api = APIClient()
        self.api.force_authenticate(self.user)
        self.url = f'/api/workspaces/{self.workspace.pk}/connections/'
        self.provider_url = self.url + self.provider.key + '/'
        service = ConnectionService()
        self.first, _ = service.connect(self.workspace, self.provider.key, {'token': 'PRIVATE-FIRST', 'destination_id': 'first'})
        self.second, _ = service.connect(self.workspace, self.provider.key, {'token': 'PRIVATE-SECOND', 'destination_id': 'second'})

    def item(self):
        response = self.api.get(self.url)
        self.assertEqual(response.status_code, 200)
        return next(p for p in response.json()['providers'] if p['key'] == self.provider.key)

    def test_fixture_schema_multiple_accounts_and_no_private_payload(self):
        item = self.item()
        self.assertEqual(item['contract']['auth']['fields'][0]['key'], 'token')
        self.assertEqual(len(item['accounts']), 2)
        self.assertEqual(item['accounts'][0]['destination']['id'], 'first')
        self.assertEqual(item['accounts'][0]['identity']['id'], 'first')
        self.assertNotIn('PRIVATE-', str(self.api.get(self.url).json()))
        self.assertNotIn('access_token', str(item))
        self.assertTrue(item['permissions']['connect'])
        # Historical/provider metadata is not a public enum or payload boundary.
        account = self.first.social_account
        account.metadata['destination_type'] = {'private': 'PRIVATE-FIRST'}
        account.save(update_fields=['metadata'])
        response = self.api.get(self.url).json()
        self.assertNotIn('PRIVATE-', str(response))
        self.assertEqual(self.item()['accounts'][0]['destination']['kind'], 'unknown')

    def test_nonobject_historical_metadata_never_crashes_or_claims_readiness(self):
        account = self.first.social_account
        for metadata in ([], 'malformed'):
            with self.subTest(metadata=metadata):
                account.metadata = metadata
                account.save(update_fields=['metadata'])
                item = self.item()['accounts'][0]
                self.assertFalse(item['health']['ready'])
                self.assertEqual(item['destination']['kind'], 'unknown')
                self.assertFalse(any(item['engagement_readiness'].values()))
                self.assertFalse(any(item['publishing_readiness'].values()))

    def test_health_matches_runtime_expiry_revocation_and_unknown(self):
        self.first.expires_at = timezone.now() - timedelta(hours=1)
        self.first.save()
        runtime = ProviderExecution(self.provider, self.first, DestinationContext(self.first.social_account_id, self.workspace.pk)).call('health')
        self.assertEqual(runtime.state, 'expired')
        self.assertEqual(self.item()['accounts'][0]['health']['state'], 'expired')
        self.first.expires_at = None
        self.first.is_active = False
        self.first.save()
        self.assertEqual(self.item()['accounts'][0]['health']['state'], 'unknown')
        self.first.mark_auth_failure('revoked')
        self.assertEqual(self.item()['accounts'][0]['health']['state'], 'revoked')
        with patch.object(type(self.provider), 'health', side_effect=RuntimeError('PRIVATE-FIRST')):
            self.assertEqual(self.item()['accounts'][0]['health']['state'], 'unknown')
        self.first.refresh_from_db()
        self.assertEqual(self.first.access_token, 'PRIVATE-FIRST')
        with patch.object(type(self.provider), 'health', return_value=HealthResult(True, 'PRIVATE-FIRST', 'PRIVATE-SECOND')):
            account = self.item()['accounts'][0]
            self.assertFalse(account['health']['ready'])
            self.assertEqual(account['health']['state'], 'unknown')
            self.assertNotIn('PRIVATE', str(account))

        with patch.object(type(self.provider), 'health', return_value=HealthResult(False, 'ready')):
            self.assertEqual(self.item()['accounts'][0]['health']['state'], 'unknown')

    @override_settings(ACCOUNT_SYNC_STALE_SECONDS=3600)
    def test_sync_scoping_failure_and_staleness(self):
        account = self.first.social_account
        self.assertEqual(self.item()['accounts'][0]['sync']['state'], 'unknown')
        success = SyncLog.objects.create(client=self.workspace, platform=self.provider.key, social_account=account,
                                        status='success', finished_at=timezone.now() - timedelta(hours=2))
        self.assertEqual(self.item()['accounts'][0]['sync']['state'], 'stale')
        failure = SyncLog.objects.create(client=self.workspace, platform=self.provider.key, social_account=account,
                                        status='failed', error_message='503 PRIVATE-FIRST', finished_at=timezone.now())
        item = self.item()
        self.assertEqual(item['accounts'][0]['sync']['state'], 'failure')
        self.assertIsNotNone(item['accounts'][0]['sync']['last_success_at'])
        self.assertIsNotNone(item['accounts'][0]['sync']['last_failure_at'])
        self.assertEqual(item['accounts'][1]['sync']['state'], 'unknown')
        self.assertEqual(item['accounts'][0]['health']['state'], 'ready')
        self.assertNotIn(failure.error_message, str(item))
        self.assertEqual(item['accounts'][0]['sync']['stale_after_seconds'], 3600)
        success.finished_at = timezone.now()
        success.save()
        failure.delete()
        self.assertEqual(self.item()['accounts'][0]['sync']['state'], 'fresh')

    def test_connect_reconnect_and_disconnect_target_one_account(self):
        response = self.api.post(self.provider_url, {'token': 'THIRD', 'destination_id': 'third'})
        self.assertEqual(response.status_code, 201)
        target = self.provider_url + f'?account_id={self.first.social_account_id}'
        self.assertEqual(self.api.post(target, {'token': 'NEW-FIRST', 'destination_id': 'first'}).status_code, 201)
        self.first.refresh_from_db()
        self.second.refresh_from_db()
        self.assertEqual(self.first.access_token, 'NEW-FIRST')
        self.assertEqual(self.second.access_token, 'PRIVATE-SECOND')
        response = self.api.post(target, {'token': 'WRONG', 'destination_id': 'other'})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['code'], 'account_mismatch')
        self.assertFalse(SocialAccount.objects.filter(external_id='other').exists())
        self.assertEqual(self.api.delete(self.provider_url).status_code, 400)
        self.assertEqual(self.api.delete(target).status_code, 204)
        self.assertTrue(PlatformCredential.objects.filter(pk=self.second.pk).exists())
        self.first.social_account.refresh_from_db()
        self.assertFalse(self.first.social_account.is_active)

    def test_workspace_and_account_denials_prevent_provider_call(self):
        self.assertEqual(self.api.get(f'/api/workspaces/{self.other.pk}/connections/').status_code, 403)
        outside, _ = ConnectionService().connect(self.other, self.provider.key, {'token': 'OTHER', 'destination_id': 'outside'})
        with patch.object(type(self.provider), 'validate_credentials') as connect:
            target = self.provider_url + f'?account_id={outside.social_account_id}'
            self.assertEqual(self.api.post(target, {'token': 'attempt', 'destination_id': 'outside'}).status_code, 403)
            SocialAccountPermissionOverride.objects.create(user=self.user, account=self.first.social_account,
                permissions={'connect_platforms': False, 'disconnect_platforms': False})
            target = self.provider_url + f'?account_id={self.first.social_account_id}'
            self.assertEqual(self.api.post(target, {'token': 'attempt', 'destination_id': 'first'}).status_code, 403)
            self.assertEqual(self.api.delete(target).status_code, 403)
            connect.assert_not_called()
        self.assertFalse(self.item()['accounts'][0]['permissions']['reconnect'])
        # Adding an identity cannot bypass a reconnect denial on an existing account.
        self.assertEqual(self.api.post(self.provider_url, {'token': 'attempt', 'destination_id': 'first'}).status_code, 403)

    def test_oauth_start_requires_current_permission(self):
        account = SocialAccount.objects.create(client=self.workspace, platform='youtube', external_id='channel')
        SocialAccountPermissionOverride.objects.create(user=self.user, account=account, permissions={'connect_platforms': False})
        target = f'/api/oauth/google/start/{self.workspace.pk}/?platform=youtube&account_id={account.pk}'
        self.assertEqual(self.api.get(target).status_code, 403)
        self.assertEqual(self.api.get(f'/api/oauth/google/start/{self.other.pk}/').status_code, 403)
        self.assertIn(APIClient().get(target).status_code, (401, 403))

    def test_oauth_flow_rejects_cross_provider_selection(self):
        from rest_framework.exceptions import PermissionDenied
        self.api.force_login(self.user)
        for flow, platform in [('facebook', 'youtube'), ('google', 'facebook')]:
            self.assertEqual(self.api.get(f'/api/oauth/{flow}/start/{self.workspace.pk}/?platform={platform}').status_code, 400)
        self.assertEqual(self.api.get(f'/api/oauth/google/start/{self.workspace.pk}/').status_code, 302)
        self.assertEqual(self.api.session['oauth_connection']['platform'], 'all')
        request = SimpleNamespace(user=self.user, session=self.api.session)
        with self.assertRaises(PermissionDenied):
            _save_credential(self.workspace.pk, 'facebook', {'page_id': 'page', 'access_token': 'PRIVATE'}, request=request)
        self.assertFalse(PlatformCredential.objects.filter(platform='facebook').exists())

    def test_oauth_callback_rechecks_permission_and_original_identity(self):
        self.api.force_login(self.user)
        account = SocialAccount.objects.create(client=self.workspace, platform='youtube', external_id='channel')
        target = f'/api/oauth/google/start/{self.workspace.pk}/?platform=youtube&account_id={account.pk}'
        self.assertEqual(self.api.get(target).status_code, 302)
        session = self.api.session
        request = SimpleNamespace(user=self.user, session=session)
        _save_credential(self.workspace.pk, 'youtube', {'channel_id': 'other', 'access_token': 'NO'}, request=request)
        self.assertFalse(PlatformCredential.objects.filter(platform='youtube').exists())
        _save_credential(self.workspace.pk, 'youtube', {'channel_id': 'channel', 'access_token': 'YES'}, request=request)
        self.assertEqual(PlatformCredential.objects.get(social_account=account).access_token, 'YES')
        SocialAccountPermissionOverride.objects.create(user=self.user, account=account, permissions={'connect_platforms': False})
        from social_stats.views.oauth import _oauth_state_valid
        request.GET = {'state': session['oauth_state']}
        self.assertFalse(_oauth_state_valid(request))

    def test_observed_auth_reason_survives_token_wipe_and_successful_reconnect_clears_it(self):
        self.first.mark_auth_failure('token_expired')
        self.assertEqual(self.item()['accounts'][0]['health']['state'], 'expired')
        self.first.auth_failure_code = 'revoked'
        self.first.access_token = ''
        self.first.refresh_token = ''
        self.first.save()
        self.assertEqual(self.item()['accounts'][0]['health']['state'], 'revoked')
        response = self.api.post(self.provider_url + f'?account_id={self.first.social_account_id}',
                                 {'token': 'REPLACEMENT', 'destination_id': 'first'})
        self.assertEqual(response.status_code, 201)
        self.first.refresh_from_db()
        self.assertEqual(self.first.auth_failure_code, '')
        self.assertEqual(self.item()['accounts'][0]['health']['state'], 'ready')

    def test_legacy_credential_permission_denial_and_provider_error_are_safe(self):
        from social_stats.models import Permission, UserPermission
        from social_stats.publishers.base import PublishError
        permission, _ = Permission.objects.get_or_create(code='settings.connect_accounts',
            defaults={'label': 'Connect', 'category': 'actions'})
        UserPermission.objects.create(user_profile=self.user.profile, permission=permission, is_granted=False)
        self.assertFalse(self.item()['permissions']['connect'])
        self.assertEqual(self.api.post(self.provider_url, {'token': 'THIRD', 'destination_id': 'third'}).status_code, 403)
        UserPermission.objects.filter(user_profile=self.user.profile).delete()
        with patch.object(type(self.provider), 'validate_credentials', side_effect=PublishError('PRIVATE-FIRST', code='graph_error')):
            with self.assertLogs('social_stats.security.middleware', level='INFO') as logs:
                response = self.api.post(self.provider_url, {'token': 'PRIVATE-FIRST', 'destination_id': 'third'})
        self.assertNotIn('PRIVATE-FIRST', str(response.json()))
        self.assertNotIn('PRIVATE-FIRST', '\n'.join(logs.output))
        self.assertEqual(self.item()['accounts'][0]['health']['state'], 'ready')

    def test_connection_endpoint_applies_field_normalization_without_trimming_secrets(self):
        from dataclasses import replace
        manifest = replace(self.provider.manifest, auth_fields=tuple(
            replace(field, normalization='trim' if field.key == 'destination_id' else 'preserve')
            for field in self.provider.manifest.auth_fields))
        token = ' public-fixture-intentional-whitespace '
        with patch.object(type(self.provider), 'manifest', manifest):
            response = self.api.post(self.provider_url + f'?account_id={self.first.social_account_id}',
                                     {'token': token, 'destination_id': ' first '})
        self.assertEqual(response.status_code, 201)
        self.first.refresh_from_db()
        self.assertEqual(self.first.access_token, token)
        self.assertEqual(self.first.platform_user_id, 'first')
        self.assertNotIn(token, str(response.data))
