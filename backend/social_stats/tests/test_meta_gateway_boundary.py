import io
import json
from pathlib import Path
from unittest.mock import patch

import requests
from django.test import SimpleTestCase
from requests import Response
from social_stats.egress.meta import MetaGatewayError, requests as meta_http
from social_stats.egress.router import outbound_request
from social_stats.instagram_calendar import build_reader, fetch_public_posts

ENV = {'API_GATEWAY_URL': 'https://gateway.example.test', 'API_GATEWAY_KEY': 'gateway-secret',
       'OUTBOUND_ROUTING_DEFAULT': 'direct', 'OUTBOUND_META_MODE': 'direct'}


def response(body=None, status=200):
    result = Response()
    result.status_code = status
    result._content = json.dumps(body or {}).encode()
    result.raw = io.BytesIO(result._content)
    result.headers['Content-Type'] = 'application/json'
    return result


@patch.dict('os.environ', ENV)
class MetaGatewayBoundaryTests(SimpleTestCase):
    @patch('social_stats.egress.router.requests.request')
    def test_meta_cannot_select_direct_even_when_explicitly_requested(self, send):
        send.return_value = response()
        outbound_request('meta', 'GET', 'https://graph.facebook.com/v25.0/me', mode='direct')
        self.assertEqual(send.call_args.kwargs['url'], 'https://gateway.example.test/meta/v25.0/me')
        self.assertFalse(send.call_args.kwargs['allow_redirects'])

    @patch('social_stats.egress.router.requests.request')
    def test_facade_uses_gateway_for_each_known_meta_host(self, send):
        from social_stats.egress.meta import META_ORIGINS
        from social_stats.egress.registry import SERVICES
        send.return_value = response()
        for host, service in META_ORIGINS.items():
            meta_http.post(f'https://{host}/test', json={'field': 'value'}, headers={'Host': 'evil.test'})
            args = send.call_args.kwargs
            self.assertEqual(args['url'], f'https://gateway.example.test/{SERVICES[service].gateway_route}/test')
            self.assertEqual(args['headers']['X-API-Gateway-Key'], 'gateway-secret')
            self.assertNotIn('Host', args['headers'])
            self.assertFalse(args['allow_redirects'])
            self.assertTrue(args['verify'])

    @patch('social_stats.egress.router.requests.request')
    def test_gateway_network_failure_is_not_retried_directly(self, send):
        send.side_effect = requests.ConnectionError('private cookie=secret')
        with self.assertRaises(MetaGatewayError) as error:
            meta_http.get('https://graph.facebook.com/v25.0/me')
        self.assertNotIn('secret', str(error.exception))
        self.assertEqual(send.call_count, 1)

    @patch.dict('os.environ', {'API_GATEWAY_URL': '', 'API_GATEWAY_KEY': ''})
    @patch('social_stats.egress.router.requests.request')
    def test_missing_gateway_fails_before_network(self, send):
        with self.assertRaises(MetaGatewayError):
            meta_http.get('https://www.instagram.com/api/v1/test/')
        send.assert_not_called()

    @patch('requests.adapters.HTTPAdapter.send')
    def test_installed_sdk_sessions_keep_cookies_and_route_through_gateway(self, send):
        send.side_effect = lambda *args, **kwargs: response()
        reader = build_reader()
        reader.public.cookies.set('sessionid', 'reader-cookie', domain='.instagram.com', path='/')
        result = reader.public.get('https://www.instagram.com/api/v1/test/',
                                   proxies={'https': 'http://alternate.invalid'}, verify=False)
        self.assertEqual(send.call_args.kwargs['proxies'], {})
        self.assertTrue(send.call_args.kwargs['verify'])
        forwarded = send.call_args.args[0]
        self.assertEqual(forwarded.url, 'https://gateway.example.test/instagram-web/api/v1/test/')
        self.assertIn('sessionid=reader-cookie', forwarded.headers['Cookie'])
        self.assertEqual(forwarded.headers['X-API-Gateway-Key'], 'gateway-secret')
        self.assertNotIn('X-API-Gateway-Key', result.request.headers)
        self.assertEqual(result.url, 'https://www.instagram.com/api/v1/test/')
        reader.private.get('https://i.instagram.com/api/v1/test/')
        self.assertEqual(send.call_args.args[0].url, 'https://gateway.example.test/instagram-private/api/v1/test/')

    @patch('requests.adapters.HTTPAdapter.send')
    def test_sdk_redirect_does_not_follow_or_leak_internal_key(self, send):
        redirected = response(status=302)
        redirected.headers['Location'] = 'https://evil.test/collect'
        send.return_value = redirected
        with self.assertRaises(MetaGatewayError):
            build_reader().public.get('https://www.instagram.com/test/')
        self.assertEqual(send.call_count, 1)

    @patch('requests.adapters.HTTPAdapter.send')
    def test_unknown_sdk_origins_are_rejected_without_network(self, send):
        for url in ['http://www.instagram.com/test', 'https://unknown.instagram.com/test', 'https://evil.test/test']:
            with self.assertRaises(MetaGatewayError):
                build_reader().public.get(url)
        send.assert_not_called()

    def test_anonymous_adapter_only_uses_public_methods(self):
        from types import SimpleNamespace
        from unittest.mock import Mock
        reader = Mock()
        reader.user_info_by_username_gql.return_value = SimpleNamespace(pk='1', is_private=False, media_count=0)
        reader._user_medias_paginated_public_gql.return_value = ([], None)
        self.assertEqual(fetch_public_posts(reader, 'example', anonymous=True), [])
        reader.user_info_by_username_v1.assert_not_called()
        reader.user_medias_v1.assert_not_called()

    def test_existing_meta_callers_use_shared_routing_facade(self):
        root = Path(__file__).resolve().parents[1]
        for name in ['tasks.py', 'inbox_tasks.py', 'competitor_tasks.py', 'meta_capi.py',
                     'token_verifier.py', 'views/oauth.py', 'views/social_auth.py',
                     'views/meta_ads.py', 'publishers/_graph_client.py']:
            self.assertIn('from social_stats.egress.meta import requests', (root / name).read_text(), name)

    @patch('requests.adapters.HTTPAdapter.send')
    def test_saved_session_restore_and_sdk_reinitialization_cannot_restore_direct_adapters(self, send):
        send.side_effect = lambda *args, **kwargs: response()
        settings = build_reader().get_settings()
        settings['authorization_data'] = {'ds_user_id': '1', 'sessionid': 'fixture-session'}
        settings['public_transport'] = 'curl'
        settings['tls_verify'] = False
        reader = build_reader(json.dumps(settings))
        reader.init()  # SDK resets mounted adapters on init and during login.
        reader.public.get('https://www.instagram.com/test/')
        self.assertEqual(send.call_args.args[0].url, 'https://gateway.example.test/instagram-web/test/')
        self.assertTrue(send.call_args.kwargs['verify'])
        reader.private.get('https://i.instagram.com/test/')
        self.assertEqual(send.call_args.args[0].url, 'https://gateway.example.test/instagram-private/test/')
        self.assertNotIn('gateway-secret', json.dumps(reader.get_settings()))

    @patch('requests.adapters.HTTPAdapter.send')
    def test_requests_session_consumers_also_cannot_bypass_gateway(self, send):
        send.return_value = response()
        session = meta_http.Session()
        session.get('https://graph.facebook.com/test/')
        self.assertEqual(send.call_args.args[0].url, 'https://gateway.example.test/meta/test/')
