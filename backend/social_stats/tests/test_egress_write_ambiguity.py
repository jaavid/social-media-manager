"""A transport failure must not cause a second ambiguous provider write."""
from unittest.mock import Mock, patch

import requests
from django.test import SimpleTestCase

from social_stats.egress.router import clear_direct_circuit, direct_circuit_open, outbound_request


class EgressWriteAmbiguityTests(SimpleTestCase):
    def tearDown(self):
        clear_direct_circuit('telegram')

    def test_ambiguous_writes_have_one_side_effect_and_no_gateway_replay(self):
        for method in ('POST', 'PATCH', 'PUT', 'DELETE'):
            for error_type in (requests.ReadTimeout, requests.ConnectionError, requests.exceptions.SSLError):
                for gateway in ('', 'https://gateway.example.test'):
                    with self.subTest(method=method, error=error_type.__name__, gateway=bool(gateway)):
                        clear_direct_circuit('telegram')
                        effects = []

                        def send(**kwargs):
                            effects.append(kwargs['url'])
                            raise error_type('fixture ambiguous response')

                        with patch.dict('os.environ', {'API_GATEWAY_URL': gateway}), patch(
                            'social_stats.egress.router.requests.request', side_effect=send,
                        ) as request:
                            with self.assertRaises(error_type):
                                outbound_request('telegram', method, 'https://api.telegram.org/sendMessage', mode='auto')
                        self.assertEqual(request.call_count, 1)
                        self.assertEqual(len(effects), 1)
                        self.assertFalse(direct_circuit_open('telegram'))

    def test_connect_timeout_before_send_can_use_gateway_once(self):
        with patch.dict('os.environ', {'API_GATEWAY_URL': 'https://gateway.example.test'}), patch(
            'social_stats.egress.router.requests.request',
            side_effect=[requests.ConnectTimeout('fixture connect failed'), Mock(status_code=200)],
        ) as request:
            response = outbound_request('telegram', 'POST', 'https://api.telegram.org/sendMessage', mode='auto', allow_redirects=False)
            self.assertEqual(response.egress_route.route, 'gateway')
            self.assertEqual(request.call_count, 2)
            self.assertTrue(direct_circuit_open('telegram'))
            # A subsequent operation chooses gateway before sending; this is not a retry.
            request.side_effect = None
            request.return_value = Mock(status_code=200)
            outbound_request('telegram', 'POST', 'https://api.telegram.org/sendMessage', mode='auto')
            self.assertEqual(request.call_count, 3)
            self.assertIn('gateway.example.test', request.call_args.kwargs['url'])

    def test_safe_reads_can_fallback_and_unconfigured_connect_failure_propagates(self):
        for method in ('GET', 'HEAD', 'OPTIONS'):
            for error_type in (requests.ReadTimeout, requests.ConnectionError, requests.exceptions.SSLError):
                clear_direct_circuit('telegram')
                with self.subTest(method=method, error=error_type.__name__), patch.dict(
                    'os.environ', {'API_GATEWAY_URL': 'https://gateway.example.test'},
                ), patch('social_stats.egress.router.requests.request', side_effect=[error_type(), Mock(status_code=200)]) as request:
                    outbound_request('telegram', method, 'https://api.telegram.org/', mode='auto')
                    self.assertEqual(request.call_count, 2)
        clear_direct_circuit('telegram')
        with patch.dict('os.environ', {'API_GATEWAY_URL': ''}), patch(
            'social_stats.egress.router.requests.request', side_effect=requests.ConnectTimeout(),
        ) as request:
            with self.assertRaises(requests.ConnectTimeout):
                outbound_request('telegram', 'POST', 'https://api.telegram.org/sendMessage', mode='auto')
            self.assertEqual(request.call_count, 1)

    def test_connect_timeout_with_redirects_is_not_certainly_before_write(self):
        for redirects in (True, None):
            clear_direct_circuit('telegram')
            options = {} if redirects is None else {'allow_redirects': redirects}
            with patch.dict('os.environ', {'API_GATEWAY_URL': 'https://gateway.example.test'}), patch(
                'social_stats.egress.router.requests.request', side_effect=requests.ConnectTimeout(),
            ) as request:
                with self.assertRaises(requests.ConnectTimeout):
                    outbound_request('telegram', 'POST', 'https://api.telegram.org/sendMessage', mode='auto', **options)
                self.assertEqual(request.call_count, 1)
