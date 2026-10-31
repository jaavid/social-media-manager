"""Gemini via the existing allowlisted Cloudflare API Access Gateway only.

Uses Gemini's OpenAI-compatible REST API for completions and native Models
API for catalog discovery. The small response adapter preserves the Anthropic
message shape expected by the existing AIClient and agentic chat orchestration.
No Google SDK can silently fall back to a direct socket.
"""
from __future__ import annotations

import json
from contextlib import contextmanager
from types import SimpleNamespace

from django.conf import settings

from social_stats.egress.router import gateway_key, gateway_url, outbound_request


ORIGIN = "https://generativelanguage.googleapis.com"
CHAT_PATH = "/v1beta/openai/chat/completions"
MODELS_PATH = "/v1beta/models"


class GeminiGatewayError(RuntimeError):
    """Gemini or its mandatory gateway is unavailable."""


def _call(method, path, *, payload=None, params=None, stream=False):
    key = getattr(settings, "GEMINI_API_KEY", "")
    if not key:
        raise GeminiGatewayError("GEMINI_API_KEY is not configured")
    if not gateway_url() or not gateway_key():
        raise GeminiGatewayError("API_GATEWAY_URL and API_GATEWAY_KEY are required for Gemini")
    # Never put the Google key in the URL, trace, metadata, or a browser response.
    headers = {"Authorization": f"Bearer {key}", "Accept": "application/json"}
    if payload is not None:
        headers["Content-Type"] = "application/json"
    try:
        response = outbound_request(
            "gemini", method, f"{ORIGIN}{path}", mode="gateway",
            headers=headers, json=payload, params=params, stream=stream,
            timeout=(10, 90), allow_redirects=False,
        )
        if 300 <= response.status_code < 400:
            response.close()
            raise GeminiGatewayError("Gemini gateway redirect refused")
        if response.status_code >= 400:
            status = response.status_code
            response.close()
            raise GeminiGatewayError(f"Gemini gateway/provider returned HTTP {status}")
        return response
    except GeminiGatewayError:
        raise
    except Exception as exc:
        raise GeminiGatewayError("Gemini gateway transport failure") from exc


def list_generation_models():
    """Return full Gemini catalog (native API), only generateContent-capable models."""
    models = {}
    page_token = None
    seen_tokens = set()
    for _ in range(20):  # bounded even if upstream paginates incorrectly
        params = {"pageSize": 1000}
        if page_token:
            params["pageToken"] = page_token
        response = _call("GET", MODELS_PATH, params=params)
        try:
            data = response.json()
        except ValueError as exc:
            raise GeminiGatewayError("Gemini models response is not JSON") from exc
        finally:
            response.close()
        if not isinstance(data, dict) or not isinstance(data.get("models"), list):
            raise GeminiGatewayError("Gemini models response is invalid")
        for entry in data["models"]:
            if not isinstance(entry, dict):
                continue
            methods = entry.get("supportedGenerationMethods", [])
            model_name = entry.get("name", "")
            if ("generateContent" not in methods or not isinstance(model_name, str)
                    or not model_name.startswith("models/")):
                continue
            model_id = model_name.removeprefix("models/")
            if not model_id or len(model_id) > 120:
                continue
            models[model_id] = {
                "model_id": model_id,
                "display_name": str(entry.get("displayName", model_id))[:160],
                "description": str(entry.get("description", ""))[:2000],
                "input_token_limit": entry.get("inputTokenLimit") or None,
                "output_token_limit": entry.get("outputTokenLimit") or None,
            }
        page_token = data.get("nextPageToken")
        if not page_token:
            return list(models.values())
        if not isinstance(page_token, str) or page_token in seen_tokens:
            raise GeminiGatewayError("Gemini models pagination is invalid")
        seen_tokens.add(page_token)
    raise GeminiGatewayError("Gemini models pagination limit exceeded")


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
            raise GeminiGatewayError("Select a currently available Gemini model in Django admin")
        if override and override.startswith("gemini-") and override != model.model_id:
            # Explicit model can be used only when it is in the synced catalog.
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
        return GeminiGatewayClient()
    try:
        from anthropic import Anthropic
    except ImportError as exc:
        raise GeminiGatewayError("Anthropic SDK is not installed") from exc
    key = getattr(settings, "ANTHROPIC_API_KEY", "")
    if not key:
        raise GeminiGatewayError("ANTHROPIC_API_KEY is not configured")
    return Anthropic(api_key=key)


def _content_to_openai(role, content):
    """Translate Anthropic tool/image blocks into OpenAI chat message(s)."""
    if isinstance(content, str):
        return [{"role": role, "content": content}]
    if not isinstance(content, list):
        return [{"role": role, "content": str(content or "")}]
    if role == "assistant":
        parts, calls = [], []
        for block in content:
            if block.get("type") == "text":
                parts.append(block.get("text", ""))
            elif block.get("type") == "tool_use":
                calls.append({"id": block["id"], "type": "function", "function": {
                    "name": block["name"], "arguments": json.dumps(block.get("input", {})),
                }})
        message = {"role": "assistant", "content": "\n".join(parts) or None}
        if calls:
            message["tool_calls"] = calls
        return [message]
    parts, tools = [], []
    for block in content:
        kind = block.get("type")
        if kind == "text":
            parts.append({"type": "text", "text": block.get("text", "")})
        elif kind == "image":
            source = block.get("source", {})
            if source.get("type") == "base64":
                parts.append({"type": "image_url", "image_url": {
                    "url": f"data:{source.get('media_type', 'image/jpeg')};base64,{source.get('data', '')}"
                }})
        elif kind == "tool_result":
            value = block.get("content", "")
            if not isinstance(value, str):
                value = json.dumps(value)
            tools.append({"role": "tool", "tool_call_id": block["tool_use_id"],
                          "content": value})
    return ([{"role": "user", "content": parts}] if parts else []) + tools


def _payload(kwargs, *, stream=False):
    messages = []
    if kwargs.get("system"):
        messages.append({"role": "system", "content": kwargs["system"]})
    for message in kwargs["messages"]:
        messages.extend(_content_to_openai(message["role"], message["content"]))
    payload = {
        "model": kwargs["model"],
        "messages": messages,
        "max_tokens": kwargs.get("max_tokens", 1024),
        "temperature": kwargs.get("temperature", 0.7),
    }
    if kwargs.get("tools"):
        payload["tools"] = [{"type": "function", "function": {
            "name": tool["name"],
            "description": tool.get("description", ""),
            "parameters": tool["input_schema"],
        }} for tool in kwargs["tools"]]
    if stream:
        payload["stream"] = True
        payload["stream_options"] = {"include_usage": True}
    return payload


def _normalise_response(data):
    choices = data.get("choices") or []
    if not choices:
        raise GeminiGatewayError("Gemini completion has no choices")
    message = choices[0].get("message") or {}
    blocks = []
    content = message.get("content")
    if isinstance(content, str) and content:
        blocks.append(SimpleNamespace(type="text", text=content))
    elif isinstance(content, list):
        for chunk in content:
            if isinstance(chunk, dict) and chunk.get("type") == "text":
                blocks.append(SimpleNamespace(type="text", text=chunk.get("text", "")))
    for call in message.get("tool_calls") or []:
        fn = call.get("function") or {}
        try:
            args = json.loads(fn.get("arguments") or "{}")
        except ValueError:
            args = {}
        blocks.append(SimpleNamespace(
            type="tool_use", id=call.get("id", ""), name=fn.get("name", ""),
            input=args if isinstance(args, dict) else {},
        ))
    usage = data.get("usage") or {}
    return SimpleNamespace(
        id=data.get("id", ""), content=blocks,
        stop_reason="tool_use" if any(b.type == "tool_use" for b in blocks) else "end_turn",
        usage=SimpleNamespace(
            input_tokens=usage.get("prompt_tokens") or 0,
            output_tokens=usage.get("completion_tokens") or 0,
        ),
    )


class _GeminiStream:
    def __init__(self, response):
        self.response = response
        self.parts = []
        self.usage = {}
        self.request_id = ""

    @property
    def text_stream(self):
        try:
            for line in self.response.iter_lines(decode_unicode=True):
                if not line:
                    continue
                if isinstance(line, bytes):
                    line = line.decode("utf-8")
                if not line.startswith("data:"):
                    continue
                raw = line[5:].strip()
                if raw == "[DONE]":
                    break
                try:
                    packet = json.loads(raw)
                except ValueError as exc:
                    raise GeminiGatewayError("Gemini streaming response is invalid") from exc
                self.request_id = packet.get("id", self.request_id)
                self.usage = packet.get("usage") or self.usage
                for choice in packet.get("choices") or []:
                    delta = choice.get("delta") or {}
                    content = delta.get("content")
                    if isinstance(content, str) and content:
                        self.parts.append(content)
                        yield content
        finally:
            self.response.close()

    def get_final_message(self):
        return SimpleNamespace(
            id=self.request_id,
            usage=SimpleNamespace(
                input_tokens=self.usage.get("prompt_tokens", 0),
                output_tokens=self.usage.get("completion_tokens", 0),
            ),
            content=[SimpleNamespace(type="text", text="".join(self.parts))],
        )


class _GeminiMessages:
    def create(self, **kwargs):
        response = _call("POST", CHAT_PATH, payload=_payload(kwargs))
        try:
            return _normalise_response(response.json())
        except (ValueError, TypeError, KeyError) as exc:
            raise GeminiGatewayError("Gemini completion response is invalid") from exc
        finally:
            response.close()

    @contextmanager
    def stream(self, **kwargs):
        response = _call("POST", CHAT_PATH, payload=_payload(kwargs, stream=True), stream=True)
        stream = _GeminiStream(response)
        try:
            yield stream
        finally:
            response.close()


class GeminiGatewayClient:
    """Minimal messages interface compatible with the application's AI flows."""
    def __init__(self):
        self.messages = _GeminiMessages()
