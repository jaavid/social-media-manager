import urllib.parse
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import Client, TestCase, override_settings


DISCOVERY = {
    'issuer': 'https://auth.example.test/application/o/social-stats',
    'authorization_endpoint': 'https://auth.example.test/application/o/authorize/',
    'token_endpoint': 'https://auth.example.test/application/o/token/',
    'userinfo_endpoint': 'https://auth.example.test/application/o/userinfo/',
}

SSO_ENV = {
    'SSO_OIDC_ISSUER': DISCOVERY['issuer'],
    'SSO_OIDC_CLIENT_ID': 'social-stats-test',
    'SSO_OIDC_CLIENT_SECRET': 'test-secret',
    'SSO_OIDC_REDIRECT_URI': 'https://social.example.test/api/auth/sso/callback/',
    'SSO_OIDC_LABEL': 'Company SSO',
}


class MockResponse:
    def __init__(self, payload, status_code=200):
        self.payload = payload
        self.status_code = status_code

    def json(self):
        return self.payload

    def raise_for_status(self):
        if self.status_code >= 400:
            import requests
            raise requests.HTTPError(f'HTTP {self.status_code}')


@override_settings(FRONTEND_URL='https://social.example.test')
class OIDCSSOTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_config_is_disabled_without_oidc_environment(self):
        with patch.dict('os.environ', {
            'SSO_OIDC_ISSUER': '',
            'SSO_OIDC_CLIENT_ID': '',
            'SSO_OIDC_CLIENT_SECRET': '',
        }, clear=False):
            response = self.client.get('/api/auth/sso/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['enabled'], False)

    def test_start_uses_state_and_pkce(self):
        with patch.dict('os.environ', SSO_ENV, clear=False), patch(
            'social_stats.oidc_sso.http_requests.get',
            return_value=MockResponse(DISCOVERY),
        ):
            response = self.client.get('/api/auth/sso/start/')

        self.assertEqual(response.status_code, 302)
        target = urllib.parse.urlparse(response['Location'])
        params = urllib.parse.parse_qs(target.query)
        self.assertEqual(target.scheme, 'https')
        self.assertEqual(params['client_id'], ['social-stats-test'])
        self.assertEqual(params['code_challenge_method'], ['S256'])
        self.assertTrue(params['code_challenge'][0])
        self.assertTrue(params['state'][0])
        self.assertEqual(params['scope'], ['openid email profile'])

        session = self.client.session
        self.assertEqual(session['oidc_sso_state'], params['state'][0])
        self.assertTrue(session['oidc_sso_code_verifier'])

    def test_callback_links_existing_user_and_returns_application_tokens(self):
        User.objects.create_user(
            username='amin@example.test',
            email='amin@example.test',
            password='not-used-by-sso',
        )

        with patch.dict('os.environ', SSO_ENV, clear=False), patch(
            'social_stats.oidc_sso.http_requests.get',
            return_value=MockResponse(DISCOVERY),
        ):
            start = self.client.get('/api/auth/sso/start/')

        state = urllib.parse.parse_qs(urllib.parse.urlparse(start['Location']).query)['state'][0]

        get_responses = [
            MockResponse(DISCOVERY),
            MockResponse({
                'sub': 'authentik-user-123',
                'email': 'amin@example.test',
                'email_verified': True,
                'name': 'Amin',
            }),
        ]
        with patch.dict('os.environ', SSO_ENV, clear=False), patch(
            'social_stats.oidc_sso.http_requests.get',
            side_effect=get_responses,
        ), patch(
            'social_stats.oidc_sso.http_requests.post',
            return_value=MockResponse({'access_token': 'provider-access'}),
        ) as token_post:
            response = self.client.get(
                '/api/auth/sso/callback/',
                {'code': 'authorization-code', 'state': state},
            )

        self.assertEqual(response.status_code, 302)
        self.assertIn('https://social.example.test/auth/callback?', response['Location'])
        callback_params = urllib.parse.parse_qs(urllib.parse.urlparse(response['Location']).query)
        self.assertTrue(callback_params['access'][0])
        self.assertTrue(callback_params['refresh'][0])

        token_payload = token_post.call_args.kwargs['data']
        self.assertEqual(token_payload['code'], 'authorization-code')
        self.assertEqual(token_payload['client_id'], 'social-stats-test')
        self.assertEqual(token_payload['client_secret'], 'test-secret')
        self.assertTrue(token_payload['code_verifier'])

    def test_callback_rejects_invalid_state_before_token_exchange(self):
        with patch.dict('os.environ', SSO_ENV, clear=False), patch(
            'social_stats.oidc_sso.http_requests.get',
            return_value=MockResponse(DISCOVERY),
        ):
            self.client.get('/api/auth/sso/start/')

        with patch.dict('os.environ', SSO_ENV, clear=False), patch(
            'social_stats.oidc_sso.http_requests.post'
        ) as token_post:
            response = self.client.get(
                '/api/auth/sso/callback/',
                {'code': 'authorization-code', 'state': 'wrong-state'},
            )

        self.assertEqual(response.status_code, 302)
        self.assertIn('/login?error=', response['Location'])
        token_post.assert_not_called()
