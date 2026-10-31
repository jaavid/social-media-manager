"""Gemini official-SDK gateway behavior (no real network or provider credentials)."""
import base64
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.urls import reverse

from social_stats.ai.gemini import (
    GeminiGatewayClient, GeminiGatewayError, _native_messages,
    _normalise_response, _sdk_client, list_generation_models, selected_model,
)
from social_stats.models.ai import GeminiConfiguration, GeminiModel


def _response(text="سلام", *, tool=None):
    from google.genai import types
    parts = [types.Part.from_text(text=text)] if text else []
    if tool:
        parts.append(types.Part.from_function_call(name=tool, args={"topic": "launch"}))
    return SimpleNamespace(
        response_id="sdk-result",
        candidates=[SimpleNamespace(content=types.Content(role="model", parts=parts))],
        usage_metadata=SimpleNamespace(prompt_token_count=7, candidates_token_count=2),
    )


@override_settings(GEMINI_API_KEY="test-google-key")
class GeminiGatewayTests(TestCase):
    def setUp(self):
        self.cfg = GeminiConfiguration.objects.get(pk=1)
        self.model = GeminiModel.objects.create(model_id="gemini-test-flash", available=True)
        self.cfg.provider = "gemini"
        self.cfg.default_model = self.model
        self.cfg.fast_model = self.model
        self.cfg.deep_model = self.model
        self.cfg.save()

    @patch.dict("os.environ", {"API_GATEWAY_URL": "https://gateway.example.test",
                                 "API_GATEWAY_KEY": "gateway-secret"})
    @patch("google.genai.Client")
    def test_official_sdk_is_locked_to_cloudflare_base_url(self, make_client):
        _sdk_client()
        self.assertEqual(make_client.call_count, 1)
        kwargs = make_client.call_args.kwargs
        self.assertEqual(kwargs["api_key"], "test-google-key")
        opts = kwargs["http_options"]
        self.assertEqual(opts.base_url, "https://gateway.example.test/gemini")
        self.assertEqual(opts.api_version, "v1beta")
        self.assertEqual(opts.headers["X-API-Gateway-Key"], "gateway-secret")
        self.assertFalse(opts.client_args["trust_env"])
        self.assertFalse(opts.client_args["follow_redirects"])

    @patch.dict("os.environ", {"API_GATEWAY_URL": "", "API_GATEWAY_KEY": "gateway-secret"})
    @patch("google.genai.Client")
    def test_missing_gateway_fails_closed(self, client):
        with self.assertRaises(GeminiGatewayError):
            _sdk_client()
        client.assert_not_called()

    @patch.dict("os.environ", {"API_GATEWAY_URL": "https://gateway.example.test",
                                 "API_GATEWAY_KEY": ""})
    @patch("google.genai.Client")
    def test_missing_gateway_auth_fails_closed(self, client):
        with self.assertRaises(GeminiGatewayError):
            _sdk_client()
        client.assert_not_called()

    @patch("social_stats.ai.gemini._sdk_client")
    def test_completion_uses_native_generate_content(self, factory):
        sdk = MagicMock()
        factory.return_value.__enter__.return_value = sdk
        sdk.models.generate_content.return_value = _response()
        result = GeminiGatewayClient().messages.create(
            model="gemini-test-flash", max_tokens=64,
            messages=[{"role": "user", "content": "Hello"}],
            system="Say hello.",
        )
        self.assertEqual(result.content[0].text, "سلام")
        self.assertEqual(result.usage.input_tokens, 7)
        sdk.models.generate_content.assert_called_once()
        args = sdk.models.generate_content.call_args.kwargs
        self.assertEqual(args["model"], "gemini-test-flash")
        self.assertEqual(args["config"].system_instruction, "Say hello.")
        self.assertEqual(args["config"].max_output_tokens, 64)
        self.assertEqual(args["contents"][0].role, "user")
        self.assertEqual(selected_model(fast=True), "gemini-test-flash")

    @patch("social_stats.ai.gemini._sdk_client")
    def test_sdk_models_list_filters_and_iterates(self, factory):
        sdk = MagicMock()
        factory.return_value.__enter__.return_value = sdk
        sdk.models.list.return_value = iter([
            SimpleNamespace(name="models/gemini-test-flash",
                            display_name="Flash", description="Text",
                            supported_actions=["generateContent"],
                            input_token_limit=100, output_token_limit=50),
            SimpleNamespace(name="models/embedding-001",
                            supported_actions=["embedContent"]),
            SimpleNamespace(name="models/gemini-next",
                            display_name="Next", description="New",
                            supported_actions=["generateContent"],
                            input_token_limit=500, output_token_limit=250),
        ])
        entries = list_generation_models()
        self.assertEqual({x["model_id"] for x in entries},
                         {"gemini-test-flash", "gemini-next"})
        sdk.models.list.assert_called_once()
        self.assertEqual(sdk.models.list.call_args.kwargs["config"]["page_size"], 1000)

    def test_agentic_function_call_round_trip(self):
        original = _response(text="", tool="search_posts")
        normalized = _normalise_response(original)
        call = normalized.content[0]
        self.assertEqual(call.type, "tool_use")
        self.assertEqual(call.name, "search_posts")
        history = _native_messages([
            {"role": "user", "content": "Find posts"},
            {"role": "assistant", "content": [{
                "type": "tool_use", "id": call.id, "name": call.name, "input": call.input,
            }]},
            {"role": "user", "content": [{
                "type": "tool_result", "tool_use_id": call.id, "content": "2 posts",
            }]},
        ])
        self.assertEqual(history[1].role, "model")
        self.assertEqual(history[1].parts[0].function_call.name, "search_posts")
        self.assertEqual(history[2].parts[0].function_response.name, "search_posts")

    def test_vision_block_uses_native_inline_data(self):
        payload = _native_messages([{"role": "user", "content": [
            {"type": "image", "source": {"type": "base64", "media_type": "image/png",
                                         "data": base64.b64encode(b"PNG").decode()}},
            {"type": "text", "text": "Describe this"},
        ]}])
        self.assertEqual(payload[0].parts[0].inline_data.mime_type, "image/png")
        self.assertEqual(payload[0].parts[0].inline_data.data, b"PNG")

    @patch("social_stats.ai.gemini._sdk_client")
    def test_sdk_stream_is_exposed_to_existing_ai_client(self, factory):
        sdk = MagicMock()
        factory.return_value.__enter__.return_value = sdk
        sdk.models.generate_content_stream.return_value = iter([
            _response("a"), _response("b"),
        ])
        with GeminiGatewayClient().messages.stream(
            model="gemini-test-flash", messages=[{"role": "user", "content": "Hi"}]
        ) as stream:
            self.assertEqual("".join(stream.text_stream), "ab")
            self.assertEqual(stream.get_final_message().usage.input_tokens, 7)
        sdk.models.generate_content_stream.assert_called_once()

    def test_unavailable_model_is_rejected(self):
        self.model.available = False
        self.model.save()
        with self.assertRaises(GeminiGatewayError):
            selected_model()


class GeminiAdminTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser("ai-admin", "a@example.com", "test")
        self.client.force_login(self.user)

    @patch("social_stats.admin.integrations.gemini.list_generation_models")
    def test_catalog_action_updates_records(self, listing):
        listing.return_value = [{
            "model_id": "gemini-test-flash", "display_name": "Flash",
            "description": "", "input_token_limit": 100, "output_token_limit": 50,
        }]
        response = self.client.post(
            reverse("admin:social_stats_geminiconfiguration_changelist"),
            {"action": "refresh_gemini_models", "_selected_action": ["1"]},
        )
        self.assertEqual(response.status_code, 302)
        self.assertTrue(GeminiModel.objects.filter(
            model_id="gemini-test-flash", available=True,
        ).exists())

    @patch("social_stats.admin.integrations.gemini.list_generation_models",
           side_effect=GeminiGatewayError("Gateway offline"))
    def test_catalog_failure_keeps_previous_records(self, listing):
        model = GeminiModel.objects.create(model_id="gemini-stable", available=True)
        self.client.post(
            reverse("admin:social_stats_geminiconfiguration_changelist"),
            {"action": "refresh_gemini_models", "_selected_action": ["1"]},
        )
        model.refresh_from_db()
        self.assertTrue(model.available)
