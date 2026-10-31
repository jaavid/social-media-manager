"""No live Google calls: verify Gemini's mandatory gateway and admin/model contracts."""
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.core.cache import cache
from django.urls import reverse

from social_stats.ai.gemini import (
    GeminiGatewayClient, GeminiGatewayError, _content_to_openai,
    list_generation_models, selected_model,
)
from social_stats.models.ai import GeminiConfiguration, GeminiModel


@override_settings(GEMINI_API_KEY="test-only-gemini-key")
class GeminiGatewayTests(TestCase):
    def setUp(self):
        self.settings = GeminiConfiguration.objects.get(pk=1)
        self.model = GeminiModel.objects.create(model_id="gemini-test-flash", available=True)
        self.settings.provider = "gemini"
        self.settings.default_model = self.model
        self.settings.fast_model = self.model
        self.settings.deep_model = self.model
        self.settings.save()

    @patch.dict("os.environ", {"API_GATEWAY_URL": "https://gateway.example.test", "API_GATEWAY_KEY": "gateway-secret"})
    @patch("social_stats.ai.gemini.outbound_request")
    def test_completion_only_through_gateway(self, request):
        response = Mock(status_code=200)
        response.json.return_value = {
            "id": "r1",
            "choices": [{"message": {"content": "سلام"}}],
            "usage": {"prompt_tokens": 7, "completion_tokens": 2},
        }
        request.return_value = response
        obj = GeminiGatewayClient().messages.create(
            model=self.model.model_id, max_tokens=80,
            system="Behave", messages=[{"role": "user", "content": "Hi"}],
        )
        self.assertEqual(obj.content[0].text, "سلام")
        self.assertEqual(obj.usage.input_tokens, 7)
        args, kwargs = request.call_args
        self.assertEqual(args[:3], ("gemini", "POST", "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"))
        self.assertEqual(kwargs["mode"], "gateway")
        self.assertEqual(kwargs["headers"]["Authorization"], "Bearer test-only-gemini-key")
        self.assertEqual(kwargs["json"]["messages"][0]["role"], "system")
        self.assertEqual(selected_model(fast=True), "gemini-test-flash")

    @patch.dict("os.environ", {"API_GATEWAY_URL": "", "API_GATEWAY_KEY": "x"})
    @patch("social_stats.ai.gemini.outbound_request")
    def test_missing_gateway_does_not_fall_back_to_direct(self, request):
        with self.assertRaises(GeminiGatewayError):
            GeminiGatewayClient().messages.create(model="gemini-test-flash", messages=[])
        request.assert_not_called()

    @patch.dict("os.environ", {"API_GATEWAY_URL": "https://gateway.example.test", "API_GATEWAY_KEY": "x"})
    @patch("social_stats.ai.gemini.outbound_request")
    def test_redirect_is_rejected(self, request):
        response = Mock(status_code=302)
        request.return_value = response
        with self.assertRaises(GeminiGatewayError):
            GeminiGatewayClient().messages.create(model="gemini-test-flash", messages=[])
        response.close.assert_called_once()

    @patch.dict("os.environ", {"API_GATEWAY_URL": "https://gateway.example.test", "API_GATEWAY_KEY": "x"})
    @patch("social_stats.ai.gemini.outbound_request")
    def test_pagination_and_catalog(self, request):
        a = Mock(status_code=200)
        a.json.return_value = {"models": [
            {"name": "models/gemini-test-flash", "supportedGenerationMethods": ["generateContent"], "displayName": "Test"},
            {"name": "models/embedding-001", "supportedGenerationMethods": ["embedContent"]},
        ], "nextPageToken": "p2"}
        b = Mock(status_code=200)
        b.json.return_value = {"models": [
            {"name": "models/gemini-other", "supportedGenerationMethods": ["generateContent"]}]}
        request.side_effect = [a, b]
        catalog = list_generation_models()
        self.assertEqual({row["model_id"] for row in catalog}, {"gemini-test-flash", "gemini-other"})
        self.assertEqual(request.call_count, 2)
        for call in request.call_args_list:
            self.assertEqual(call.args[0], "gemini")
            self.assertEqual(call.kwargs["mode"], "gateway")

    def test_tool_translation(self):
        payload = _content_to_openai("user", [
            {"type": "text", "text": "Result"},
            {"type": "tool_result", "tool_use_id": "call_123", "content": "{\"ok\":true}"},
        ])
        self.assertEqual(payload[-1]["role"], "tool")
        self.assertEqual(payload[-1]["tool_call_id"], "call_123")

    def test_inactive_model_rejected(self):
        self.model.available = False
        self.model.save()
        with self.assertRaises(GeminiGatewayError):
            selected_model()


class GeminiAdminTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser("ai-admin", "a@example.com", "test")
        self.client.force_login(self.user)

    @patch("social_stats.admin.integrations.gemini.list_generation_models")
    def test_sync_action_populates_catalog(self, listing):
        listing.return_value = [{"model_id": "gemini-test-flash", "display_name": "Flash",
                                 "description": "", "input_token_limit": 100, "output_token_limit": 50}]
        url = reverse("admin:social_stats_geminiconfiguration_changelist")
        result = self.client.post(url, {"action": "refresh_gemini_models", "_selected_action": ["1"]})
        self.assertEqual(result.status_code, 302)
        self.assertTrue(GeminiModel.objects.filter(model_id="gemini-test-flash", available=True).exists())

    @patch("social_stats.admin.integrations.gemini.list_generation_models", side_effect=GeminiGatewayError("fail"))
    def test_sync_failure_preserves_existing_models(self, _listing):
        model = GeminiModel.objects.create(model_id="gemini-stable", available=True)
        url = reverse("admin:social_stats_geminiconfiguration_changelist")
        self.client.post(url, {"action": "refresh_gemini_models", "_selected_action": ["1"]})
        model.refresh_from_db()
        self.assertTrue(model.available)
