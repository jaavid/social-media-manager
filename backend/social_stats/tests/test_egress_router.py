from unittest.mock import Mock, patch

import requests
from django.test import SimpleTestCase

from social_stats.egress.router import (
    clear_direct_circuit,
    direct_circuit_open,
    outbound_request,
)


class EgressRouterTests(SimpleTestCase):
    def tearDown(self):
        clear_direct_circuit('telegram')

    @patch.dict('os.environ', {
        'OUTBOUND_ROUTING_DEFAULT': 'direct',
        'API_GATEWAY_URL': 'https://gateway.example.test',
        'API_GATEWAY_KEY': 'gateway-secret',
    }, clear=False)
    @patch('social_stats.egress.router.requests.request')
    def test_direct_mode_never_uses_gateway(self, request):
        response = Mock(status_code=403)
        request.return_value = response

        result = outbound_request(
            'telegram', 'GET', 'https://api.telegram.org/test', mode='direct'
        )

        self.assertIs(result, response)
        request.assert_called_once_with(
            method='GET', url='https://api.telegram.org/test'
        )
        self.assertEqual(result.egress_route.route, 'direct')

    @patch.dict('os.environ', {
        'API_GATEWAY_URL': 'https://gateway.example.test',
        'API_GATEWAY_KEY': 'gateway-secret',
    }, clear=False)
    @patch('social_stats.egress.router.requests.request')
    def test_gateway_mode_uses_allowlisted_service_route(self, request):
        response = Mock(status_code=200)
        request.return_value = response

        outbound_request(
            'telegram',
            'POST',
            'https://api.telegram.org/botSECRET/sendMessage',
            mode='gateway',
            gateway_path='/bot/sendMessage',
            gateway_headers={'X-Upstream-Bot-Token': 'SECRET'},
            data={'chat_id': '@channel'},
        )

        request.assert_called_once_with(
            method='POST',
            url='https://gateway.example.test/telegram/bot/sendMessage',
            headers={
                'X-Upstream-Bot-Token': 'SECRET',
                'X-API-Gateway-Key': 'gateway-secret',
            },
            data={'chat_id': '@channel'},
            allow_redirects=False,
        )

    @patch.dict('os.environ', {
        'API_GATEWAY_URL': 'https://gateway.example.test',
        'API_GATEWAY_KEY': 'gateway-secret',
    }, clear=False)
    @patch('social_stats.egress.router.requests.request')
    def test_auto_falls_back_only_after_network_error(self, request):
        direct_error = requests.Timeout('blocked')
        gateway_response = Mock(status_code=200)
        request.side_effect = [direct_error, gateway_response]

        result = outbound_request(
            'telegram', 'GET', 'https://api.telegram.org/', mode='auto'
        )

        self.assertEqual(result.egress_route.route, 'gateway')
        self.assertTrue(direct_circuit_open('telegram'))
        self.assertEqual(request.call_count, 2)
        self.assertEqual(
            request.call_args_list[1].kwargs['url'],
            'https://gateway.example.test/telegram/',
        )

    @patch.dict('os.environ', {
        'API_GATEWAY_URL': 'https://gateway.example.test',
    }, clear=False)
    @patch('social_stats.egress.router.requests.request')
    def test_auto_does_not_fallback_on_http_error_response(self, request):
        response = Mock(status_code=403, ok=False)
        request.return_value = response

        result = outbound_request(
            'telegram', 'GET', 'https://api.telegram.org/', mode='auto'
        )

        self.assertIs(result, response)
        self.assertEqual(result.egress_route.route, 'direct')
        self.assertEqual(request.call_count, 1)
        self.assertFalse(direct_circuit_open('telegram'))

    @patch.dict('os.environ', {
        'API_GATEWAY_URL': 'https://gateway.example.test',
        'OUTBOUND_TELEGRAM_MODE': 'gateway',
        'OUTBOUND_ROUTING_DEFAULT': 'direct',
    }, clear=False)
    @patch('social_stats.egress.router.requests.request')
    def test_service_mode_overrides_global_default(self, request):
        response = Mock(status_code=200)
        request.return_value = response

        result = outbound_request('telegram', 'GET', 'https://api.telegram.org/')

        self.assertEqual(result.egress_route.route, 'gateway')
        self.assertEqual(
            request.call_args.kwargs['url'],
            'https://gateway.example.test/telegram/',
        )

    @patch.dict('os.environ', {
        'API_GATEWAY_URL': 'https://gateway.example.test',
    }, clear=False)
    def test_rejects_url_outside_service_allowlist(self):
        with self.assertRaises(ValueError):
            outbound_request(
                'telegram', 'GET', 'https://evil.example.test/steal', mode='gateway'
            )
