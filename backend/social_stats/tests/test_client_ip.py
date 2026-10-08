from django.http import HttpResponse
from django.test import RequestFactory, SimpleTestCase, override_settings

from axes.helpers import get_client_ip_address

from social_stats.security.client_ip import get_client_ip
from social_stats.security.middleware import RequestIDMiddleware


class ClientIPResolverTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()

    @override_settings(TRUST_PROXY_CLIENT_IP=False)
    def test_untrusted_proxy_headers_are_ignored_by_default(self):
        request = self.factory.get(
            '/',
            HTTP_AR_REAL_IP='203.0.113.10',
            HTTP_X_REAL_IP='203.0.113.11',
            HTTP_X_FORWARDED_FOR='203.0.113.12, 10.0.0.2',
            REMOTE_ADDR='127.0.0.1',
        )
        self.assertEqual(get_client_ip(request), '127.0.0.1')

    @override_settings(TRUST_PROXY_CLIENT_IP=True)
    def test_arvan_real_ip_has_highest_priority(self):
        request = self.factory.get(
            '/',
            HTTP_AR_REAL_IP='203.0.113.10',
            HTTP_X_REAL_IP='203.0.113.11',
            HTTP_X_FORWARDED_FOR='203.0.113.12, 10.0.0.2',
            REMOTE_ADDR='127.0.0.1',
        )
        self.assertEqual(get_client_ip(request), '203.0.113.10')

    @override_settings(TRUST_PROXY_CLIENT_IP=True)
    def test_x_real_ip_is_fallback(self):
        request = self.factory.get(
            '/',
            HTTP_X_REAL_IP='198.51.100.20',
            HTTP_X_FORWARDED_FOR='198.51.100.21, 10.0.0.2',
            REMOTE_ADDR='127.0.0.1',
        )
        self.assertEqual(get_client_ip(request), '198.51.100.20')

    @override_settings(TRUST_PROXY_CLIENT_IP=True)
    def test_first_valid_forwarded_ip_is_used(self):
        request = self.factory.get(
            '/',
            HTTP_X_FORWARDED_FOR='not-an-ip, 2001:db8::10, 10.0.0.2',
            REMOTE_ADDR='127.0.0.1',
        )
        self.assertEqual(get_client_ip(request), '2001:db8::10')

    @override_settings(TRUST_PROXY_CLIENT_IP=True)
    def test_invalid_proxy_headers_fall_back_to_remote_addr(self):
        request = self.factory.get(
            '/',
            HTTP_AR_REAL_IP='bad',
            HTTP_X_REAL_IP='also-bad',
            HTTP_X_FORWARDED_FOR='still-bad',
            REMOTE_ADDR='127.0.0.1',
        )
        self.assertEqual(get_client_ip(request), '127.0.0.1')

    @override_settings(TRUST_PROXY_CLIENT_IP=True)
    def test_first_middleware_normalizes_ip_for_django_axes(self):
        request = self.factory.get(
            '/admin/login/',
            HTTP_AR_REAL_IP='203.0.113.77',
            HTTP_X_FORWARDED_FOR='198.51.100.3',
            REMOTE_ADDR='127.0.0.1',
        )
        middleware = RequestIDMiddleware(lambda req: HttpResponse('ok'))
        response = middleware(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(request.META['REMOTE_ADDR'], '203.0.113.77')
        self.assertEqual(request.META['HTTP_X_REAL_IP'], '203.0.113.77')
        self.assertEqual(
            request.META['HTTP_X_FORWARDED_FOR'].split(',')[0].strip(),
            '203.0.113.77',
        )
        self.assertEqual(get_client_ip_address(request), '203.0.113.77')

    @override_settings(TRUST_PROXY_CLIENT_IP=False)
    def test_untrusted_forwarding_cannot_bypass_api_key_allowlist_or_login_throttle(self):
        from types import SimpleNamespace
        from social_stats.security.api_keys import _client_ip, verify_ip
        from social_stats.security.throttles import LoginIPThrottle
        remote, forged = '198.51.100.44', '203.0.113.7'
        request = self.factory.get('/', REMOTE_ADDR=remote, HTTP_AR_REAL_IP=forged,
                                   HTTP_X_REAL_IP=forged, HTTP_X_FORWARDED_FOR=forged)
        RequestIDMiddleware(lambda req: HttpResponse('ok'))(request)
        self.assertEqual(_client_ip(request), remote)
        self.assertFalse(verify_ip(SimpleNamespace(ip_allowlist=[forged]), _client_ip(request)))
        self.assertEqual(LoginIPThrottle().get_cache_key(request, None), f'throttle_login_ip_{remote}')
        for header in ['HTTP_AR_REAL_IP', 'HTTP_X_REAL_IP', 'HTTP_X_FORWARDED_FOR']:
            self.assertNotIn(header, request.META)

    @override_settings(TRUST_PROXY_CLIENT_IP=False)
    def test_missing_peer_address_cannot_leave_attacker_throttle_identity(self):
        from social_stats.security.api_keys import _client_ip
        from social_stats.security.throttles import LoginIPThrottle
        request = self.factory.get('/', HTTP_X_FORWARDED_FOR='203.0.113.7')
        request.META.pop('REMOTE_ADDR', None)
        RequestIDMiddleware(lambda req: HttpResponse('ok'))(request)
        self.assertIsNone(_client_ip(request))
        self.assertIsNone(LoginIPThrottle().get_cache_key(request, None))
