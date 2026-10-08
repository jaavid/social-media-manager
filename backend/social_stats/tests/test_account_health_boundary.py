"""Malformed historical destination metadata cannot become provider readiness."""
from types import SimpleNamespace
from unittest.mock import patch
from django.test import SimpleTestCase
from social_stats.platforms.account_health import connection_health
from social_stats.platforms.registry import get_provider


class AccountHealthBoundaryTests(SimpleTestCase):
    def test_malformed_destination_is_rejected_before_provider_health(self):
        provider = get_provider('facebook')
        for metadata in (None, [], 'bad', {'destination_type': []}, {'destination_type': {}}, {'destination_type': 'unsupported'}):
            account = SimpleNamespace(pk=10, client_id=7, platform='facebook', metadata=metadata, is_active=True)
            credential = SimpleNamespace(social_account=account, client_id=7, platform='facebook', is_active=True, access_token='fixture', is_expired=False)
            with self.subTest(metadata=metadata), patch.object(provider, 'health') as health:
                result = connection_health(provider, credential)
                self.assertFalse(result.ready)
                self.assertEqual(result.state, 'unknown')
                health.assert_not_called()

    def test_wrong_workspace_or_provider_cannot_reach_health(self):
        provider = get_provider('facebook')
        for workspace, platform in ((8, 'facebook'), (7, 'instagram')):
            account = SimpleNamespace(pk=10, client_id=7, platform='facebook', metadata={}, is_active=True)
            credential = SimpleNamespace(social_account=account, client_id=workspace, platform=platform, is_active=True, access_token='fixture', is_expired=False)
            with self.subTest(workspace=workspace, platform=platform), patch.object(provider, 'health') as health:
                self.assertFalse(connection_health(provider, credential).ready)
                health.assert_not_called()
