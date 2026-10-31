"""The caption and hashtag tools obey the global AI provider and tenant scope."""
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from social_stats.models import CaptionRequest, Client, HashtagSet, UserProfile
from social_stats.ai.rate_limiter import RateLimited


class LegacyContentProviderTests(TestCase):
    def setUp(self):
        self.client_workspace = Client.objects.create(
            name='School', company='School', email='school@example.test',
        )
        self.other = Client.objects.create(
            name='Other', company='Other', email='other@example.test',
        )
        self.user = User.objects.create_user('writer', password='test')
        UserProfile.objects.create(
            user=self.user, role='client', client=self.client_workspace,
        )
        self.api = APIClient()
        self.api.force_authenticate(user=self.user)
        self.caption_payload = {
            'client_id': self.client_workspace.pk, 'topic': 'تبریک یلدا',
            'tone': 'professional', 'post_type': 'promotion',
            'platforms': ['instagram'], 'keywords': '', 'call_to_action': '',
        }
        self.hashtag_payload = {
            'client_id': self.client_workspace.pk, 'niche': 'آموزش',
            'platform': 'instagram', 'post_topic': 'ثبت نام مدرسه',
            'post_type': 'general',
        }

    @patch('social_stats.views.caption.AIClient')
    def test_caption_does_not_require_anthropic_key_when_gemini_selected(self, ai_class):
        ai_class.return_value.complete.return_value = (
            '{"instagram": "شب یلدا مبارک", "hashtags": {"instagram": ["#یلدا"]}}'
        )
        with override_settings(ANTHROPIC_API_KEY=''):
            response = self.api.post('/api/ai/caption/', self.caption_payload, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['captions']['instagram'], 'شب یلدا مبارک')
        self.assertEqual(CaptionRequest.objects.count(), 1)
        _, kwargs = ai_class.call_args
        self.assertEqual(kwargs['client'], self.client_workspace)
        self.assertEqual(kwargs['feature'], 'caption')
        ai_class.return_value.complete.assert_called_once()
        options = ai_class.return_value.complete.call_args.kwargs
        self.assertTrue(options['fast'])
        self.assertFalse(options['use_cache'])

    @patch('social_stats.views.hashtag.AIClient')
    def test_hashtag_tab_uses_same_provider_abstraction(self, ai_class):
        ai_class.return_value.complete.return_value = (
            '{"strategy": "کلمات متناسب با مدرسه", "groups": {"small": {"tags": []}}}'
        )
        with override_settings(ANTHROPIC_API_KEY=''):
            response = self.api.post('/api/ai/hashtags/', self.hashtag_payload, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(HashtagSet.objects.filter(client=self.client_workspace).exists())
        self.assertEqual(ai_class.call_args.kwargs['feature'], 'hashtags')

    @patch('social_stats.views.caption.AIClient')
    def test_workspace_isolation_prevents_provider_call(self, ai_class):
        payload = {**self.caption_payload, 'client_id': self.other.id}
        response = self.api.post('/api/ai/caption/', payload, format='json')
        self.assertEqual(response.status_code, 403)
        ai_class.assert_not_called()

    @patch('social_stats.views.caption.AIClient')
    def test_invalid_generated_json_never_persists_history(self, ai_class):
        ai_class.return_value.complete.return_value = 'not-json'
        response = self.api.post('/api/ai/caption/', self.caption_payload, format='json')
        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.data['error'], 'ai_invalid_output')
        self.assertFalse(CaptionRequest.objects.exists())

    @patch('social_stats.views.caption.AIClient')
    def test_entitlement_or_rate_limit_denial_is_429(self, ai_class):
        ai_class.return_value.complete.side_effect = RateLimited('usage limit', scope='organization')
        response = self.api.post('/api/ai/caption/', self.caption_payload, format='json')
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.data['error'], 'ai_limit_reached')

    @patch('social_stats.views.hashtag.AIClient')
    def test_hashtag_does_not_leak_between_workspaces(self, ai_class):
        response = self.api.post(
            '/api/ai/hashtags/', {**self.hashtag_payload, 'client_id': self.other.pk},
            format='json',
        )
        self.assertEqual(response.status_code, 403)
        ai_class.assert_not_called()
