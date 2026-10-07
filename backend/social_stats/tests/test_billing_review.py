"""Quota errors preserve chat state and premium authorization boundaries."""
from datetime import date
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from social_stats.entitlements import capability_allowed, month_key, subscription_for
from social_stats.models import AIConversation, Client, SocialAccount, UserProfile
from social_stats.serializers.core import SharedReportSerializer


@override_settings(ANTHROPIC_API_KEY='test-only')
class BillingReviewTests(TestCase):
    def setUp(self):
        """Create an authenticated tenant owner on a bounded plan."""
        self.owner = User.objects.create_user('review-owner')
        self.workspace = Client.objects.create(name='Review', email='review@example.test', owner_user=self.owner)
        UserProfile.objects.create(user=self.owner, role='client', client=self.workspace)
        self.sub = subscription_for(self.workspace.organization)
        self.sub.plan = 'org-free'
        self.sub.save()
        self.api = APIClient()
        self.api.force_authenticate(self.owner)

    def call_chat(self, sdk, **payload):
        """Exercise the HTTP endpoint with provider and budget preflight mocked."""
        with patch('social_stats.ai.chat_views._anthropic_or_none', return_value=(Mock(return_value=sdk), None)), \
             patch('social_stats.ai.chat_views.rate_limiter.check'):
            return self.api.post('/api/ai/v2/chat/', {'message': 'Updated title', **payload}, format='json')

    def test_quota_denial_returns_429_and_finalizes_existing_conversation(self):
        """An exhausted quota is distinct from a missing capability."""
        convo = AIConversation.objects.create(client=self.workspace, user=self.owner, title='New chat')
        before = convo.updated_at
        self.sub.usage_counters = {'ai': {month_key(): 50}}
        self.sub.save()
        sdk = Mock()
        response = self.call_chat(sdk, conversation_id=convo.pk)
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.data['limit'], '50')
        self.assertEqual(response.data['used'], '50')
        sdk.messages.create.assert_not_called()
        convo.refresh_from_db()
        self.assertEqual(convo.title, 'Updated title')
        self.assertGreater(convo.updated_at, before)

    def test_capability_denial_remains_403_and_finalizes_conversation(self):
        """Suspension must remain an authorization-style capability denial."""
        convo = AIConversation.objects.create(client=self.workspace, user=self.owner, title='New chat')
        self.sub.status = 'paused'
        self.sub.save()
        sdk = Mock()
        response = self.call_chat(sdk, conversation_id=convo.pk)
        self.assertEqual(response.status_code, 403)
        sdk.messages.create.assert_not_called()
        convo.refresh_from_db()
        self.assertEqual(convo.title, 'Updated title')

    def test_summary_quota_denial_preserves_executed_and_pending_tools(self):
        """Tools awaiting confirmation remain pending if summary quota runs out."""
        self.sub.usage_counters = {'ai': {month_key(): 49}}
        self.sub.save()
        convo = AIConversation.objects.create(client=self.workspace, user=self.owner, title='New chat')
        sdk = Mock()
        sdk.messages.create.return_value = SimpleNamespace(
            id='turn', usage=SimpleNamespace(input_tokens=1, output_tokens=1),
            content=[{'type': 'tool_use', 'id': 'read', 'name': 'get_lead', 'input': {}},
                     {'type': 'tool_use', 'id': 'write', 'name': 'update_lead_status', 'input': {}}],
        )
        with patch('social_stats.ai.chat_views.execute_tool', side_effect=[
            {'ok': True, 'data': {'id': 1}},
            {'ok': True, 'confirmation_required': True, 'summary': 'Confirm update'},
        ]):
            response = self.call_chat(sdk, conversation_id=convo.pk)
        self.assertEqual(response.status_code, 429)
        self.assertEqual(sdk.messages.create.call_count, 1)
        self.assertTrue(response.data['tool_runs'][0]['ok'])
        self.assertFalse(response.data['tool_runs'][1]['ok'])
        self.assertTrue(response.data['tool_runs'][1]['confirmation_required'])
        self.assertEqual(response.data['pending_confirmations'][0]['tool_use_id'], 'write')
        convo.refresh_from_db()
        self.assertEqual(convo.title, 'Updated title')
        self.assertTrue(convo.messages.filter(role='assistant').exists())

    def test_deleted_workspace_stops_automation(self):
        """A stale task context must not crash after workspace deletion."""
        from social_stats.automation_engine import evaluate_automation_rules
        with patch('social_stats.automation_engine._build_context', return_value={'content': 'old'}):
            self.assertEqual(evaluate_automation_rules('new_dm', 1, 999999), 0)

    def test_report_entitlement_lookup_is_reused_with_account_permissions(self):
        """Each validation uses one entitlement lookup without bypassing accounts."""
        self.sub.plan = 'org-pro'
        self.sub.save()
        account = SocialAccount.objects.create(client=self.workspace, platform='youtube', external_id='one')
        request = SimpleNamespace(user=self.owner)
        serializer = SharedReportSerializer(context={'request': request})
        with patch('social_stats.entitlements.capability_allowed', wraps=capability_allowed) as gate:
            result = serializer.validate({'client': self.workspace, 'date_from': date(2026, 10, 1),
                                          'date_until': date(2026, 10, 6), 'platforms': [],
                                          'social_account_ids': [account.pk]})
        self.assertEqual(result['social_account_ids'], [account.pk])
        gate.assert_called_once()
