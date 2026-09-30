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
