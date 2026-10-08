"""No credential-bearing gateway request may use HTTP or follow a redirect."""
from unittest.mock import Mock, patch
from django.test import SimpleTestCase
from social_stats.egress.router import outbound_request, clear_direct_circuit, mark_direct_unhealthy
from social_stats.egress.health import probe_gateway_health, probe_gateway_route, runtime_route


class GatewayTLSBoundary(SimpleTestCase):
    def tearDown(self):
        clear_direct_circuit('telegram')

    @patch('social_stats.egress.router.requests.request')
    def test_non_tls_gateway_rejected_before_sending_secrets(self, send):
        for url in ['http://gateway.example.test', 'https:///missing-host', 'https://user@gateway.example.test', 'https://gateway.example.test:bad']:
            with self.subTest(url=url), patch.dict('os.environ', {'API_GATEWAY_URL': url, 'API_GATEWAY_KEY': 'public-fixture-only'}):
                with self.assertRaises(ValueError):
                    outbound_request('telegram', 'POST', 'https://api.telegram.org/test', mode='gateway', data={'text': 'Public fixture'})
                send.assert_not_called()

    @patch.dict('os.environ', {'API_GATEWAY_URL': 'https://gateway.example.test'})
    @patch('social_stats.egress.router.requests.request')
    def test_gateway_forces_no_redirects_even_when_caller_requests_them(self, send):
        send.return_value = Mock(status_code=307)
        response = outbound_request('telegram', 'POST', 'https://api.telegram.org/test', mode='gateway', allow_redirects=True)
        self.assertEqual(response.status_code, 307)
        self.assertEqual(send.call_count, 1)
        self.assertIs(send.call_args.kwargs.get('allow_redirects'), False)

    @patch.dict('os.environ', {'API_GATEWAY_URL': 'http://gateway.example.test', 'OUTBOUND_ROUTING_DEFAULT': 'auto'})
    @patch('social_stats.egress.health.requests.get')
    def test_invalid_gateway_diagnostics_are_unavailable_without_network_or_500(self, get):
        self.assertFalse(probe_gateway_health()['reachable'])
        self.assertFalse(probe_gateway_route('telegram')['reachable'])
        self.assertEqual(runtime_route('telegram'), 'direct')
        get.assert_not_called()
        with patch.dict('os.environ', {'OUTBOUND_ROUTING_DEFAULT': 'gateway'}):
            self.assertEqual(runtime_route('telegram'), 'gateway')

    @patch.dict('os.environ', {'API_GATEWAY_URL': 'https://gateway.example.test'})
    @patch('social_stats.egress.health.requests.get')
    def test_redirect_health_payload_cannot_claim_gateway_success(self, get):
        get.return_value = Mock(status_code=307, ok=True, headers={'content-type':'application/json'}, json=Mock(return_value={'ok':True,'reachable':True}))
        self.assertFalse(probe_gateway_health()['reachable'])
        self.assertFalse(probe_gateway_route('telegram')['reachable'])
        self.assertEqual(get.call_count, 2)
        self.assertTrue(all(call.kwargs.get('allow_redirects') is False for call in get.call_args_list))

    @patch.dict('os.environ', {'API_GATEWAY_URL': 'http://gateway.example.test', 'OUTBOUND_ROUTING_DEFAULT': 'auto'})
    @patch('social_stats.egress.router.requests.request')
    def test_open_circuit_with_invalid_optional_gateway_still_uses_direct(self, send):
        mark_direct_unhealthy('telegram')
        send.return_value = Mock(status_code=200)
        self.assertEqual(runtime_route('telegram'), 'direct')
        response = outbound_request('telegram', 'GET', 'https://api.telegram.org/test', mode='auto')
        self.assertEqual(response.egress_route.route, 'direct')
        send.assert_called_once_with(method='GET', url='https://api.telegram.org/test')
