"""
AI Assistant tests. Anthropic SDK is mocked at the helper level so we never
hit the network. Focus is on:
  - tenant guards (client role can't reach another tenant's endpoint)
  - input validation
  - response shape (variants, hashtags, suggestions, translations, calendar)
  - brand voice persists, used by get_brand_voice
  - best-time-to-post uses historical PostMetric data + falls back to defaults
"""
from datetime import datetime, timedelta, timezone as dt_tz
from types import SimpleNamespace
from unittest.mock import patch, MagicMock

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from social_stats.models import (
    Client, UserProfile, PostMetric, BrandVoiceProfile,
    Conversation, Message,
)


def _claude_returning(text: str):
    """Build a fake Anthropic.messages.create result whose .content[0].text == text."""
    msg = MagicMock()
    msg.content = [SimpleNamespace(text=text)]
    return msg


def _client_factory(label='ai'):
    return Client.objects.create(name=label, company=label.title(),
                                  email=f'{label}-{id(object())}@x.test')


def _user_for(client_obj, role='client'):
    import uuid
    u = User.objects.create_user(
        username=f'u-{uuid.uuid4().hex[:12]}', email='u@x.test',
        password='x', is_active=True,
    )
    profile = UserProfile.objects.create(user=u, role=role,
                                          client=client_obj if role == 'client' else None)
    if role == 'staff':
        profile.assigned_clients.add(client_obj)
    return u


def _api_for(user):
    api = APIClient()
    api.force_authenticate(user=user)
    return api


@override_settings(ANTHROPIC_API_KEY='test-key')
class ComposePostTests(TestCase):
    def setUp(self):
        self.client_obj = _client_factory()
        self.user = _user_for(self.client_obj)
        self.api = _api_for(self.user)
        cache.clear()

    @patch('social_stats.views.ai._complete_text')
    def test_compose_returns_variants_per_platform(self, mock_get_claude):
        client = MagicMock()
        client.messages.create.return_value = _claude_returning(
            '{"variants": {"facebook": ["v1", "v2", "v3"], "instagram": ["a", "b", "c"]}}'
        )
        mock_get_claude.return_value = client.messages.create.return_value.content[0].text

        res = self.api.post('/api/ai/compose-post/', {
            'topic': 'launch announcement', 'tone': 'friendly',
            'platforms': ['facebook', 'instagram'],
        }, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.data['variants']['facebook'], ['v1', 'v2', 'v3'])
        self.assertEqual(res.data['variants']['instagram'], ['a', 'b', 'c'])

    @patch('social_stats.views.ai._complete_text')
    def test_compose_caches_repeat_call(self, mock_get_claude):
        client = MagicMock()
        client.messages.create.return_value = _claude_returning(
            '{"variants": {"facebook": ["x", "y", "z"]}}'
        )
        mock_get_claude.return_value = client.messages.create.return_value.content[0].text

        body = {'topic': 'x', 'tone': 'friendly', 'platforms': ['facebook']}
        first = self.api.post('/api/ai/compose-post/', body, format='json')
        second = self.api.post('/api/ai/compose-post/', body, format='json')
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertTrue(second.data['cached'])
        self.assertEqual(mock_get_claude.call_count, 1)  # only first provider completion

    def test_compose_missing_topic_400(self):
        res = self.api.post('/api/ai/compose-post/',
                             {'platforms': ['facebook']}, format='json')
        self.assertEqual(res.status_code, 400)


@override_settings(ANTHROPIC_API_KEY='test-key')
class SuggestHashtagsTests(TestCase):
    def setUp(self):
        self.client_obj = _client_factory('ht')
        self.user = _user_for(self.client_obj)
        self.api = _api_for(self.user)
        cache.clear()

    @patch('social_stats.views.ai._complete_text')
    def test_normalizes_and_caps_hashtags(self, mock_get_claude):
        client = MagicMock()
        client.messages.create.return_value = _claude_returning(
            '{"hashtags": ["startup", "#startup", "marketing", "  growth  ", "GROWTH"]}'
        )
        mock_get_claude.return_value = client.messages.create.return_value.content[0].text

        res = self.api.post('/api/ai/suggest-hashtags/', {
            'content': 'we just launched our marketing tool',
            'platform': 'instagram', 'count': 3,
        }, format='json')
        self.assertEqual(res.status_code, 200)
        # All start with #, deduped (case-insensitive), capped at count=3
        self.assertEqual(res.data['hashtags'], ['#startup', '#marketing', '#growth'])

    def test_content_required(self):
        res = self.api.post('/api/ai/suggest-hashtags/',
                             {'platform': 'instagram'}, format='json')
        self.assertEqual(res.status_code, 400)


class BestTimeToPostTests(TestCase):
    def setUp(self):
        self.client_obj = _client_factory('bt')
        self.user = _user_for(self.client_obj)
        self.api = _api_for(self.user)
        cache.clear()

    def test_falls_back_to_defaults_when_no_history(self):
        res = self.api.post('/api/ai/best-time-to-post/',
                             {'platform': 'instagram'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['source'], 'platform_defaults')
        self.assertEqual(len(res.data['slots']), 3)
        for s in res.data['slots']:
            self.assertIn('label', s)
            self.assertIn('hour', s)
            self.assertIn('day_of_week', s)

    def test_uses_historical_buckets(self):
        # Seed 4 posts: 3 on Wed-12pm with high engagement, 1 on Mon-9am.
        # Dates are computed relative to now so they always fall inside the
        # endpoint's rolling 90-day window (fixed dates rot out of it).
        now = timezone.now()
        days_since_wed = (now.weekday() - 2) % 7 or 7   # most recent past Wednesday
        wed = (now - timedelta(days=days_since_wed + 7))  # ≥1 week back, well inside 90d
        wed_12 = wed.replace(hour=12, minute=0, second=0, microsecond=0)
        mon_9  = (wed_12 - timedelta(days=2)).replace(hour=9)   # the Monday before
        for i in range(3):
            PostMetric.objects.create(
                client=self.client_obj, platform='facebook', post_id=f'p{i}',
                published_at=wed_12, reach=1000, likes=200, comments=50, shares=20,
            )
        PostMetric.objects.create(
            client=self.client_obj, platform='facebook', post_id='lo1',
            published_at=mon_9, reach=10, likes=1, comments=0, shares=0,
        )
        # We need >=2 samples per bucket; mon_9 has only 1, so it should be excluded.
        # Add a second mon_9 sample so it qualifies but ranks below wed_12.
        PostMetric.objects.create(
            client=self.client_obj, platform='facebook', post_id='lo2',
            published_at=mon_9, reach=20, likes=2, comments=1, shares=0,
        )
        res = self.api.post('/api/ai/best-time-to-post/',
                             {'platform': 'facebook'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['source'], 'historical')
        # Top slot should be Wed (day_of_week=2) at hour 12
        top = res.data['slots'][0]
        self.assertEqual(top['day_of_week'], 2)
        self.assertEqual(top['hour'], 12)
        self.assertGreater(top['score'], 0)


@override_settings(ANTHROPIC_API_KEY='test-key')
class SuggestReplyTests(TestCase):
    def setUp(self):
        self.client_obj = _client_factory('rp')
        self.user = _user_for(self.client_obj)
        self.api = _api_for(self.user)
        self.conv = Conversation.objects.create(
            client=self.client_obj, platform='facebook',
            platform_thread_id='post1', type='comment',
        )
        self.in_msg = Message.objects.create(
            conversation=self.conv, direction='inbound',
            author_name='Alice', content='Loved your post!',
            sentiment='positive', sent_at=timezone.now(),
        )
        cache.clear()

    @patch('social_stats.views.ai._complete_text')
    def test_returns_three_suggestions_and_persists_first(self, mock_get_claude):
        c = MagicMock()
        c.messages.create.return_value = _claude_returning(
            '{"suggestions": ["Thanks!", "Glad you liked it 🙌", "Means a lot."]}'
        )
        mock_get_claude.return_value = c.messages.create.return_value.content[0].text

        res = self.api.post('/api/ai/suggest-reply/',
                             {'message_id': self.in_msg.id}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(len(res.data['suggestions']), 3)

        self.in_msg.refresh_from_db()
        self.assertEqual(self.in_msg.ai_suggested_reply, 'Thanks!')

    def test_tenant_isolation(self):
        # Different client + user; that user shouldn't be able to peek at our msg
        other = _client_factory('other')
        other_user = _user_for(other)
        other_api = _api_for(other_user)
        res = other_api.post('/api/ai/suggest-reply/',
                              {'message_id': self.in_msg.id}, format='json')
        self.assertEqual(res.status_code, 403)


@override_settings(ANTHROPIC_API_KEY='test-key')
class RewriteTranslateTests(TestCase):
    def setUp(self):
        self.client_obj = _client_factory('rw')
        self.user = _user_for(self.client_obj)
        self.api = _api_for(self.user)
        cache.clear()

    @patch('social_stats.views.ai._complete_text')
    def test_rewrite_returns_text(self, mock_get_claude):
        c = MagicMock()
        c.messages.create.return_value = _claude_returning('Shorter version here.')
        mock_get_claude.return_value = c.messages.create.return_value.content[0].text

        res = self.api.post('/api/ai/rewrite/', {
            'text': 'A long-winded original message that should be shortened.',
            'instruction': 'shorter',
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['text'], 'Shorter version here.')

    @patch('social_stats.views.ai._complete_text')
    def test_translate_returns_text(self, mock_get_claude):
        c = MagicMock()
        c.messages.create.return_value = _claude_returning('Hola, mundo')
        mock_get_claude.return_value = c.messages.create.return_value.content[0].text

        res = self.api.post('/api/ai/translate/', {
            'text': 'Hello, world',
            'target_language': 'Spanish',
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['text'], 'Hola, mundo')

    def test_translate_validates_inputs(self):
        res = self.api.post('/api/ai/translate/',
                             {'text': 'Hi'}, format='json')
        self.assertEqual(res.status_code, 400)


@override_settings(ANTHROPIC_API_KEY='test-key')
class BrandVoiceTests(TestCase):
    def setUp(self):
        self.client_obj = _client_factory('bv')
        self.user = _user_for(self.client_obj)
        self.api = _api_for(self.user)
        cache.clear()

    @patch('social_stats.views.ai._complete_text')
    def test_train_persists_profile(self, mock_get_claude):
        c = MagicMock()
        c.messages.create.return_value = _claude_returning(
            '{"voice_summary": "Friendly, expert, concise.", '
            ' "tone_descriptors": ["friendly", "expert", "concise"], '
            ' "style_rules": ["use second person", "avoid jargon"], '
            ' "forbidden_words": ["disrupt", "synergize"]}'
        )
        mock_get_claude.return_value = c.messages.create.return_value.content[0].text

        res = self.api.post('/api/ai/train-brand-voice/', {
            'sample_posts': ['Post 1 here', 'Post 2 here', 'Post 3 here'],
        }, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(res.data['tone_descriptors'], ['friendly', 'expert', 'concise'])

        bv = BrandVoiceProfile.objects.get(client=self.client_obj)
        self.assertEqual(bv.voice_summary, 'Friendly, expert, concise.')
        self.assertEqual(bv.tone_descriptors, ['friendly', 'expert', 'concise'])
        self.assertEqual(bv.forbidden_words, ['disrupt', 'synergize'])
        self.assertEqual(bv.sample_posts, ['Post 1 here', 'Post 2 here', 'Post 3 here'])

    def test_train_requires_three_samples(self):
        res = self.api.post('/api/ai/train-brand-voice/',
                             {'sample_posts': ['just one']}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_get_brand_voice_returns_empty_when_untrained(self):
        res = self.api.get('/api/ai/brand-voice/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['voice_summary'], '')
        self.assertEqual(res.data['tone_descriptors'], [])

    def test_get_brand_voice_returns_saved(self):
        BrandVoiceProfile.objects.create(
            client=self.client_obj,
            voice_summary='ok', tone_descriptors=['warm'],
            sample_posts=['a', 'b', 'c'],
        )
        res = self.api.get('/api/ai/brand-voice/')
        self.assertEqual(res.data['voice_summary'], 'ok')
        self.assertEqual(res.data['sample_count'], 3)


class AIDownTests(TestCase):
    """When ANTHROPIC_API_KEY is unset, every AI endpoint should return 503."""
    def setUp(self):
        self.client_obj = _client_factory('down')
        self.user = _user_for(self.client_obj)
        self.api = _api_for(self.user)
        cache.clear()

    @override_settings(ANTHROPIC_API_KEY='')
    def test_compose_503(self):
        res = self.api.post('/api/ai/compose-post/', {
            'topic': 'x', 'platforms': ['facebook'],
        }, format='json')
        self.assertEqual(res.status_code, 503)


@override_settings(ANTHROPIC_API_KEY='')
class LegacyProviderSelectionTests(TestCase):
    """Endpoints consume the configured provider, without any per-view Anthropic key."""

    def setUp(self):
        from social_stats.models.ai import GeminiModel, GeminiConfiguration
        self.workspace = _client_factory('gemini-legacy')
        self.user = _user_for(self.workspace)
        self.api = _api_for(self.user)
        self.model = GeminiModel.objects.create(model_id='gemini-2.5-flash', available=True)
        # Singleton record exists from a data migration; modify it instead.
        config = GeminiConfiguration.objects.get(pk=1)
        config.provider = 'gemini'
        config.default_model = self.model
        config.fast_model = self.model
        config.deep_model = self.model
        config.save()
        cache.clear()

    @patch('social_stats.views.ai.AIClient')
    @patch('social_stats.views.ai.get_claude')
    def test_all_text_flows_use_selected_provider(self, old_claude, ai_client):
        fixtures = [
            ('compose-post', {'topic': 'Launch', 'platforms': ['instagram']},
             '{"variants": {"instagram": ["One", "Two", "Three"]}}', 'variants'),
            ('suggest-hashtags', {'content': 'Launch', 'platform': 'instagram'},
             '{"hashtags": ["#launch"]}', 'hashtags'),
            ('rewrite', {'text': 'Long text'}, 'Short text', 'text'),
            ('translate', {'text': 'Hello', 'target_language': 'Persian'}, 'سلام', 'text'),
            ('content-calendar', {'weeks': 1, 'count_per_week': 1},
             '{"calendar": [{"week": 1, "day": "Mon"}]}', 'calendar'),
            ('train-brand-voice', {'sample_posts': ['One', 'Two', 'Three']},
             '{"voice_summary": "Warm", "tone_descriptors": ["warm"], "style_rules": [], "forbidden_words": []}', 'voice_summary'),
        ]
        for endpoint, payload, response, key in fixtures:
            with self.subTest(endpoint=endpoint):
                ai_client.return_value.complete.return_value = response
                result = self.api.post(f'/api/ai/{endpoint}/', payload, format='json')
                self.assertEqual(result.status_code, 200, result.data)
                self.assertIn(key, result.data)
                self.assertEqual(ai_client.call_args.kwargs['client'], self.workspace)
                self.assertEqual(ai_client.call_args.kwargs['user'], self.user)
                self.assertFalse(ai_client.return_value.complete.call_args.kwargs['use_cache'])
        old_claude.assert_not_called()

    @patch('social_stats.views.ai.AIClient')
    def test_gateway_failure_never_exposes_secret_or_falls_back(self, ai_client):
        from social_stats.ai.gemini import GeminiGatewayError
        ai_client.return_value.complete.side_effect = GeminiGatewayError('access token secret.example')
        result = self.api.post('/api/ai/compose-post/',
                               {'topic': 'Launch', 'platforms': ['instagram']}, format='json')
        self.assertEqual(result.status_code, 503)
        self.assertNotIn('secret.example', str(result.data))

    @patch('social_stats.views.ai.get_claude')
    def test_image_url_vision_explicitly_unsupported_with_gemini(self, old_claude):
        result = self.api.post('/api/ai/generate-image-caption/',
                               {'image_url': 'https://example.test/image.jpg'}, format='json')
        self.assertEqual(result.status_code, 501)
        self.assertEqual(result.data['error'], 'image_caption_provider_unsupported')
        old_claude.assert_not_called()

    @patch('social_stats.views.ai.AIClient')
    def test_cache_cannot_replay_a_response_after_model_switch(self, ai_client):
        from social_stats.models.ai import GeminiModel, GeminiConfiguration
        ai_client.return_value.complete.return_value = 'first'
        payload = {'text': 'Hello', 'target_language': 'Persian'}
        one = self.api.post('/api/ai/translate/', payload, format='json')
        self.assertFalse(one.data['cached'])
        second_model = GeminiModel.objects.create(model_id='gemini-2.5-pro', available=True)
        cfg = GeminiConfiguration.objects.get(pk=1)
        cfg.fast_model = second_model
        cfg.save()
        ai_client.return_value.complete.return_value = 'second'
        two = self.api.post('/api/ai/translate/', payload, format='json')
        self.assertFalse(two.data['cached'])
        self.assertEqual(two.data['text'], 'second')


@override_settings(ANTHROPIC_API_KEY='test-key')
class LegacyVisionBoundaryTests(TestCase):
    """Legacy Claude URL vision: cache and errors never cross a tenant boundary."""

    def setUp(self):
        self.workspace = _client_factory('vision-one')
        self.other_workspace = _client_factory('vision-two')
        self.api = _api_for(_user_for(self.workspace))
        self.other_api = _api_for(_user_for(self.other_workspace))
        cache.clear()

    @patch('social_stats.views.ai.get_ai_configuration', return_value=None)
    @patch('social_stats.views.ai.require_capacity')
    @patch('social_stats.entitlements.reserve_ai')
    @patch('social_stats.views.ai.get_claude')
    def test_same_image_different_tenants_never_share_cached_caption(
        self, get_claude, reserve_ai, capacity, config,
    ):
        sdk = MagicMock()
        sdk.messages.create.side_effect = [
            _claude_returning('Brand A caption'),
            _claude_returning('Brand B caption'),
        ]
        get_claude.return_value = sdk
        payload = {'image_url': 'https://cdn.example.com/shared.jpg'}
        first = self.api.post('/api/ai/generate-image-caption/', payload, format='json')
        repeat = self.api.post('/api/ai/generate-image-caption/', payload, format='json')
        second = self.other_api.post('/api/ai/generate-image-caption/', payload, format='json')
        self.assertEqual(first.status_code, 200, first.data)
        self.assertEqual(repeat.status_code, 200, repeat.data)
        self.assertTrue(repeat.data['cached'])
        self.assertEqual(second.status_code, 200, second.data)
        self.assertFalse(second.data['cached'])
        self.assertEqual(second.data['caption'], 'Brand B caption')
        self.assertEqual(sdk.messages.create.call_count, 2)

    @patch('social_stats.views.ai.get_ai_configuration', return_value=None)
    @patch('social_stats.views.ai.get_claude')
    def test_rejects_non_public_or_credential_bearing_image_urls(self, get_claude, config):
        for url in [
            'http://example.com/image.png',
            'https://localhost/image.png',
            'https://127.0.0.1/private.jpg',
            'https://192.168.1.12/image.png',
            'https://user:pass@example.com/image.jpg',
            'file:///etc/passwd',
        ]:
            with self.subTest(url=url):
                result = self.api.post(
                    '/api/ai/generate-image-caption/',
                    {'image_url': url}, format='json',
                )
                self.assertEqual(result.status_code, 400, result.data)
        get_claude.assert_not_called()

    @patch('social_stats.views.ai.get_ai_configuration', return_value=None)
    @patch('social_stats.views.ai.require_capacity')
    @patch('social_stats.entitlements.reserve_ai')
    @patch('social_stats.views.ai.get_claude')
    def test_provider_exception_does_not_leak_credentials(
        self, get_claude, reserve_ai, capacity, config,
    ):
        get_claude.return_value.messages.create.side_effect = RuntimeError(
            'provider-url=https://gateway.example.test secret=private-token'
        )
        result = self.api.post(
            '/api/ai/generate-image-caption/',
            {'image_url': 'https://cdn.example.com/photo.png'}, format='json',
        )
        self.assertEqual(result.status_code, 502)
        self.assertEqual(result.data, {'error': 'ai_generation_failed'})
        self.assertNotIn('private-token', str(result.data))

    @patch('social_stats.views.ai.get_ai_configuration', return_value=None)
    @patch('social_stats.views.ai.require_capacity')
    @patch('social_stats.entitlements.reserve_ai')
    @patch('social_stats.views.ai.get_claude')
    def test_entitlement_denial_is_not_an_internal_server_error(
        self, get_claude, reserve_ai, capacity, config,
    ):
        from social_stats.entitlements import EntitlementDenied
        capacity.side_effect = EntitlementDenied('ai_generations_per_month')
        result = self.api.post(
            '/api/ai/generate-image-caption/',
            {'image_url': 'https://cdn.example.com/photo.png'}, format='json',
        )
        self.assertEqual(result.status_code, 403)
        get_claude.return_value.messages.create.assert_not_called()

    @override_settings(AI_FAST_MODEL='claude-configured-fast')
    @patch('social_stats.views.ai.get_ai_configuration', return_value=None)
    @patch('social_stats.views.ai.require_capacity')
    @patch('social_stats.entitlements.reserve_ai')
    @patch('social_stats.views.ai.get_claude')
    def test_vision_respects_configured_claude_fast_model(
        self, get_claude, reserve_ai, capacity, config,
    ):
        get_claude.return_value.messages.create.return_value = _claude_returning('Selected model')
        result = self.api.post(
            '/api/ai/generate-image-caption/',
            {'image_url': 'https://cdn.example.com/photo.png'}, format='json',
        )
        self.assertEqual(result.status_code, 200, result.data)
        self.assertEqual(
            get_claude.return_value.messages.create.call_args.kwargs['model'],
            'claude-configured-fast',
        )
