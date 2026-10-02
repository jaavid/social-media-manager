from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from social_stats.egress_views import egress_connectivity


class EgressConnectivityViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def _user(self, role):
        return SimpleNamespace(
            pk={'superadmin': 101, 'staff': 102, 'client': 103}[role],
            is_authenticated=True,
            is_superuser=role == 'superadmin',
            is_staff=role in ('superadmin', 'staff'),
            profile=SimpleNamespace(role=role),
        )

    @patch('social_stats.egress_views.probe_gateway_health')
    @patch('social_stats.egress_views.probe_all_services')
    def test_staff_can_run_all_connectivity_checks(self, probe_all, probe_gateway):
        probe_all.return_value = [{'id': 'telegram', 'direct': {'reachable': True}}]
        probe_gateway.return_value = {'reachable': True, 'version': '2.0'}
        request = self.factory.get('/api/egress/connectivity/')
        force_authenticate(request, user=self._user('staff'))

        response = egress_connectivity(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['services'][0]['id'], 'telegram')
        probe_all.assert_called_once_with()
        probe_gateway.assert_called_once_with()

    @patch('social_stats.egress_views.probe_service')
    @patch('social_stats.egress_views.probe_gateway_health')
    def test_operator_can_probe_one_service(self, probe_gateway, probe_service):
        probe_service.return_value = {'id': 'bale', 'direct': {'reachable': True}}
        probe_gateway.return_value = {'reachable': True}
        request = self.factory.get('/api/egress/connectivity/?service=bale')
        force_authenticate(request, user=self._user('superadmin'))

        response = egress_connectivity(request)

        self.assertEqual(response.status_code, 200)
        probe_service.assert_called_once_with('bale')
        self.assertEqual(response.data['services'][0]['id'], 'bale')

    @patch('social_stats.egress_views.probe_gateway_health')
    @patch('social_stats.egress_views.probe_all_services')
    @patch('social_stats.egress_views.oauth_readiness_report')
    def test_operator_can_read_oauth_readiness_without_network_probe(
        self, readiness, probe_all, probe_gateway
    ):
        readiness.return_value = {
            'youtube': {
                'configured': False,
                'missing': ['GOOGLE_CLIENT_SECRET'],
                'redirect_uri': 'https://example.test/api/oauth/google/callback/',
                'scopes': ['scope-a'],
                'required_apis': ['YouTube Data API v3'],
            }
        }
        request = self.factory.get('/api/egress/connectivity/?mode=oauth')
        force_authenticate(request, user=self._user('staff'))

        response = egress_connectivity(request)

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['oauth']['youtube']['configured'])
        self.assertEqual(response.data['oauth']['youtube']['missing'], ['GOOGLE_CLIENT_SECRET'])
        self.assertNotIn('secret', response.data['oauth']['youtube'])
        readiness.assert_called_once_with()
        probe_all.assert_not_called()
        probe_gateway.assert_not_called()

    @patch('social_stats.egress_views.probe_all_services')
    def test_client_role_cannot_access_infrastructure_diagnostics(self, probe_all):
        request = self.factory.get('/api/egress/connectivity/')
        force_authenticate(request, user=self._user('client'))

        response = egress_connectivity(request)

        self.assertEqual(response.status_code, 403)
        probe_all.assert_not_called()

    def test_unknown_service_is_rejected_before_network_probe(self):
        request = self.factory.get('/api/egress/connectivity/?service=unknown-provider')
        force_authenticate(request, user=self._user('staff'))

        response = egress_connectivity(request)

        self.assertEqual(response.status_code, 400)

    def test_unknown_diagnostics_mode_is_rejected(self):
        request = self.factory.get('/api/egress/connectivity/?mode=unknown')
        force_authenticate(request, user=self._user('staff'))

        response = egress_connectivity(request)

        self.assertEqual(response.status_code, 400)
