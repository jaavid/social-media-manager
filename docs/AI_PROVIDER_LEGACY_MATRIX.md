# AI provider coverage — legacy REST surface

| Endpoint | Provider path | Model selection | Cache / caveat |
|---|---|---|---|
| `POST /api/ai/compose-post/` | `AIClient.complete` | fast | Scoped by workspace + model; variants response retained |
| `POST /api/ai/suggest-hashtags/` | `AIClient.complete` | fast | Scoped by workspace + model; normalized tags |
| `POST /api/ai/suggest-reply/` | `AIClient.complete` | fast | Tenant-guarded message, first suggestion saved |
| `POST /api/ai/rewrite/` | `AIClient.complete` | fast | Scoped by workspace + model |
| `POST /api/ai/translate/` | `AIClient.complete` | fast | Scoped by workspace + model |
| `POST /api/ai/content-calendar/` | `AIClient.complete` | default | Scoped by workspace + model; structured calendar |
| `POST /api/ai/train-brand-voice/` | `AIClient.complete` | fast | Tenant-guarded profile write |
| `POST /api/ai/best-time-to-post/` | no AI call | n/a | Deterministic heuristic over historical engagement |
| `GET /api/ai/brand-voice/` | no AI call | n/a | Tenant-scoped database read |
| `POST /api/ai/generate-image-caption/` | **Anthropic-only legacy vision** | configured Claude fast model | **Gemini selects HTTP 501 `image_caption_provider_unsupported`**; Claude-only requests accept public HTTPS URLs, tenant/model-scoped cache, generic provider errors; no silent fallback or SDK call |

The seven text endpoints use the same central `AIClient` used by chat/caption workflows. The client chooses the selected Django Admin Gemini or Claude model, applies entitlements, usage and safety controls. The Gemini implementation uses the official `google-genai` SDK **only via the required Cloudflare Gateway route**. There is no frontend token field.

Image URLs need a separate design: authorize upload or server-side media reference; validate content type, size, and tenant ownership; pass base64 image bytes to the existing SDK bridge. Arbitrary URL fetching risks SSRF and is deliberately not implemented here.

**Testing**: mock `AIClient.complete` for API request/response contracts; existing `test_gemini_gateway.py` verifies official SDK and gateway-only transport. An unavailable gateway must fail closed (503/502), never reroute to direct Google or Claude.


## 2026-11-03 legacy vision boundary audit (#249)

- Confirmed the seven text endpoints delegate to `AIClient.complete`; their quota and usage handling is in the centralized client, not a second direct Anthropic SDK call.
- Legacy image URL captions remain Claude-only and explicitly unavailable under Gemini. Compatibility is maintained for public HTTPS image URLs; local/non-HTTPS/credential-bearing and private literal IP URLs are rejected.
- The prior image-caption cache key omitted tenant identity, risking cross-tenant reuse of brand-specific output for an identical public image URL. It now includes `client.pk` and the configured Claude fast model in addition to the URL, platform and length.
- Legacy vision provider exceptions no longer return exception strings in API responses; entitlement denial is translated to an explicit 403 instead of an unhandled exception.
- Regression coverage: cross-tenant same-image isolation, URL validation, provider error redaction, and entitlement denial (mocked provider only, no external image fetch).
- **Limit**: a public HTTPS hostname can still resolve to an unsafe address after validation. The URL-vision adapter remains legacy and should be replaced by authenticated, server-owned media bytes with DNS/IP validation before any server-side fetch. This patch does not claim generic SSRF protection or true Gemini image-caption support.

- Legacy Claude vision uses `selected_model(fast=True)` so changing `AI_FAST_MODEL` affects both the provider call and cache identity; a mocked provider-model test covers this.
