from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from social_stats.models import UserProfile
from social_stats.security.sessions import UserSession, revoke_all_for_user


@override_settings(ALLOWED_HOSTS=['testserver'], SESSION_COOKIE_SECURE=True, CSRF_COOKIE_SECURE=True)
class BrowserSessionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='browser@example.com', password='StrongPass!234xyz')
        UserProfile.objects.create(user=self.user, role='staff')
        self.client = APIClient(enforce_csrf_checks=True)
        self.headers = {'HTTP_X_BROWSER_SESSION': '1', 'HTTP_ORIGIN': 'https://testserver'}

    def csrf(self):
        response = self.client.get('/api/auth/session/', secure=True, **self.headers)
        self.assertEqual(response.status_code, 200)
        self.headers['HTTP_X_CSRFTOKEN'] = response.data['csrfToken']

    def login(self):
        self.csrf()
        response = self.client.post('/api/auth/login/', {'username': self.user.username, 'password': 'StrongPass!234xyz', 'terms_accepted': True}, format='json', secure=True, **self.headers)
        self.assertEqual(response.status_code, 200, response.content)
        return response

    def test_cookie_attributes_no_browser_jwt_and_logout_revocation(self):
        response = self.login()
        self.assertTrue(response.data['session'])
        self.assertNotIn('access', response.data)
        self.assertNotIn('refresh', response.data)
        self.assertNotIn(b'"access"', response.content)
        cookie = response.cookies['sessionid']
        self.assertTrue(cookie['httponly'])
        self.assertTrue(cookie['secure'])
        self.assertEqual(cookie['samesite'], 'Lax')
        self.assertEqual(cookie['path'], '/')
        self.assertEqual(self.client.get('/api/auth/me/', secure=True, **self.headers).data['id'], self.user.id)
        self.csrf()  # login rotates CSRF
        jti = self.client.session['browser_session_jti']
        self.assertEqual(self.client.delete('/api/auth/session/', secure=True, **self.headers).status_code, 204)
        self.assertIsNotNone(UserSession.objects.get(refresh_jti=jti).revoked_at)
        self.assertEqual(self.client.get('/api/auth/me/', secure=True, **self.headers).status_code, 401)

    def test_anonymous_login_and_migration_require_csrf_even_without_contract_header(self):
        payload = {'username': self.user.username, 'password': 'StrongPass!234xyz', 'terms_accepted': True}
        self.assertEqual(self.client.post('/api/auth/login/', payload, format='json', secure=True, **self.headers).status_code, 403)
        refresh = RefreshToken.for_user(self.user)
        self.assertEqual(self.client.post('/api/auth/session/', {'refresh': str(refresh)}, format='json', secure=True).status_code, 403)

    def test_cross_origin_login_and_mutations_rejected(self):
        self.login()
        self.csrf()
        bad = {**self.headers, 'HTTP_ORIGIN': 'https://attacker.invalid'}
        response = self.client.patch('/api/profile/', {'name': 'Changed'}, format='json', secure=True, **bad)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.client.post('/api/auth/login/', {}, format='json', secure=True, **bad).status_code, 403)

    @override_settings(CSRF_TRUSTED_ORIGINS=['https://frontend.example.com'])
    def test_explicit_next_proxy_origin_requires_csrf_and_rejects_other_origins(self):
        self.headers['HTTP_ORIGIN'] = 'https://frontend.example.com'
        payload = {'username': self.user.username, 'password': 'StrongPass!234xyz', 'terms_accepted': True}
        self.assertEqual(self.client.post('/api/auth/login/', payload, format='json', secure=True, **self.headers).status_code, 403)
        self.login()
        self.csrf()
        self.assertEqual(self.client.get('/api/auth/me/', secure=True, **self.headers).status_code, 200)
        bad = {**self.headers, 'HTTP_ORIGIN': 'https://attacker.invalid'}
        self.assertEqual(self.client.patch('/api/profile/', {}, format='json', secure=True, **bad).status_code, 403)
        self.assertEqual(self.client.delete('/api/auth/session/', secure=True, **self.headers).status_code, 204)

    def test_existing_refresh_is_consumed_once_by_cookie_migration(self):
        refresh = RefreshToken.for_user(self.user)
        self.csrf()
        response = self.client.post('/api/auth/session/', {'refresh': str(refresh)}, format='json', secure=True, **self.headers)
        self.assertEqual(response.data, {'session': True})
        self.assertEqual(self.client.get('/api/auth/me/', secure=True, **self.headers).status_code, 200)
        self.csrf()
        self.assertEqual(self.client.post('/api/auth/session/', {'refresh': str(refresh)}, format='json', secure=True, **self.headers).status_code, 401)

    def test_revoked_or_disabled_identity_is_rejected_by_api(self):
        self.login()
        revoke_all_for_user(self.user)
        self.assertEqual(self.client.get('/api/auth/me/', secure=True, **self.headers).status_code, 401)
        self.login()
        self.user.is_active = False
        self.user.save(update_fields=['is_active'])
        self.assertEqual(self.client.get('/api/auth/me/', secure=True, **self.headers).status_code, 401)

    def test_native_jwt_contract_preserved(self):
        response = APIClient().post('/api/auth/login/', {'username': self.user.username, 'password': 'StrongPass!234xyz', 'terms_accepted': True}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertNotIn('sessionid', response.cookies)

    def test_mfa_challenge_remains_server_owned_and_is_consumed(self):
        from social_stats.security.mfa import UserMFA, generate_backup_codes
        mfa = UserMFA.objects.create(user=self.user, is_enabled=True)
        backup = generate_backup_codes(mfa)[0]
        self.csrf()
        response = self.client.post('/api/auth/login/', {'username': self.user.username, 'password': 'StrongPass!234xyz', 'terms_accepted': True}, format='json', secure=True, **self.headers)
        self.assertTrue(response.data['mfa_required'])
        self.assertEqual(response.data['mfa_token'], 'session')
        self.assertNotEqual(self.client.session['browser_pending_mfa'], 'session')
        response = self.client.post('/api/auth/mfa/login/', {'mfa_token': 'session', 'backup_code': backup, 'terms_accepted': True}, format='json', secure=True, **self.headers)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data['session'], True)
        self.assertNotIn('access', response.data)
        self.assertNotIn('browser_pending_mfa', self.client.session)

    def test_migration_database_outage_does_not_claim_expired_credentials(self):
        from unittest.mock import patch
        from django.db import OperationalError
        self.csrf()
        self.client.raise_request_exception = False
        with patch('social_stats.browser_session.RefreshToken', side_effect=OperationalError('unavailable')):
            response = self.client.post('/api/auth/session/', {'refresh': 'legacy'}, format='json', secure=True, **self.headers)
        self.assertEqual(response.status_code, 500)
