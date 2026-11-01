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
| `POST /api/ai/generate-image-caption/` | **Anthropic-only legacy vision** | Claude Haiku | **Gemini selects HTTP 501 `image_caption_provider_unsupported`**; cannot interpret arbitrary image URLs safely; no silent fallback or SDK call |

The seven text endpoints use the same central `AIClient` used by chat/caption workflows. The client chooses the selected Django Admin Gemini or Claude model, applies entitlements, usage and safety controls. The Gemini implementation uses the official `google-genai` SDK **only via the required Cloudflare Gateway route**. There is no frontend token field.

Image URLs need a separate design: authorize upload or server-side media reference; validate content type, size, and tenant ownership; pass base64 image bytes to the existing SDK bridge. Arbitrary URL fetching risks SSRF and is deliberately not implemented here.

**Testing**: mock `AIClient.complete` for API request/response contracts; existing `test_gemini_gateway.py` verifies official SDK and gateway-only transport. An unavailable gateway must fail closed (503/502), never reroute to direct Google or Claude.
