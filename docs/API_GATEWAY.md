# API Access Gateway / outbound egress

Social Stats can run on servers where some third-party APIs are intermittently or permanently unreachable. The outbound egress layer supports three routing modes per service:

- `direct` — always call the provider directly.
- `gateway` — always call the configured API Access Gateway.
- `auto` — prefer direct and fall back to the gateway only for network-level failures.

Completed HTTP responses such as `400`, `401`, `403`, `429`, and `5xx` are **not** interpreted as blocked egress and are not retried through the gateway.

## 1. Deploy API Access Gateway v2

Use the companion repository:

```text
https://github.com/jaavid/api-access-gateway
```

The required gateway version exposes:

```text
GET /_gateway/health
GET /_gateway/routes
GET /_gateway/probe/<route>
```

and supports `GATEWAY_API_KEY` authentication.

Configure a Worker secret:

```bash
npx wrangler secret put GATEWAY_API_KEY
```

For Telegram and Bale add KV routes:

```bash
npx wrangler kv key put --binding=APIRoutes "/telegram" \
  '{"upstream":"https://api.telegram.org","probe_path":"/"}'

npx wrangler kv key put --binding=APIRoutes "/bale" \
  '{"upstream":"https://tapi.bale.ai","probe_path":"/"}'
```

Additional routes can be configured now for diagnostics and future client migrations:

```text
/meta          -> https://graph.facebook.com
/google        -> https://www.googleapis.com
/google-oauth  -> https://oauth2.googleapis.com
/google-upload -> https://upload.googleapis.com
/linkedin      -> https://api.linkedin.com
```

## 2. Configure Social Stats

In the backend environment / `.env.docker`:

```env
API_GATEWAY_URL=https://gateway.example.com
API_GATEWAY_KEY=replace-with-the-same-worker-secret

OUTBOUND_ROUTING_DEFAULT=auto
OUTBOUND_CIRCUIT_TTL_SECONDS=300

OUTBOUND_TELEGRAM_MODE=auto
OUTBOUND_BALE_MODE=auto
```

Restart the backend, worker, and beat processes after changing these values. Celery workers publish posts, so updating only the web process is not sufficient.

With Docker Compose:

```bash
docker compose up -d --build backend worker beat frontend
```

## 3. Verify connectivity

Sign in as a `superadmin` or `staff` user and open:

```text
Settings -> Connect Accounts -> API Connectivity
```

Use **Run connectivity test**. The panel reports:

- direct reachability and latency;
- gateway route reachability and latency;
- configured routing mode;
- current runtime route;
- recommended route based on the latest probe.

These probes do not send social-platform credentials. A provider returning an HTTP 4xx response still proves that DNS/TLS/HTTP connectivity works.

The authenticated endpoint behind the panel is:

```text
GET /api/egress/connectivity/
GET /api/egress/connectivity/?service=telegram
```

It is intentionally unavailable to normal client users.

## 4. Runtime behavior

For `OUTBOUND_TELEGRAM_MODE=auto`:

1. A publish request tries `api.telegram.org` directly.
2. If a connect/DNS/TLS/timeout-style exception occurs, Social Stats marks the direct route unhealthy for `OUTBOUND_CIRCUIT_TTL_SECONDS`.
3. The same request is retried through the allowlisted `telegram` gateway route.
4. During the short circuit window, later Telegram requests go straight to the gateway.
5. After the circuit expires, direct access is tried again automatically.

An HTTP response from Telegram — even `401`, `403`, or `429` — never triggers this fallback. Those responses are handled by the normal Telegram publisher error logic.

## Bot-token handling

Direct Telegram/Bale requests use the providers' required URL form:

```text
https://api.telegram.org/bot<TOKEN>/<method>
```

Gateway requests deliberately do **not** put the token into the public gateway URL. Social Stats calls:

```text
/gateway-route/bot/<method>
```

with an internal `X-Upstream-Bot-Token` header. API Access Gateway reconstructs the upstream Bot API path and strips both internal headers before forwarding.

## Current integration coverage

Runtime gateway routing in this release is enabled for:

- Telegram
- Bale

The health registry already contains Meta, Google, Google OAuth/Upload, and LinkedIn so operators can verify whether those hosts are reachable before their HTTP clients are migrated to the shared router. Their existing publishing/OAuth code paths remain unchanged in this release.
