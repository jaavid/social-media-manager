"""Project bot onboarding, publishing permissions and secret boundaries."""
import time
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.contrib.auth.models import User
from django.test import SimpleTestCase, TestCase, override_settings
from rest_framework.test import APIClient

from social_stats.models import Client, PlatformCredential, UserProfile
from social_stats.platforms import get_provider
from social_stats.platforms.account_health import connection_health
from social_stats.publishers.base import PublishError

BOTS = {key: {'token': f'{key}-project-secret', 'username': f'{key}_project_bot'}
        for key in ('telegram', 'bale')}


def channel_client():
    client = Mock()
    client.get_me.return_value = {'id': 123, 'username': 'project_bot'}
    client.get_chat.return_value = {'id': -100123, 'type': 'channel', 'title': 'Channel', 'description': 'fixture-ownership-code'}
    client.get_chat_member.return_value = {'status': 'administrator', 'can_post_messages': True}
    return client


@override_settings(MESSENGER_BOTS=BOTS)
class ManagedBotProviderTests(SimpleTestCase):
    def test_server_token_only_and_canonical_destination(self):
        for key in BOTS:
            provider = get_provider(key)
            client = channel_client()
            with patch.object(provider, '_client', return_value=client) as factory:
                result = provider.connect({'destination_id': '@channel', 'ownership_code': 'fixture-ownership-code'})
            factory.assert_called_once_with(BOTS[key]['token'])
            client.get_chat_member.assert_called_once_with('-100123', 123)
            self.assertEqual(result.destination_id, '-100123')
            self.assertEqual(result.data['auth_method'], 'managed_bot')
            self.assertEqual([f.key for f in provider.manifest.connection_fields()], ['destination_id'])

    def test_non_admin_missing_post_permission_and_non_channel_are_rejected(self):
        for key in BOTS:
            provider = get_provider(key)
            for membership in ({'status': 'member'}, {'status': 'left'},
                               {'status': 'administrator', 'can_post_messages': False},
                               {'status': 'administrator'}, {'status': 'administrator', 'can_post_messages': 'true'}):
                client = channel_client()
                client.get_chat_member.return_value = membership
                with self.subTest(platform=key, membership=membership), patch.object(provider, '_client', return_value=client):
                    with self.assertRaises(PublishError) as raised:
                        provider.connect({'destination_id': '@channel', 'ownership_code': 'fixture-ownership-code'})
                    self.assertEqual(raised.exception.code, 'permission_denied')
            client = channel_client()
            client.get_chat.return_value['type'] = 'supergroup'
            with patch.object(provider, '_client', return_value=client), self.assertRaises(PublishError) as raised:
                provider.connect({'destination_id': '@channel', 'ownership_code': 'fixture-ownership-code'})
            self.assertEqual(raised.exception.code, 'invalid_destination')

    @override_settings(MESSENGER_BOTS={})
    def test_missing_project_configuration_fails_closed(self):
        for key in BOTS:
            with self.assertRaises(PublishError) as raised:
                get_provider(key).connect({'destination_id': '@channel', 'ownership_code': 'fixture-ownership-code'})
            self.assertEqual(raised.exception.code, 'missing_config')

    def test_custom_token_is_rejected_before_network(self):
        provider = get_provider('telegram')
        with patch.object(provider, '_client') as factory, self.assertRaises(PublishError):
            provider.connect({'token': 'user-secret', 'destination_id': '@channel'})
        factory.assert_not_called()

    def test_publish_resolves_current_server_token_and_preserves_legacy_credentials(self):
        for key in BOTS:
            publisher = get_provider(key).publisher
            credential = SimpleNamespace(platform=key, auth_method='managed_bot', access_token='old-secret')
            self.assertEqual(publisher._client(credential).token, BOTS[key]['token'])
            with override_settings(MESSENGER_BOTS={key: {'token': 'rotated-project-secret'}}):
                self.assertEqual(publisher._client(credential).token, 'rotated-project-secret')
            credential.auth_method = 'manual_token'
            self.assertEqual(publisher._client(credential).token, 'old-secret')


@override_settings(MESSENGER_BOTS=BOTS)
class ManagedBotConnectionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('managed-owner')
        self.workspace = Client.objects.create(name='Managed', company='Managed', email='managed@example.test', owner_user=self.user)
        UserProfile.objects.create(user=self.user, role='client', client=self.workspace)
        self.api = APIClient()
        self.api.force_authenticate(self.user)
        self.url = f'/api/workspaces/{self.workspace.pk}/connections/'

    def verified_payload(self, platform, client):
        from social_stats.platforms.managed_bots import channel_challenge
        challenge = channel_challenge(self.workspace.pk, self.user.pk, platform)
        client.get_chat.return_value['description'] = challenge['verification_code']
        return {'destination_id': '@channel', 'verification_token': challenge['verification_token']}

    @patch('social_stats.platforms.providers._bot.BotPlatformProvider._client')
    def test_connect_and_health_without_user_token_or_secret_response(self, factory):
        factory.return_value = channel_client()
        for key in BOTS:
            response = self.api.post(self.url + key + '/', self.verified_payload(key, factory.return_value), format='json')
            self.assertEqual(response.status_code, 201, response.data)
            credential = PlatformCredential.objects.get(client=self.workspace, platform=key)
            self.assertEqual(credential.auth_method, 'managed_bot')
            self.assertEqual(credential.platform_user_id, '-100123')
            self.assertTrue(connection_health(get_provider(key), credential).ready)
        response = self.api.get(self.url)
        self.assertEqual(response.status_code, 200)
        for key in BOTS:
            self.assertNotIn(BOTS[key]['token'], str(response.data))
            item = next(p for p in response.data['providers'] if p['key'] == key)
            self.assertEqual(item['managed_bot']['username'], BOTS[key]['username'])
            self.assertTrue(item['accounts'][0]['health']['ready'])
        credential = PlatformCredential.objects.get(client=self.workspace, platform='telegram')
        factory.return_value.get_chat_member.return_value['can_post_messages'] = False
        self.assertFalse(connection_health(get_provider('telegram'), credential).ready)

    @patch('social_stats.platforms.providers._bot.BotPlatformProvider._client')
    def test_failed_verification_does_not_save_and_legacy_endpoint_rejects_user_token(self, factory):
        factory.return_value = channel_client()
        factory.return_value.get_chat_member.return_value = {'status': 'member'}
        for url in (self.url + 'telegram/', f'/api/bot-channels/{self.workspace.pk}/telegram/'):
            response = self.api.post(url, self.verified_payload('telegram', factory.return_value), format='json')
            self.assertEqual(response.status_code, 403 if 'workspaces' in url else 400)
            self.assertEqual(response.data['code'], 'permission_denied')
            response = self.api.post(url, {'token': 'user-secret', 'destination_id': '@channel'}, format='json')
            self.assertEqual(response.status_code, 400)
        self.assertFalse(PlatformCredential.objects.filter(client=self.workspace).exists())

    @patch('social_stats.platforms.providers._bot.BotPlatformProvider._client')
    def test_legacy_endpoint_uses_project_bot_without_token(self, factory):
        factory.return_value = channel_client()
        response = self.api.post(f'/api/bot-channels/{self.workspace.pk}/bale/', self.verified_payload('bale', factory.return_value), format='json')
        self.assertEqual(response.status_code, 200)
        self.assertNotIn(BOTS['bale']['token'], str(response.data))

    @patch('social_stats.platforms.providers._bot.BotPlatformProvider._client')
    def test_reconnect_disables_previous_account_webhook_without_touching_remote_bot(self, factory):
        factory.return_value = channel_client()
        response = self.api.post(self.url + 'telegram/', self.verified_payload('telegram', factory.return_value), format='json')
        credential = PlatformCredential.objects.get(client=self.workspace, platform='telegram')
        config = credential.social_account.telegram_config
        config.webhook_enabled = True
        config.webhook_secret = 'previous-webhook-secret'
        config.assistant_enabled = True
        config.save()
        factory.return_value.reset_mock()
        response = self.api.post(self.url + f"telegram/?account_id={response.data['account_id']}", self.verified_payload('telegram', factory.return_value), format='json')
        self.assertEqual(response.status_code, 201)
        config.refresh_from_db()
        self.assertFalse(config.webhook_enabled)
        self.assertFalse(config.assistant_enabled)
        self.assertEqual(config.webhook_secret, '')
        factory.return_value.call.assert_not_called()

    @patch('social_stats.platforms.providers._bot.BotPlatformProvider._client')
    def test_cross_workspace_connection_and_managed_webhook_are_blocked(self, factory):
        other = Client.objects.create(name='Other', company='Other', email='other-managed@example.test')
        response = self.api.post(f'/api/workspaces/{other.pk}/connections/telegram/', {'destination_id': '@channel'}, format='json')
        self.assertEqual(response.status_code, 403)
        factory.assert_not_called()
        factory.return_value = channel_client()
        connected = self.api.post(self.url + 'telegram/', self.verified_payload('telegram', factory.return_value), format='json')
        factory.reset_mock()
        response = self.api.post(f"/api/telegram-accounts/{connected.data['account_id']}/webhook/", {}, format='json', secure=True)
        self.assertEqual(response.status_code, 400)
        factory.assert_not_called()


@override_settings(MESSENGER_BOTS=BOTS)
class ManagedChannelOwnershipTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('ownership-owner')
        self.workspace = Client.objects.create(name='Ownership', company='Ownership', email='ownership@example.test', owner_user=self.user)
        UserProfile.objects.create(user=self.user, role='client', client=self.workspace)
        self.api = APIClient()
        self.api.force_authenticate(self.user)
        self.url = f'/api/workspaces/{self.workspace.pk}/connections/'

    @patch('social_stats.platforms.providers._bot.BotPlatformProvider._client')
    def test_challenge_from_metadata_requires_editing_channel_description(self, factory):
        factory.return_value = channel_client()
        response = self.api.get(self.url)
        item = next(p for p in response.data['providers'] if p['key'] == 'telegram')
        challenge = item['managed_bot']
        payload = {'destination_id': '@channel', 'verification_token': challenge['verification_token']}
        denied = self.api.post(self.url + 'telegram/', payload, format='json')
        self.assertEqual(denied.status_code, 400)
        self.assertEqual(denied.data['code'], 'channel_verification_required')
        self.assertFalse(PlatformCredential.objects.exists())
        factory.return_value.get_chat.return_value['description'] = 'Original description\n' + challenge['verification_code']
        success = self.api.post(self.url + 'telegram/', payload, format='json')
        self.assertEqual(success.status_code, 201)
        factory.return_value.get_chat.return_value['description'] = 'Original description'
        credential = PlatformCredential.objects.get(client=self.workspace)
        self.assertTrue(connection_health(get_provider('telegram'), credential).ready)
        factory.return_value.get_chat_member.side_effect = PublishError('Timed out', code='timeout')
        self.assertFalse(connection_health(get_provider('telegram'), credential).ready)
        credential.refresh_from_db()
        self.assertTrue(credential.is_active)

    @patch('social_stats.platforms.providers._bot.BotPlatformProvider._client')
    def test_foreign_tampered_missing_and_expired_challenges_fail_before_network(self, factory):
        from social_stats.platforms.managed_bots import channel_challenge
        tokens = [None, 'tampered',
                  channel_challenge(self.workspace.pk + 1, self.user.pk, 'telegram')['verification_token'],
                  channel_challenge(self.workspace.pk, self.user.pk + 1, 'telegram')['verification_token'],
                  channel_challenge(self.workspace.pk, self.user.pk, 'bale')['verification_token']]
        for token in tokens:
            denied = self.api.post(self.url + 'telegram/', {'destination_id': '@channel', 'verification_token': token}, format='json')
            self.assertEqual(denied.status_code, 400)
            self.assertEqual(denied.data['code'], 'channel_verification_required')
        token = channel_challenge(self.workspace.pk, self.user.pk, 'telegram')['verification_token']
        future = time.time() + 1801
        with patch('django.core.signing.time.time', return_value=future):
            denied = self.api.post(self.url + 'telegram/', {'destination_id': '@channel', 'verification_token': token}, format='json')
        self.assertEqual(denied.status_code, 400)
        self.assertEqual(denied.data['code'], 'channel_verification_required')
        factory.assert_not_called()
        self.assertFalse(PlatformCredential.objects.exists())
