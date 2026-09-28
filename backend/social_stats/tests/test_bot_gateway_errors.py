from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase

from social_stats.publishers._bot_api_client import BotAPIClient
from social_stats.publishers.base import PublishError, TokenExpiredError


class BotGatewayErrorTests(SimpleTestCase):
    @patch('social_stats.publishers._bot_api_client.outbound_request')
    def test_gateway_401_does_not_mark_bot_token_expired(self, outbound):
        response = Mock()
        response.status_code = 401
        response.ok = False
        response.egress_route = SimpleNamespace(route='gateway')
        response.json.return_value = {'ok': False, 'error': 'unauthorized'}
        outbound.return_value = response

        client = BotAPIClient('valid-bot-token', 'https://api.telegram.org')
        with self.assertRaises(PublishError) as ctx:
            client.call('getMe')

        self.assertNotIsInstance(ctx.exception, TokenExpiredError)
        self.assertEqual(ctx.exception.code, 'egress_auth')

    @patch('social_stats.publishers._bot_api_client.outbound_request')
    def test_provider_401_through_gateway_still_marks_token_expired(self, outbound):
        response = Mock()
        response.status_code = 401
        response.ok = False
        response.egress_route = SimpleNamespace(route='gateway')
        response.json.return_value = {
            'ok': False,
            'error_code': 401,
            'description': 'Unauthorized',
        }
        outbound.return_value = response

        client = BotAPIClient('expired-bot-token', 'https://api.telegram.org')
        with self.assertRaises(TokenExpiredError):
            client.call('getMe')

    @patch('social_stats.publishers._bot_api_client.outbound_request')
    def test_missing_gateway_route_is_configuration_error(self, outbound):
        response = Mock()
        response.status_code = 404
        response.ok = False
        response.egress_route = SimpleNamespace(route='gateway')
        response.json.return_value = {'ok': False, 'error': 'route_not_found'}
        outbound.return_value = response

        client = BotAPIClient('bot-token', 'https://api.telegram.org')
        with self.assertRaises(PublishError) as ctx:
            client.call('getMe')

        self.assertEqual(ctx.exception.code, 'egress_route_missing')
