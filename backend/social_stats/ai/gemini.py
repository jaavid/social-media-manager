"""Official google-genai SDK integration through the existing Cloudflare Worker.

The Google SDK always targets API_GATEWAY_URL/gemini. There is no direct
network fallback, no arbitrary upstream URL, and no browser-visible API key.
This adapter exposes the existing Anthropic-style messages interface to avoid
rewriting the established AI features and agentic orchestrator.
"""
from __future__ import annotations

import base64
import json
import uuid
from contextlib import contextmanager
from types import SimpleNamespace

from django.conf import settings

from social_stats.egress.router import gateway_key, gateway_url


class GeminiGatewayError(RuntimeError):
    """Gemini configuration, transport or provider error (safe for display)."""


def _sdk_client():
    """Create a fresh official SDK client with a forced Cloudflare base_url."""
    key = getattr(settings, "GEMINI_API_KEY", "").strip()
    if not key:
        raise GeminiGatewayError("GEMINI_API_KEY is not configured")
    try:
        base = gateway_url()
        secret = gateway_key()
    except ValueError as exc:
        raise GeminiGatewayError("API_GATEWAY_URL is invalid") from exc
    if not base or not secret:
        raise GeminiGatewayError("API_GATEWAY_URL and API_GATEWAY_KEY are required for Gemini")
    try:
        from google import genai
        from google.genai import types
    except ImportError as exc:
        raise GeminiGatewayError("Official google-genai SDK is not installed") from exc

    # Google Developer API paths are appended by the official SDK:
    # /gemini/v1beta/models and /gemini/v1beta/models/<id>:generateContent.
    # The existing Worker strips X-API-Gateway-Key before forwarding upstream.
    return genai.Client(
        vertexai=False,  # ignore GOOGLE_GENAI_USE_VERTEXAI and force Developer API
        api_key=key,
        http_options=types.HttpOptions(
            base_url=f"{base}/gemini",
            api_version="v1beta",
            timeout=90_000,
            headers={"X-API-Gateway-Key": secret},
            client_args={"trust_env": False, "follow_redirects": False},
            async_client_args={"trust_env": False, "follow_redirects": False},
        ),
    )


def _safe_sdk_error(exc):
    # Never expose a provider exception's raw message: URLs or request headers
    # may contain secrets. HTTP code alone is sufficient for operator feedback.
    code = getattr(exc, "code", None)
    if isinstance(code, int) and 100 <= code <= 599:
        return GeminiGatewayError(f"Gemini SDK/provider request failed (HTTP {code})")
    return GeminiGatewayError("Gemini SDK request failed; check gateway connectivity")


def list_generation_models():
    """Discover generateContent-capable Gemini models with SDK pagination."""
    models = {}
    try:
        with _sdk_client() as sdk:
            # PagedItem iterator fetches further pages through the same SDK
            # client and its Cloudflare base URL.
            for i, model in enumerate(sdk.models.list(config={"page_size": 1000})):
                if i >= 20_000:
                    raise GeminiGatewayError("Gemini model catalog limit exceeded")
                methods = getattr(model, "supported_actions", None) or []
                raw_name = getattr(model, "name", "") or ""
                if "generateContent" not in methods or not raw_name.startswith("models/"):
                    continue
                name = raw_name.removeprefix("models/")
                if not name or len(name) > 120:
                    continue
                models[name] = {
                    "model_id": name,
                    "display_name": str(getattr(model, "display_name", "") or name)[:160],
                    "description": str(getattr(model, "description", "") or "")[:2000],
                    "input_token_limit": getattr(model, "input_token_limit", None) or None,
                    "output_token_limit": getattr(model, "output_token_limit", None) or None,
                }
        return list(models.values())
    except GeminiGatewayError:
        raise
    except Exception as exc:
        raise _safe_sdk_error(exc) from exc


def get_ai_configuration():
    from social_stats.models.ai import GeminiConfiguration
    return GeminiConfiguration.objects.select_related(
        "default_model", "fast_model", "deep_model"
    ).filter(pk=1).first()


def selected_model(override=None, *, fast=False, deep=False):
    config = get_ai_configuration()
    if config and config.provider == "gemini":
        model = (config.fast_model if fast else
                 config.deep_model if deep else config.default_model)
        if model is None or not model.available:
            raise GeminiGatewayError("Select an available Gemini model in Django admin")
        if override and override.startswith("gemini-") and override != model.model_id:
            from social_stats.models.ai import GeminiModel
            if not GeminiModel.objects.filter(model_id=override, available=True).exists():
                raise GeminiGatewayError("Requested Gemini model is not in the available catalog")
            return override
        if override and not override.startswith("claude-") and override != model.model_id:
            raise GeminiGatewayError("Model override does not belong to Gemini")
        return model.model_id
    if override:
        return override
    if fast:
        return getattr(settings, "AI_FAST_MODEL", "claude-haiku-4-5-20251001")
    if deep:
        return getattr(settings, "AI_DEEP_MODEL", "claude-opus-4-7")
    return getattr(settings, "AI_DEFAULT_MODEL", "claude-sonnet-4-6")


def configured_client():
    config = get_ai_configuration()
    if config and config.provider == "gemini":
        # Lazy creation: no network access until a message is sent.
        return GeminiGatewayClient()
    try:
        from anthropic import Anthropic
    except ImportError as exc:
        raise GeminiGatewayError("Anthropic SDK is not installed") from exc
    key = getattr(settings, "ANTHROPIC_API_KEY", "")
    if not key:
        raise GeminiGatewayError("ANTHROPIC_API_KEY is not configured")
    return Anthropic(api_key=key)


def _native_messages(messages):
    """Convert Anthropic-style content and tool history to native SDK types.

    The Anthropic IDs are local correlation IDs; Gemini uses function names
    rather than those IDs when returning tool results.
    """
    from google.genai import types

    translated, tool_names = [], {}
    for message in messages:
        role = message["role"]
        content = message["content"]
        parts = []
        if isinstance(content, str):
            parts.append(types.Part.from_text(text=content))
        elif isinstance(content, list):
            for item in content:
                kind = item.get("type")
                if kind == "text":
                    parts.append(types.Part.from_text(text=item.get("text", "")))
                elif kind == "image":
                    source = item.get("source") or {}
                    if source.get("type") != "base64":
                        raise GeminiGatewayError("Unsupported Gemini image input")
                    try:
                        raw = base64.b64decode(source.get("data", ""), validate=True)
                    except (ValueError, base64.binascii.Error) as exc:
                        raise GeminiGatewayError("Invalid Gemini image encoding") from exc
                    parts.append(types.Part.from_bytes(
                        data=raw, mime_type=source.get("media_type", "image/jpeg")
                    ))
                elif kind == "tool_use":
                    name = item.get("name", "")
                    tool_names[item.get("id", "")] = name
                    parts.append(types.Part.from_function_call(
                        name=name, args=item.get("input") or {}
                    ))
                elif kind == "tool_result":
                    name = tool_names.get(item.get("tool_use_id", ""))
                    if not name:
                        raise GeminiGatewayError("Unmatched Gemini tool response")
                    value = item.get("content", "")
                    parts.append(types.Part.from_function_response(
                        name=name, response={"result": value}
                    ))
                else:
                    raise GeminiGatewayError("Unsupported Gemini message block")
        else:
            raise GeminiGatewayError("Unsupported Gemini message format")
        if parts:
            translated.append(types.Content(
                role="model" if role == "assistant" else "user",
                parts=parts,
            ))
    return translated


def _generation_arguments(kwargs):
    from google.genai import types

    declarations = []
    for tool in kwargs.get("tools") or []:
        declarations.append(types.FunctionDeclaration(
            name=tool["name"],
            description=tool.get("description") or "",
            parameters_json_schema=tool["input_schema"],
        ))
    config = types.GenerateContentConfig(
        system_instruction=kwargs.get("system") or None,
        max_output_tokens=kwargs.get("max_tokens", 1024),
        temperature=kwargs.get("temperature", 0.7),
        tools=([types.Tool(function_declarations=declarations)]
               if declarations else None),
        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
    )
    return {
        "model": kwargs["model"],
        "contents": _native_messages(kwargs["messages"]),
        "config": config,
    }


def _normalise_response(response):
    blocks = []
    candidates = getattr(response, "candidates", None) or []
    if candidates:
        for part in getattr(getattr(candidates[0], "content", None), "parts", None) or []:
            if getattr(part, "text", None):
                blocks.append(SimpleNamespace(type="text", text=part.text))
            if getattr(part, "function_call", None):
                call = part.function_call
                blocks.append(SimpleNamespace(
                    type="tool_use",
                    # Local IDs are stable within the persisted assistant turn.
                    id=getattr(call, "id", None) or f"gemini-{uuid.uuid4().hex}",
                    name=call.name,
                    input=dict(call.args or {}),
                ))
    usage = getattr(response, "usage_metadata", None)
    return SimpleNamespace(
        id=getattr(response, "response_id", "") or "",
        content=blocks,
        stop_reason="tool_use" if any(b.type == "tool_use" for b in blocks) else "end_turn",
        usage=SimpleNamespace(
            input_tokens=int(getattr(usage, "prompt_token_count", 0) or 0),
            output_tokens=int(getattr(usage, "candidates_token_count", 0) or 0),
        ),
    )


class _GeminiMessages:
    def create(self, **kwargs):
        args = _generation_arguments(kwargs)
        try:
            with _sdk_client() as sdk:
                answer = sdk.models.generate_content(**args)
            return _normalise_response(answer)
        except GeminiGatewayError:
            raise
        except Exception as exc:
            raise _safe_sdk_error(exc) from exc

    @contextmanager
    def stream(self, **kwargs):
        # Iterator and SDK must remain open for the duration of SSE consumption.
        with _sdk_client() as sdk:
            try:
                iterator = sdk.models.generate_content_stream(
                    **_generation_arguments(kwargs)
                )
                stream = _GeminiStream(iterator)
                yield stream
            except GeminiGatewayError:
                raise
            except Exception as exc:
                raise _safe_sdk_error(exc) from exc


class _GeminiStream:
    def __init__(self, iterator):
        self._iterator = iterator
        self._text = []
        self._usage = SimpleNamespace(input_tokens=0, output_tokens=0)
        self._request_id = ""

    @property
    def text_stream(self):
        try:
            for packet in self._iterator:
                response = _normalise_response(packet)
                self._request_id = response.id or self._request_id
                if response.usage.input_tokens or response.usage.output_tokens:
                    self._usage = response.usage
                for block in response.content:
                    if block.type == "text" and block.text:
                        self._text.append(block.text)
                        yield block.text
        finally:
            close = getattr(self._iterator, "close", None)
            if close:
                close()

    def get_final_message(self):
        return SimpleNamespace(
            id=self._request_id,
            usage=self._usage,
            content=[SimpleNamespace(type="text", text="".join(self._text))],
        )


class GeminiGatewayClient:
    """Compatibility wrapper; all actual Google calls go through google-genai."""
    def __init__(self):
        self.messages = _GeminiMessages()
