from types import SimpleNamespace
from unittest.mock import Mock, patch

import requests
from django.test import SimpleTestCase

from social_stats.orchestrator import _dispatch_publish
from social_stats.publishers import get_publisher
from social_stats.publishers._bot_api_client import BotAPIClient
from social_stats.publishers.base import PublishError, RateLimitError, TokenExpiredError
from social_stats.publishers.telegram import TelegramPublisher


class BotPublisherRegistryTests(SimpleTestCase):
    def test_telegram_and_bale_autoload_from_registry(self):
        self.assertEqual(get_publisher('telegram').platform, 'telegram')
        self.assertEqual(get_publisher('bale').platform, 'bale')


class BotPublisherTests(SimpleTestCase):
    def setUp(self):
        self.credential = SimpleNamespace(
            access_token='secret-token',
            platform_user_id='@default_channel',
        )

    def test_text_publish_uses_default_destination(self):
        api = Mock()
        api.call.return_value = {'ok': True, 'result': {'message_id': 101}}
        publisher = TelegramPublisher()

        with patch.object(publisher, '_client', return_value=api):
            result = publisher.publish_text(self.credential, 'hello')

        api.call.assert_called_once_with(
            'sendMessage',
            data={'chat_id': '@default_channel', 'text': 'hello'},
        )
        self.assertTrue(result.success)
        self.assertEqual(result.platform_post_id, '101')

    def test_destination_override_wins_over_credential_default(self):
        api = Mock()
        api.call.return_value = {'ok': True, 'result': {'message_id': 202}}
        publisher = TelegramPublisher()

        with patch.object(publisher, '_client', return_value=api):
            publisher.publish_text(
                self.credential,
                'hello',
                destination_id='@per_post_channel',
            )

        self.assertEqual(
            api.call.call_args.kwargs['data']['chat_id'],
            '@per_post_channel',
        )

    def test_dispatch_forwards_destination_override(self):
        publisher = Mock()
        credential = object()

        _dispatch_publish(
            publisher,
            credential,
            'hello',
            [],
            'text',
            post=object(),
            destination_id='-100123456',
        )

        publisher.publish_text.assert_called_once_with(
            credential,
            'hello',
            destination_id='-100123456',
        )

    def test_missing_destination_fails_cleanly(self):
        publisher = TelegramPublisher()
        credential = SimpleNamespace(access_token='secret-token', platform_user_id='')

        with self.assertRaises(PublishError) as ctx:
            publisher.publish_text(credential, 'hello')

        self.assertEqual(ctx.exception.code, 'missing_destination')

    def test_text_limit_is_enforced_before_network_call(self):
        publisher = TelegramPublisher()
        with patch.object(publisher, '_client') as client:
            with self.assertRaises(PublishError) as ctx:
                publisher.publish_text(self.credential, 'x' * 4097)
        self.assertEqual(ctx.exception.code, 'content_too_long')
        client.assert_not_called()

    def test_media_caption_limit_is_enforced(self):
        publisher = TelegramPublisher()
        with patch.object(publisher, '_client') as client:
            with self.assertRaises(PublishError) as ctx:
                publisher.publish_image(
                    self.credential,
                    'x' * 1025,
                    ['https://example.test/photo.jpg'],
                )
        self.assertEqual(ctx.exception.code, 'content_too_long')
        client.assert_not_called()

    def test_media_group_does_not_silently_drop_items(self):
        publisher = TelegramPublisher()
        urls = [f'https://example.test/{index}.jpg' for index in range(11)]
        with patch.object(publisher, '_client') as client:
            with self.assertRaises(PublishError) as ctx:
                publisher.publish_carousel(self.credential, 'caption', urls)
        self.assertEqual(ctx.exception.code, 'media_invalid')
        client.assert_not_called()


class BotAPIClientTests(SimpleTestCase):
    @patch('social_stats.publishers._bot_api_client.outbound_request')
    def test_gateway_contract_keeps_token_out_of_gateway_path(self, outbound):
        response = Mock()
        response.status_code = 200
        response.ok = True
        response.json.return_value = {'ok': True, 'result': {'message_id': 1}}
        outbound.return_value = response
        client = BotAPIClient('123456:ABC', 'https://api.telegram.org')

        client.call('sendMessage', data={'chat_id': '@channel', 'text': 'hello'})

        outbound.assert_called_once_with(
            'telegram',
            'POST',
            'https://api.telegram.org/bot123456:ABC/sendMessage',
            data={'chat_id': '@channel', 'text': 'hello'},
            files=None,
            timeout=30,
            gateway_path='/bot/sendMessage',
            gateway_headers={'X-Upstream-Bot-Token': '123456:ABC'},
        )

    @patch('social_stats.publishers._bot_api_client.outbound_request')
    def test_bale_selects_bale_egress_service(self, outbound):
        response = Mock(status_code=200, ok=True)
        response.json.return_value = {'ok': True, 'result': {'id': 1}}
        outbound.return_value = response
        client = BotAPIClient('bale-token', 'https://tapi.bale.ai')
        client.call('getMe')
        self.assertEqual(outbound.call_args.args[0], 'bale')
        self.assertEqual(outbound.call_args.kwargs['gateway_path'], '/bot/getMe')

    @patch('social_stats.publishers._bot_api_client.outbound_request')
    def test_network_error_does_not_expose_token(self, outbound):
        outbound.side_effect = requests.ConnectionError('connection failed')
        client = BotAPIClient('super-secret-token', 'https://api.telegram.org')

        with self.assertRaises(PublishError) as ctx:
            client.call('sendMessage', data={'chat_id': '@channel', 'text': 'hello'})

        self.assertNotIn('super-secret-token', str(ctx.exception))
        self.assertEqual(ctx.exception.code, 'network_error')

    @patch('social_stats.publishers._bot_api_client.outbound_request')
    def test_retry_after_maps_to_rate_limit_error(self, outbound):
        response = Mock()
        response.status_code = 429
        response.ok = False
        response.json.return_value = {
            'ok': False,
            'description': 'Too Many Requests',
            'parameters': {'retry_after': 17},
        }
        outbound.return_value = response
        client = BotAPIClient('token', 'https://api.telegram.org')

        with self.assertRaises(RateLimitError) as ctx:
            client.call('sendMessage')

        self.assertEqual(ctx.exception.retry_after, 17)

    @patch('social_stats.publishers._bot_api_client.outbound_request')
    def test_payload_401_maps_to_token_expired_even_if_http_status_differs(self, outbound):
        response = Mock()
        response.status_code = 400
        response.ok = False
        response.json.return_value = {
            'ok': False,
            'error_code': 401,
            'description': 'Unauthorized',
        }
        outbound.return_value = response
        client = BotAPIClient('token', 'https://api.telegram.org')

        with self.assertRaises(TokenExpiredError):
            client.call('sendMessage')
