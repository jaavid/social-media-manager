# Completed Next.js cutover (#90–#92)

Next **16.3.8** is the sole frontend build and runtime. #64 and #65 established
the initial adapter and opt-in host; this cutover removes Vite, React Router,
the catch-all compatibility host, split ingress and cross-document handoff.

## Route ownership and rendering

The reviewed [URL inventory](../frontend/src/app/routes/routeInventory.json)
contains **191 explicit URLs**, including retained client/workspace aliases.
`npm run routes:generate` produces native `page.jsx` and feature `View.jsx`
files from this inventory. Update the inventory when adding routes. Public
product, solutions, customers, blog and agency slugs derive metadata from their
shared content source; unknown slugs and unknown URLs return genuine HTTP 404s.
Two ads catch-all pages intentionally retain the existing coming-soon behavior.
Old wildcard fallback redirects are retired and recorded in the inventory.

Public content and JSON-LD render in the server response. Request rendering is
used because global navigation consumes search parameters. Only the canvas bot
editor and cookie preference banner have explicit browser-only boundaries.
Private pages keep the existing browser JWT session contract: the server emits
the guarded loading state; authenticated content appears after `/api/auth/me/`
resolves. Private routes are noindex and include no private server-fetched data.
Moving authentication to server cookies is a separate product/backend change.

Next owns all metadata; legacy `Meta` calls are harmless compatibility markers.
`NEXT_PUBLIC_SITE_URL` configures canonical/OpenGraph/JSON-LD origin at build time
(the unified Compose build uses `APP_URL`). Public output defaults to Persian
RTL; persisted language/theme apply during hydration without hydration mismatch.
Each server render owns its query client, and browser account/workspace identity
changes replace the query cache. Native history retains navigation state used by
OAuth MFA; query parameters, fragments, dynamic IDs and Back/Forward stay native.

## Local commands

Node 20.9+ is required; CI and Docker use Node 20 LTS.

```bash
cd frontend
npm ci
npm run dev                       # Next dev :3000, webpack
npm run typecheck
CI=true npm test -- --runInBand
npm run build                     # sole production artifact
npm start                         # standalone server :3000
npm run test:next                  # Chromium production browser checks
```

Run Django on :8000 for local API/media/backend proxying, or configure
`NEXT_BACKEND_URL`. Set public values in `next/.env.local` or exported build
variables; `VITE_*` and `VITE_NEXT_ENABLED` have no effect. Existing explicitly
mapped `REACT_APP_*` API/WebSocket/Plausible values remain compatible. API
requests default to same-origin `/api`. Production websocket routing is nginx.

## Production deployment and health

```bash
# Existing configured deployment: keep .env and persistent volumes.
docker compose up -d --build
# Or pull a released unified image, then docker compose up -d.
python3 scripts/check_next_stack.py http://localhost:3000
docker compose exec app supervisorctl status
```

One app image contains Next standalone plus Django, Celery, beat and nginx.
Nginx proxies UI and `/_next/*` to Next on loopback :3000. Django exclusively
owns `/api/`, `/ws/`, `/backend/`, `/media/` and `/static/` (admin static). The
Docker/Compose `/healthz` check requires both Next and Django. Next is supervised
and restarts after failure. Database/media/Redis volume names are unchanged;
this cutover introduces no backend migrations. Do not run `down -v` on a live
installation. Direct-TLS nginx and the deployment helper also use Next now.

The app unregisters its old `/sw.js` worker and clears only `socialstats-*`
caches. `/sw.js` remains as a no-store retirement worker for existing clients;
new installs do not register it. Users with an already-open cached SPA tab must
reload after deployment. Offline SPA caching is intentionally retired.

## Rollback

Pin `SOCIAL_STATS_APP_IMAGE` to the previously released pre-cutover unified image,
then `docker compose pull app && docker compose up -d --no-build app`. Keep all
persistent volumes. The new source has no Vite mode or split Compose override;
rollback restores the previous complete image, rather than mixing host versions.

## Validation and limits

CI checks TypeScript, Jest, the sole production build, native browser flows,
the unified Docker ingress, Next/Django health, supervised processes and backend
tests. Browser coverage uses mocked external APIs to isolate routing/session
behavior; Docker checks use the real Django API and admin. Existing third-party
integrations and real provider OAuth callbacks still need deployment credentials
for live integration testing. Features previously marked coming-soon (ads and
some end-user sidebar entries) remain product backlog, not migration gaps.

The historical privacy/settings parity captures from #89 remain in `docs/images`;
shared feature views and styles are reused throughout this cutover. The production
npm audit baseline includes unrelated feature dependencies and is reported
separately; passing migration tests does not mean those advisories are resolved.
