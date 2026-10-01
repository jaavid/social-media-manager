"""Shared behavioral contract for all registered Iranian/bot providers."""
from types import SimpleNamespace
from unittest.mock import Mock, patch

import requests
from django.test import SimpleTestCase
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from social_stats.platforms import get_provider
from social_stats.platforms.base import ProviderError
from social_stats.platforms.providers.aparat import AparatClient
from social_stats.publishers.base import PublishError, RateLimitError, TokenExpiredError
from social_stats.models import Client, PlatformCredential, UserProfile


class ProviderContractTests(SimpleTestCase):
    def test_all_four_providers_have_explicit_capabilities(self):
        for key in ('telegram', 'bale', 'eitaa', 'aparat'):
            provider = get_provider(key)
            self.assertEqual(provider.key, key)
            self.assertTrue(provider.capabilities.connect)
            self.assertTrue(provider.capabilities.publish)
            self.assertTrue(provider.capabilities.revoke)

    def test_media_capabilities_are_provider_owned(self):
        self.assertTrue(get_provider('eitaa').capabilities.supports_media('image'))
        self.assertTrue(get_provider('aparat').capabilities.supports_media('video'))
        self.assertFalse(get_provider('aparat').capabilities.supports_media('image'))

    def test_missing_tokens_are_normalized(self):
        for key in ('telegram', 'bale', 'eitaa', 'aparat'):
            with self.subTest(provider=key), self.assertRaises(PublishError):
                get_provider(key).validate_credentials({
                    'token': '', 'destination_id': '@channel',
                })

    def test_unsupported_inbox_uses_contract_error(self):
        with self.assertRaises(ProviderError) as ctx:
            get_provider('aparat').fetch_inbox(object())
        self.assertEqual(ctx.exception.code, 'unsupported')


class AparatClientContractTests(SimpleTestCase):
    @patch('social_stats.platforms.providers.aparat.outbound_request')
    def test_revoked_token(self, outbound):
        response = Mock(status_code=401, ok=False, headers={})
        response.json.return_value = {'error': 'invalid token'}
        outbound.return_value = response
        with self.assertRaises(TokenExpiredError):
            AparatClient('revoked').profile()

    @patch('social_stats.platforms.providers.aparat.outbound_request')
    def test_timeout(self, outbound):
        outbound.side_effect = requests.Timeout()
        with self.assertRaises(ProviderError) as ctx:
            AparatClient('token').profile()
        self.assertEqual(ctx.exception.code, 'timeout')

    @patch('social_stats.platforms.providers.aparat.outbound_request')
    def test_rate_limit(self, outbound):
        response = Mock(status_code=429, ok=False, headers={'Retry-After': '12'})
        response.json.return_value = {'error': 'slow down'}
        outbound.return_value = response
        with self.assertRaises(RateLimitError) as ctx:
            AparatClient('token').profile()
        self.assertEqual(ctx.exception.retry_after, 12)

    @patch('social_stats.platforms.providers.aparat.AparatClient.profile')
    def test_nested_profile_data_must_be_object(self, profile):
        profile.return_value = {'data': ['unexpected']}
        with self.assertRaises(ProviderError) as ctx:
            get_provider('aparat').validate_credentials({'token': 'token'})
        self.assertEqual(ctx.exception.code, 'invalid_response')

    @patch('social_stats.platforms.providers.aparat.AparatClient.upload_video')
    def test_upload_requires_video_identifier(self, upload):
        upload.return_value = {'data': {'url': 'https://www.aparat.com/v/example'}}
        credential = SimpleNamespace(access_token='token')
        with self.assertRaises(ProviderError) as ctx:
            get_provider('aparat').publisher.publish_video(
                credential, 'caption', 'https://cdn.example.test/video.mp4',
            )
        self.assertEqual(ctx.exception.code, 'invalid_response')

    def test_video_is_required_before_upload(self):
        credential = SimpleNamespace(access_token='token')
        with self.assertRaises(ProviderError) as ctx:
            get_provider('aparat').publisher.publish_video(credential, 'caption', '')
        self.assertEqual(ctx.exception.code, 'media_invalid')


class ProviderConnectionAPITests(TestCase):
    def setUp(self):
        self.tenant = Client.objects.create(name='Tenant', company='Tenant', email='tenant@test.dev')
        self.other = Client.objects.create(name='Other', company='Other', email='other@test.dev')
        self.user = User.objects.create_user(username='provider-user', password='test')
        UserProfile.objects.create(user=self.user, role='client', client=self.tenant)
        self.api = APIClient()
        self.api.force_authenticate(self.user)

    @patch('social_stats.platforms.providers._bot.BotPlatformProvider._client')
    def test_connect_status_and_disconnect(self, client_factory):
        client = Mock()
        client.get_me.return_value = {'id': 10, 'username': 'publisher_bot'}
        client.get_chat.return_value = {'title': 'News'}
        client_factory.return_value = client

        connected = self.api.post(
            f'/api/bot-channels/{self.tenant.id}/telegram/',
            {'token': 'valid-token', 'destination_id': '@news'}, format='json',
        )
        self.assertEqual(connected.status_code, 200)
        self.assertTrue(PlatformCredential.objects.filter(
            client=self.tenant, platform='telegram', is_active=True,
        ).exists())

        status = self.api.get(f'/api/bot-channels/{self.tenant.id}/status/')
        self.assertEqual(status.status_code, 200)
        self.assertEqual(status.data['telegram']['status'], 'active')

        disconnected = self.api.delete(
            f'/api/bot-channels/{self.tenant.id}/telegram/',
        )
        self.assertEqual(disconnected.status_code, 204)
        self.assertFalse(PlatformCredential.objects.filter(
            client=self.tenant, platform='telegram',
        ).exists())

    def test_cannot_access_another_clients_connections(self):
        response = self.api.get(f'/api/bot-channels/{self.other.id}/status/')
        self.assertEqual(response.status_code, 403)