# Google Gemini through Cloudflare (Django)

## Architecture and scope

- **No direct fallback.** Every Gemini model catalog request and completion uses
  the existing \`social_stats.egress.outbound_request("gemini", ...)\` with
  gateway-only mode, allowlisted host \`generativelanguage.googleapis.com\` and
  the \`/gemini\` Worker route. Missing gateway URL/key fails closed.
- \`GEMINI_API_KEY\` is read only on the Django server. Gemini model IDs,
  display names, availability, context limits, and the active provider/model
  selection live in the database; **the key is never stored there**.
- The centralized \`AIClient\` (completion, streaming, vision, JSON extraction)
  and the agentic \`/api/ai/v2/chat/\` flow use the active provider. Anthropic
  remains the default until an administrator selects Gemini.
- The older \`/api/ai/*\` endpoints that use \`social_stats.views.ai.get_claude\`
  directly are **not** part of this provider switch. Migrate them separately;
  they remain Anthropic-only. This is intentional to avoid silently changing
  their pre-existing SDK and model contracts.

## 1. Register the gateway route

In \`jaavid/api-access-gateway\`, with the correct Cloudflare account and
\`APIRoutes\` KV namespace configured:

\`\`\`bash
npx wrangler kv key put --remote --binding=APIRoutes "/gemini" \
  '{"upstream":"https://generativelanguage.googleapis.com","probe_path":"/v1beta/models"}'
\`\`\`

Make sure the Worker secret \`GATEWAY_API_KEY\` is configured. Existing Worker
code already supports allowlisted routes; a Worker redeploy is not required
for a KV-only update.

Verify the route (no credentials in the URL):

\`\`\`bash
curl -sS -H "X-API-Gateway-Key: $API_GATEWAY_KEY" \
  "$API_GATEWAY_URL/_gateway/probe/gemini"
\`\`\`

The probe may report an upstream HTTP 401/403 because it deliberately sends
no Google API key; \`reachable: true\` checks network reachability only.

## 2. Configure the backend

Set these *server-side* values in the deployment \`.env\`:

\`\`\`env
API_GATEWAY_URL=https://your-cloudflare-worker.example
API_GATEWAY_KEY=your-existing-gateway-secret
GEMINI_API_KEY=your-google-ai-studio-key
\`\`\`

Google key: https://aistudio.google.com/apikey. Avoid exposing secrets via
\`NEXT_PUBLIC_*\`, logs, GitHub, browser settings, or admin form fields.
Use separate key rotation/secret-management practices for production.

The dashboard's Gemini cost estimates default conservatively to
\`GEMINI_EST_INPUT_USD_PER_MILLION=10\` and
\`GEMINI_EST_OUTPUT_USD_PER_MILLION=50\`. These are *not* live Google prices.
Adjust based on the actual chosen model and context; never treat estimated
usage as an invoice.

## 3. Sync and select models in Django admin

1. Deploy this branch and run \`python manage.py migrate\`. The migration
   creates one **AI provider settings** row, defaulting to Anthropic.
2. In Django admin open **تنظیمات سرویس هوش مصنوعی**. Select the singleton row,
   then from Actions run **دریافت و به‌روزرسانی فهرست مدل‌های Gemini از طریق Cloudflare**.
3. Review **مدل‌های Google Gemini** and supported context limits, then edit
   **تنظیمات سرویس هوش مصنوعی**. Select Google Gemini as provider, choose
   available **default / fast / deep** models, and save.
4. Restart Django and Celery workers after changing env secrets. Model changes
   in Django admin are effective without restarting workers.

The models list comes from Google's paginated native \`/v1beta/models\`
endpoint and is filtered to models that advertise \`generateContent\`.
Some image-only or otherwise specialized models may appear in that list; use
a conversational model for default/fast/deep. A changed/retired model is
marked unavailable on resync rather than deleted. An empty/broken fetch
never clears the existing catalog. Gemini's actual availability and pricing
depend on the key's project, region and account limits.

## Safety / operational checklist

- Never switch to \`direct\` / \`auto\` for Gemini even if general egress permits it.
- Run \`python manage.py check\`, \`python manage.py makemigrations --check --dry-run\`,
  and \`python manage.py test social_stats.tests.test_gemini_gateway\`.
- Test a model-sync action, a completion, streaming, vision and an agentic chat
  with the actual gateway before enabling the provider in production.
- Confirm \`/_gateway/routes\` contains \`gemini\` and the expected exact upstream.
- Confirm the runtime can only reach Gemini via the Worker (host firewall / egress
  deny rules can provide defense-in-depth).

The official SDK also runs `client.models.generate_content()` and
`client.models.generate_content_stream()` through this custom base URL;
no REST fallback or separate manual HTTP client is used for Gemini.
