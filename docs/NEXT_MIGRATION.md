# Incremental Next.js migration (#64, #65)

The optional Next host uses **Next.js 16.3.8**, the highest stable `next@16`
version returned by npm on 2026-10-03. The version is pinned in the manifest and
lockfile. Node 20.19+ is required by the retained Vite 7 toolchain (Next itself requires
20.9+); both Docker images and CI use Node 20.

## Route ownership

| URL | Opt-in production owner | Auth boundary |
| --- | --- | --- |
| `/privacy`, `/terms` | Next App Router | Public |
| `/login` | Next App Router | Existing password, MFA and SSO contracts |
| `/pending` | Next App Router | Client role |
| `/admin/account-settings` | Next App Router | Superadmin or staff |
| `/dashboard/account-settings` | Next App Router | Client role |
| All other UI routes | Existing Vite application | Existing guards |
| `/api/`, `/ws/`, `/media/`, `/backend/`, `/static/` | Existing nginx/Django owners | Existing backend checks |

The default stack still runs Vite. The Next host also has a compatibility
catch-all for direct local testing; production ingress routes only the six
explicit URLs above to it. Adding a route means adding an App Router page,
updating `src/app/routes/migratedRoutes.js` and `docker/next-routes.conf`, and
covering its auth/params behavior. The route-owner test checks the ingress and
client allowlists agree.

## Architecture and boundaries

`frontend/next/` is a separate Next project directory sharing the existing npm
manifest and source tree. This avoids treating the legacy `src/pages/` feature
folder as a Next Pages Router. Existing pages, settings features, UI primitives,
hooks, Zustand stores, API services, theme and realtime providers are reused.

Root and route layouts own metadata, font/style setup, language/theme bootstrap,
loading and error fallbacks. Protected route layouts use `AuthBoundary`, which
reuses the existing `Protected` guard. `RouteView` prevents legacy `Meta` effects
from overwriting server-owned metadata; the Vite host retains its head behavior.
Public legal pages preserve their descriptions. Set `NEXT_PUBLIC_SITE_URL` at
build time to emit their canonical URLs; the Compose overlay uses `APP_URL`.

`BrowserBoundary` imports the provider/feature tree with `ssr: false`. The initial
HTML contains the server-owned head and loading shell, while existing feature
bodies remain client-rendered. This is intentional: feature code still uses
browser-only libraries, `window`, and browser JWT storage. This phase does not
promise server-rendered legal body content or server-side authenticated data.
There are no private server fetches or credentials embedded in HTML/RSC.

The browser session still calls Django `/api/auth/me/`, retains JWT refresh
rotation and cross-tab invalidation, waits for session resolution before showing
protected features, and applies the original role/account-type checks. Backend
API authorization remains authoritative. Cookie-based server auth would require
a separate API/session change; this migration does not invent that contract.

The Next host supplies a React Router compatibility navigator driven by Next's
pathname/search state. Migrated-to-migrated links use App Router. Cross-host links
use document navigation so nginx selects the owner; Vite's migration boundary
hands migrated destinations back to ingress when explicitly enabled. Query/hash
URLs remain intact. Internal navigation rejects another origin. Existing React
Router state (notably social-login MFA) crosses document navigation through a
one-use, tab-local sessionStorage entry with a 30-second lifetime, then returns
to browser history state. It never enters URLs or server requests.

Service worker v2 excludes migrated HTML, Next assets and RSC responses; retained
Vite document navigations use network first. The Vite handoff releases an existing
`/sw.js` registration before crossing, preventing old v1 cached Vite HTML from
causing a redirect loop. Offline support for Next routes is not enabled.

TypeScript was upgraded to 5.9 and the CRA-only test runner was replaced with Jest
29/Babel directly, preserving existing test conventions and browser fetch setup.
Vite remains the legacy bundler. Webpack is explicitly selected for Next during
this compatibility phase; Turbopack is not validated.

## Local checks and development

From `frontend/`:

```sh
npm ci
npm run dev                    # Existing Vite host, port 3000
npm run dev:next               # Optional Next host, port 3001
npm run typecheck
CI=true npm test -- --runInBand
npm run i18n:check
npm run build                 # Default Vite artifact
npm run build:next
npm run start:next             # Prepares public/static and runs standalone output
```

Next defaults to same-origin `/api` and rewrites API/media/backend requests to
`http://127.0.0.1:8000` for local development. Put Next variables in
`frontend/next/.env.local` or export them before building. Supported public keys:
`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`,
`NEXT_PUBLIC_PLAUSIBLE_HOST`, and `NEXT_PUBLIC_SITE_URL`. Legacy `REACT_APP_*`
configuration keys are mapped explicitly; arbitrary environment values are not
exposed. `NEXT_BACKEND_URL` controls local HTTP rewrites at build/dev time.
For local Next realtime testing, set `NEXT_PUBLIC_WS_URL=ws://localhost:8000`;
production websocket requests continue through the original ingress.

Run split-host browser checks against production builds:

```sh
npm run build:rollout          # Vite artifact with explicit Next handoff enabled
npm run build:next
npx playwright install chromium
npm run test:next
```

The suite starts the Next standalone server and a small local test ingress on
3120 serving built Vite assets. API responses are mocked; checks cover metadata,
RTL/theme, public navigation, anonymous/role guards, delayed session resolution,
OAuth MFA handoff and browser Back. To test a running real nginx ingress instead,
set `E2E_BASE_URL=http://127.0.0.1:3003` before `npm run test:next`.

## Opt-in deployment and rollback

Use the existing `.env` with the correct production `APP_URL`:

```sh
docker compose -f docker-compose.yml -f docker-compose.next.yml up -d --build
```

The overlay builds the existing app with `REACT_APP_NEXT_ENABLED=true`, adds a
non-root standalone Next service on the internal Docker network, mounts the
explicit nginx route allowlist, and waits for Next health before starting app.
Next has no published port. The external origin, API, websocket and backend admin
routing stay on the existing app ingress. Public API/WS/analytics configuration
is build-time configuration; rebuild images when changing it. The default
same-origin `/api` contract needs no override.

Rollback must restore **both** the Vite build flag and nginx routing:

```sh
docker compose -f docker-compose.yml up -d --build --force-recreate app
# Stop the now-unused Next service only after the app is healthy:
docker compose -f docker-compose.yml -f docker-compose.next.yml stop next
```

The first command uses only the base file, restoring `REACT_APP_NEXT_ENABLED=false`
and removing the Next ingress mount. Do not merely remove the nginx allowlist
while retaining a Vite artifact with handoff enabled: it would reload migrated
URLs repeatedly. No database migration, data deletion or volume reset is needed.

## Validation and remaining work

CI now checks TypeScript, both production builds, Jest and split-host browser
behavior. The default unified-stack CI remains in place. The Next image was also
built locally on Node 20 and its HTML/static asset response and nginx configuration
were checked. All 7 browser checks also passed against the actual nginx +
Next Docker ingress (with mocked API responses), including canonical/Open Graph
output verification. The 1440×1000 Vite/Next privacy-page captures were
pixel-identical: [Vite](images/next-migration-vite.png),
[Next](images/next-migration-next.png). Backend source and schema are unchanged by this PR; backend/full
unified-stack results are provided by CI rather than claimed as local tests.

The migration remains incremental by design. Other route families, public-body
SSR, a cookie-based server session and Turbopack can be migrated independently.
The npm production audit reports the same 9 advisories on this branch and the
base `main` lockfile (1 critical, 3 high, 5 moderate), involving existing PDF,
routing and utility dependencies. None is attributed to the added Next package.
Those existing dependency upgrades need separate compatibility/security work.
