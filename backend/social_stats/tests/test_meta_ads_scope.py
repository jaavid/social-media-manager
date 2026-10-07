"""Meta picker boundaries use real authorization and mocked Graph transport."""
from unittest.mock import patch
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from social_stats.models import (
    Client, UserProfile, PlatformCredential, SocialAccount,
    SocialAccountPermissionOverride, WorkspaceMemberPolicy,
)


class MetaAdsScopeTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='meta-owner')
        self.workspace = Client.objects.create(name='Meta', company='Meta', email='meta@example.test', owner_user=self.user)
        UserProfile.objects.create(user=self.user, role='client', client=self.workspace)
        self.other = Client.objects.create(name='Other', company='Other', email='other@example.test')
        self.account = SocialAccount.objects.create(client=self.workspace, platform='facebook', external_id='page')
        self.credential = PlatformCredential.objects.create(client=self.workspace, platform='facebook', social_account=self.account, access_token='fixture-secret')
        self.api = APIClient()
        self.api.force_authenticate(self.user)
        self.graph = patch('social_stats.views.meta_ads._graph').start()
        self.addCleanup(patch.stopall)
        self.graph.return_value = (True, {'data': [{'id': 'act_10', 'name': 'Account'}]})

    def read(self, kind='accounts', **params):
        return self.api.get(f'/api/meta-ads/{kind}/', {'workspace_id': self.workspace.pk, **params})

    def test_explicit_workspace_and_tenant_denial_before_transport(self):
        self.assertEqual(self.api.get('/api/meta-ads/accounts/').status_code, 400)
        self.assertEqual(self.read(workspace_id=self.other.pk).status_code, 403)
        self.graph.assert_not_called()

    def test_workspace_and_account_permission_denials(self):
        policy = WorkspaceMemberPolicy.objects.create(user=self.user, workspace=self.workspace, permissions={'manage_automation': False})
        self.assertEqual(self.read().status_code, 403)
        policy.delete()
        SocialAccountPermissionOverride.objects.create(user=self.user, account=self.account, permissions={'manage_automation': False})
        self.assertEqual(self.read().status_code, 403)
        self.graph.assert_not_called()

    def test_disconnected_only_when_authorized_credential_absent(self):
        self.credential.delete()
        response = self.read()
        self.assertEqual(response.data, {'connected': False, 'workspace_id': self.workspace.pk})
        self.graph.assert_not_called()

    def test_ambiguous_credentials_fail_closed(self):
        PlatformCredential.objects.create(client=self.workspace, platform='facebook', access_token='second')
        self.assertEqual(self.read().status_code, 409)
        self.graph.assert_not_called()

    def test_accounts_empty_partial_and_malformed(self):
        for wire, status, partial in [({'data': []}, 200, False), ({'data': [], 'paging': {'next': 'secret-url'}}, 200, True), ({}, 502, None), ({'data': None}, 502, None), ({'data': [None]}, 502, None)]:
            with self.subTest(wire=wire):
                self.graph.return_value = True, wire
                response = self.read()
                self.assertEqual(response.status_code, status)
                if status == 200:
                    self.assertEqual(response.data['partial'], partial)
                self.assertNotIn('secret-url', str(response.data))

    def test_provider_status_is_safe_and_never_disconnected(self):
        for status, expected in [(401, 403), (403, 403), (404, 404), (429, 429), (503, 502), (None, 502)]:
            self.graph.return_value = False, {'status_code': status, 'error': 'fixture-secret'}
            response = self.read()
            self.assertEqual(response.status_code, expected)
            self.assertNotIn('connected', response.data)
            self.assertNotIn('fixture-secret', str(response.data))

    def test_ad_account_membership_and_identifier_validation(self):
        self.assertEqual(self.read('campaigns', ad_account_id='act_20').status_code, 403)
        self.assertEqual(self.read('campaigns', ad_account_id='../me').status_code, 400)
        self.graph.return_value = True, {'data': [], 'paging': {'next': 'next'}}
        self.assertEqual(self.read('campaigns', ad_account_id='act_20').status_code, 503)

    def test_campaign_parent_scope_and_ads_scope(self):
        accounts = True, {'data': [{'id': 'act_10'}]}
        self.graph.side_effect = [accounts, (True, {'id': '11', 'account_id': '20'})]
        self.assertEqual(self.read('ads', ad_account_id='act_10', campaign_id='11').status_code, 403)
        self.graph.side_effect = [accounts, (True, {'id': '11', 'account_id': '10'}), (True, {'data': [{'id': '111', 'name': 'Ad', 'campaign_id': '22'}]})]
        self.assertEqual(self.read('ads', ad_account_id='act_10', campaign_id='11').status_code, 502)
        self.graph.side_effect = [accounts, (True, {'id': '11', 'account_id': '10'}), (True, {'data': [{'id': '111', 'name': 'Ad', 'campaign_id': '11', 'creative': {'call_to_action_type': 'WHATSAPP_MESSAGE'}}]})]
        response = self.read('ads', ad_account_id='act_10', campaign_id='11')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['ads'][0]['is_ctwa'])
        self.assertEqual(response.data['ad_account_id'], 'act_10')

    def test_campaign_collection_must_belong_to_account(self):
        self.graph.side_effect = [(True, {'data': [{'id': 'act_10'}]}), (True, {'data': [{'id': '11', 'account_id': '20'}]})]
        self.assertEqual(self.read('campaigns', ad_account_id='act_10').status_code, 502)


class MetaGraphSafetyTests(TestCase):
    @patch('social_stats.views.meta_ads.requests.request')
    def test_transport_exception_never_logs_secret_url(self, request):
        import requests
        from social_stats.views.meta_ads import _graph
        request.side_effect = requests.RequestException('access_token=fixture-secret')
        with self.assertLogs('social_stats.views.meta_ads', level='WARNING') as logs:
            ok, body = _graph('GET', '/me/adaccounts', token='fixture-secret')
        self.assertFalse(ok)
        self.assertNotIn('fixture-secret', str(body) + str(logs.output))

    @patch('social_stats.views.meta_ads.requests.request')
    def test_malformed_or_provider_error_never_passes_as_success(self, request):
        from social_stats.views.meta_ads import _graph
        response = request.return_value
        response.status_code = 200
        response.content = b'fixture'
        for body in ([], {'error': {'message': 'fixture-secret'}}):
            response.json.return_value = body
            ok, result = _graph('GET', '/me/adaccounts', token='fixture-secret')
            self.assertFalse(ok)
            self.assertNotIn('fixture-secret', str(result))
