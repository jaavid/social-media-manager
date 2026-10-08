"""New multi-destination grants cannot silently connect the first identity."""
import time
from unittest.mock import Mock, patch
from social_stats.models import Client, UserProfile
from django.contrib.auth.models import User
from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIRequestFactory, APIClient, force_authenticate
from social_stats.views.oauth import facebook_oauth_callback, google_oauth_callback


class OAuthDestinationSelection(SimpleTestCase):
    def request(self, platform):
        state = f'7:{platform}:public-fixture-state'
        request = APIRequestFactory().get('/api/oauth/callback/', {'code': 'public-fixture-code', 'state': state})
        request.session = {'oauth_connection': {'workspace_id': 7, 'platform': platform, 'account_id': None, 'matched': False}}
        force_authenticate(request, User(pk=1, username='public-fixture'))
        return request

    def response(self, data):
        return Mock(status_code=200, json=Mock(return_value=data))

    @patch('social_stats.views.oauth._oauth_state_valid', return_value=True)
    @patch('social_stats.views.oauth._save_credential')
    @patch('social_stats.views.oauth.requests.post')
    @patch('social_stats.views.oauth.requests.get')
    def test_new_youtube_multi_channel_requires_explicit_selection(self, get, post, save, valid):
        post.return_value = self.response({'access_token': 'public-fixture-only', 'refresh_token': 'public-fixture-only'})
        get.return_value = self.response({'items': [{'id': 'channel-one', 'snippet': {'title': 'First public fixture'}}, {'id': 'channel-two', 'snippet': {'title': 'Second public fixture'}}]})
        request = self.request('youtube')
        response = google_oauth_callback(request)
        self.assertEqual(save.call_count, 0)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, '/api/oauth/destination-selection/')
        self.assertNotIn('public-fixture-only', str(request.session))

    @patch('social_stats.views.oauth._oauth_state_valid', return_value=True)
    @patch('social_stats.views.oauth._save_credential')
    @patch('social_stats.views.oauth.requests.post')
    @patch('social_stats.views.oauth.requests.get')
    def test_new_google_business_multi_account_requires_explicit_selection(self, get, post, save, valid):
        post.return_value = self.response({'access_token': 'public-fixture-only'})
        get.return_value = self.response({'accounts': [{'name': 'accounts/one', 'accountName': 'First public fixture'}, {'name': 'accounts/two', 'accountName': 'Second public fixture'}]})
        request = self.request('google_my_business')
        response = google_oauth_callback(request)
        self.assertEqual(save.call_count, 0)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, '/api/oauth/destination-selection/')
        self.assertNotIn('public-fixture-only', str(request.session))

    @patch('social_stats.views.oauth._oauth_state_valid', return_value=True)
    @patch('social_stats.views.oauth._save_credential')
    @patch('social_stats.views.oauth.requests.get')
    def test_new_facebook_multi_page_requires_explicit_selection(self, get, save, valid):
        def provider_response(url, **kwargs):
            if url.endswith('/oauth/access_token'):
                return self.response({'access_token': 'public-fixture-only'})
            if url.endswith('/me/accounts'):
                return self.response({'data': [{'id': '100', 'name': 'First public fixture'}, {'id': '200', 'name': 'Second public fixture'}]})
            if url.endswith('/me/permissions'):
                return self.response({'data': []})
            return self.response({'instagram_business_account': {'id': '300' if url.endswith('/100') else '400'}})
        get.side_effect = provider_response
        request = self.request('facebook')
        response = facebook_oauth_callback(request)
        self.assertEqual(save.call_count, 0)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, '/api/oauth/destination-selection/')
        self.assertNotIn('public-fixture-only', str(request.session))


class DestinationChoiceBoundary(SimpleTestCase):
    def request(self):
        from types import SimpleNamespace
        return SimpleNamespace(user=SimpleNamespace(pk=1), session={'oauth_connection': {
            'workspace_id': 7, 'platform': 'youtube', 'account_id': None, 'matched': False,
            'user_id': 1, 'destinations': {},
        }})

    def test_only_public_choices_are_persisted_and_payload_is_discarded(self):
        from social_stats.oauth_destinations import choose_destination, DestinationResponse
        request = self.request()
        with self.assertRaises(DestinationResponse):
            choose_destination(request, [('one', 'x' * 190 + 'public-fixture-only', {'access_token': 'public-fixture-only'}),
                                         ('two', 'Public channel', {'access_token': 'public-fixture-only'})],
                               'youtube_channel', secrets_to_scrub=('public-fixture-only',))
        pending = request.session['oauth_destination_selection']
        self.assertEqual([row['id'] for row in pending['choices']], ['one', 'two'])
        self.assertNotIn('public-fixture-only', str(request.session))
        self.assertNotIn('access_token', str(request.session))
        self.assertNotIn('public-fix', str(request.session))

    def test_explicit_choice_and_reconnect_never_fall_back_to_first(self):
        from social_stats.oauth_destinations import choose_destination, DestinationResponse
        request = self.request()
        choices = [('one', 'First', {'id': 'one'}), ('two', 'Second', {'id': 'two'})]
        request.session['oauth_connection']['destinations'] = {'youtube_channel': 'two'}
        self.assertEqual(choose_destination(request, choices, 'youtube_channel')['id'], 'two')
        self.assertEqual(choose_destination(request, choices, 'youtube_channel', expected='one')['id'], 'one')
        with self.assertRaises(DestinationResponse) as rejected:
            choose_destination(request, choices, 'youtube_channel', expected='missing')
        self.assertIn('account_mismatch', rejected.exception.response.url)
        self.assertNotIn('oauth_connection', request.session)

    def test_duplicate_or_secret_identity_is_not_a_choice(self):
        from social_stats.oauth_destinations import choose_destination, DestinationResponse
        for choices in [[('same', 'One', {}), ('same', 'Two', {})], [('public-fixture-only', 'One', {})]]:
            with self.subTest(choices=len(choices)), self.assertRaises(DestinationResponse):
                choose_destination(self.request(), choices, 'youtube_channel', secrets_to_scrub=('public-fixture-only',))




class DestinationSelectionEndpoint(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('public-choice-owner')
        self.workspace = Client.objects.create(name='Public fixture', company='Public fixture', email='choice@example.com', owner_user=self.user)
        UserProfile.objects.create(user=self.user, role='client', client=self.workspace)
        self.api = APIClient(enforce_csrf_checks=True)
        self.api.force_authenticate(self.user)
        self.url = '/api/oauth/destination-selection/'
        self.install()

    def install(self, **changes):
        session = self.api.session
        session['oauth_connection'] = {'workspace_id': self.workspace.pk, 'platform': 'youtube',
                                      'account_id': None, 'matched': False, 'user_id': self.user.pk, 'destinations': {}}
        pending = {'user_id': self.user.pk, 'workspace_id': self.workspace.pk, 'platform': 'youtube',
                   'field': 'youtube_channel', 'choices': [{'id': 'one', 'name': '<Public fixture>'}, {'id': 'two', 'name': 'Second'}],
                   'destinations': {}, 'expires_at': time.time() + 300, 'nonce': 'public-fixture-nonce'}
        pending.update(changes)
        session['oauth_destination_selection'] = pending
        session.save()

    def csrf(self):
        response = self.api.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Cache-Control'], 'private, no-store')
        self.assertContains(response, '&lt;Public fixture&gt;')
        return self.api.cookies['csrftoken'].value

    def test_csrf_nonce_and_offered_identity_are_required(self):
        body = {'nonce': 'public-fixture-nonce', 'destination': 'two'}
        self.assertEqual(self.api.post(self.url, body).status_code, 403)
        csrf = self.csrf()
        self.assertEqual(self.api.post(self.url, {**body, 'nonce': 'wrong'}, HTTP_X_CSRFTOKEN=csrf).status_code, 400)
        self.assertEqual(self.api.post(self.url, {**body, 'destination': 'unoffered'}, HTTP_X_CSRFTOKEN=csrf).status_code, 400)
        response = self.api.post(self.url, body, HTTP_X_CSRFTOKEN=csrf)
        self.assertEqual(response.status_code, 302)
        self.assertNotIn('destination=', response.url)
        continuation = self.api.session['oauth_destination_continue']
        self.assertEqual(continuation['destinations'], {'youtube_channel': 'two'})
        self.assertNotIn('oauth_destination_selection', self.api.session)
        self.assertEqual(self.api.post(self.url, body, HTTP_X_CSRFTOKEN=csrf).status_code, 403)

    def test_expiry_wrong_user_and_permission_loss_clear_context(self):
        for changes in [{'expires_at': time.time() - 1}, {'user_id': self.user.pk + 1}, {'workspace_id': self.workspace.pk + 1}, {'platform': 'facebook'}]:
            self.install(**changes)
            self.assertEqual(self.api.get(self.url).status_code, 403)
            self.assertNotIn('oauth_connection', self.api.session)
        self.install()
        with patch('social_stats.views.oauth._oauth_callback_authorized', return_value=False):
            self.assertEqual(self.api.get(self.url).status_code, 403)
        self.assertNotIn('oauth_destination_selection', self.api.session)

    def test_cancel_clears_context_without_provider_request(self):
        csrf = self.csrf()
        with patch('social_stats.views.oauth.requests.get') as get, patch('social_stats.views.oauth.requests.post') as post:
            response = self.api.post(self.url, {'action': 'cancel'}, HTTP_X_CSRFTOKEN=csrf)
        self.assertEqual(response.status_code, 302)
        self.assertIn('oauth_cancelled', response.url)
        self.assertNotIn('oauth_connection', self.api.session)
        get.assert_not_called()
        post.assert_not_called()

    def test_selection_restart_uses_fresh_state_and_preserves_scope(self):
        from urllib.parse import parse_qs, urlparse
        original = self.api.get(f'/api/oauth/google/start/{self.workspace.pk}/?platform=youtube')
        original_query = parse_qs(urlparse(original.url).query)
        self.install()
        csrf = self.csrf()
        continuation = self.api.post(self.url, {'nonce': 'public-fixture-nonce', 'destination': 'two'}, HTTP_X_CSRFTOKEN=csrf)
        restarted = self.api.get(continuation.url)
        query = parse_qs(urlparse(restarted.url).query)
        self.assertEqual(query['scope'], original_query['scope'])
        self.assertNotEqual(query['state'], original_query['state'])
        self.assertEqual(self.api.session['oauth_connection']['destinations'], {'youtube_channel': 'two'})
        self.assertEqual(self.api.get(continuation.url).status_code, 400)

    def test_new_independent_start_discards_pending_choice(self):
        response = self.api.get(f'/api/oauth/google/start/{self.workspace.pk}/?platform=youtube')
        self.assertEqual(response.status_code, 302)
        self.assertNotIn('oauth_destination_selection', self.api.session)
        self.assertEqual(self.api.session['oauth_connection']['destinations'], {})

    @patch('social_stats.views.oauth.requests.post')
    @patch('social_stats.views.oauth.requests.get')
    def test_google_all_rolls_back_first_save_when_second_account_permission_is_denied(self, get, post):
        from social_stats.models import SocialAccount, PlatformCredential, SocialAccountPermissionOverride
        from urllib.parse import parse_qs, urlparse
        business = SocialAccount.objects.create(client=self.workspace, platform='google_my_business', external_id='locations/public-fixture')
        SocialAccountPermissionOverride.objects.create(user=self.user, account=business, permissions={'connect_platforms': False})
        start = self.api.get(f'/api/oauth/google/start/{self.workspace.pk}/?platform=all')
        state = parse_qs(urlparse(start.url).query)['state'][0]
        post.return_value = Mock(status_code=200, json=Mock(return_value={'access_token': 'public-fixture-only'}))
        replies = [{'items': [{'id': 'public-channel', 'snippet': {'title': 'Public channel'}}]},
                   {'accounts': [{'name': 'accounts/public-fixture', 'accountName': 'Public company'}]},
                   {'locations': [{'name': business.external_id, 'title': 'Public location'}]}]
        get.side_effect = [Mock(status_code=200, json=Mock(return_value=data)) for data in replies]
        response = self.api.get('/api/oauth/google/callback/', {'code': 'public-fixture-code', 'state': state})
        self.assertEqual(response.status_code, 403)
        self.assertFalse(PlatformCredential.objects.filter(client=self.workspace).exists())
        self.assertFalse(SocialAccount.objects.filter(client=self.workspace, platform='youtube').exists())


class MalformedDestinationCallbacks(OAuthDestinationSelection):
    @patch('social_stats.views.oauth._oauth_state_valid', return_value=True)
    @patch('social_stats.views.oauth._save_credential')
    @patch('social_stats.views.oauth.requests.post')
    @patch('social_stats.views.oauth.requests.get')
    def test_malformed_google_candidates_fail_safely_without_save(self, get, post, save, valid):
        post.return_value = self.response({'access_token': 'public-fixture-only'})
        for platform, data in [('youtube', {'items': [None]}), ('youtube', {'items': [{'id': 'channel', 'snippet': None}]}),
                               ('youtube', {'items': {}}), ('google_my_business', {'accounts': [None]}),
                               ('google_my_business', {'accounts': 'invalid'})]:
            with self.subTest(platform=platform, malformed=type(data.get('items', data.get('accounts'))).__name__):
                get.return_value = self.response(data)
                response = google_oauth_callback(self.request(platform))
                self.assertEqual(response.status_code, 302)
                self.assertIn('destination_unavailable', response.url)
                save.assert_not_called()

    @patch('social_stats.views.oauth._oauth_state_valid', return_value=True)
    @patch('social_stats.views.oauth._save_credential')
    @patch('social_stats.views.oauth.requests.post')
    @patch('social_stats.views.oauth.requests.get')
    def test_selected_youtube_identity_disappearing_fails_without_fallback(self, get, post, save, valid):
        post.return_value = self.response({'access_token': 'public-fixture-only'})
        get.return_value = self.response({'items': []})
        request = self.request('youtube')
        request.session['oauth_connection']['destinations'] = {'youtube_channel': 'selected-public-channel'}
        response = google_oauth_callback(request)
        self.assertIn('account_mismatch', response.url)
        save.assert_not_called()
