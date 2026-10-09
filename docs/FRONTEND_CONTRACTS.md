# Frontend contracts

This records the implementation decisions for #100, #102, #104 and #105.
The reference view is `/design-system`. The existing 191 URLs and aliases remain
owned by their native routes; the catalog adds one development reference URL.

## Ownership and checks

Routes under `app/` compose views in `features/<domain>/`. New views import their
domain SDK from `services/domains/`, checked DTOs/errors from `services/http/` or
`lib/`, semantic messages from `i18n/`, and shared controls from `components/ui/`.
Use `@/` in new modules. Shared code must not import route modules or feature
implementations. Core owns Next navigation, providers and session coordination;
lib owns framework-independent contracts and explicitly marked server DALs.
The API facade remains a small compatibility export list for existing callers.
Client exports never transitively import `server-only`, `next/headers`, node
modules or the archived application. The architecture guard detects source cycles.

Run `npm run lint`, `npm run check:architecture`, `npm run typecheck`,
`npm run i18n:check`, `npm run check:next`, `CI=true npm test`, `npm run build`,
`npm run test:proxy`, and `npm run test:next`. CI runs these explicitly, including
the route inventory and retirement worker tests. Babel transforms only Jest;
the production build uses Next's compiler with Webpack. The declared React
ecosystem contract is recorded below. Turbopack and React Compiler adoption
require the chart/flow/form compatibility work in #98.

## Dependency and installation contract (NX-01)

Use Node **20.19.5** (`frontend/.nvmrc`) and npm **10.8.2**. From `frontend/`,
run `nvm use`, `npm install --global npm@10.8.2 --no-audit --no-fund`, then
`npm ci --no-audit --no-fund` and `npm run check:dependencies`. CI and both
Docker frontend build stages pin these same versions and check the resulting
dependency tree. Docker retains its existing distributions and platform support.
`packageManager` records npm; it does not automatically install that version.

Next **16.3.8**, React/ReactDOM **18.3.1**, `@types/react` **18.3.31** and
`@types/react-dom` **18.3.7** are exact declarations matching the lockfile.
NX-01 found the committed manifest/lockfile already agreed on React 18, while
the local installation had React/ReactDOM/types 19.3.0 and other out-of-contract
packages. Reinstall with `npm ci`; do not repair this with `--force`,
`--legacy-peer-deps`, or an unrelated dependency upgrade. No resolved dependency
version changes are required. Update the manifest and lockfile together when
deliberately changing this contract.

Next 16.3.8's published peer ranges accept React/ReactDOM `^18.2.0`. The locked
Radix, Framer Motion, ReactFlow, Recharts, TanStack Query, next-intl and Zustand
packages also accept 18.3.1, so the existing declared React 18 contract is kept.
This is an ecosystem/tooling contract, **not a React 18-only browser runtime**:
the [App Router uses React canary bundled inside Next](https://nextjs.org/docs/app/getting-started/installation).
Next's installed documentation and `dist/build/create-compiler-aliases.js`
confirm this distinction. Its vendored React is outside `npm ls`; a single npm
React resolution does not prove a single React implementation across Next's
server/client compilation layers. Do not override those aliases. React 19
declarations/types adoption remains separate work in #98; browser compatibility
must be checked against the actual production build.

ESLint uses the pinned Next flat configuration with web-vitals and Hooks rules.
Hooks correctness and explicit `any` are errors. Compiler recommendations and
historic legacy findings are visible warnings. `scripts/lint-baseline.json`
records counts per file/rule; the command fails on any increase or error.
Renamed/removed code does not receive a new allowance. The seven existing feature
coupling edges in `architecture-baseline.json` are owned by frontend maintainers
and should be retired during #103. There are no source cycles in that baseline.
Baseline files are reviewed debt records, never generated automatically in CI.

### Adding a feature

Follow the catalog's route → typed view → semantic message → interaction test
structure. A data feature additionally defines a small domain SDK method with
an `unknown` wire response, validates its DTO before use, and consumes a query
key from `services/queryClient.ts`. Use QueryClient cancellation signals and a
workspace-scoped key. API methods accept Axios cancellation and have a 15-second
default timeout; override deliberately for long uploads/AI tasks. The error
adapter preserves status, server code and Retry-After. Writes never retry or
redirect inside interceptors. Query cache/provider identity includes user, role,
account type and workspace; invalidation removes private observers immediately.

## Tokens, typography and theme

`styles/tokens.css` owns product values. Independent `--product-text-*`,
`--product-radius-*`, `--product-shadow-*` and `--product-container-*` tokens are
mapped through Tailwind 4 `@theme inline`. Public old CSS names are aliases to
those values; none points back to itself. Text sizes sm/base/lg are 13/14/16px,
with 1.6 body line height; radius-lg is 14px and shadow-md follows the theme.
Spacing is a 4px scale, breakpoints use rem, and motion durations are 120/200/320ms
with reduced-motion overrides. Self-hosted Noto Sans Arabic and Noto Sans WOFF2 variable
fonts support real weights 100–900, use independent Next variables, and ship with
their OFL licenses. No browser request to Google Fonts is needed.

Use surface and foreground pairs instead of literal colors. Brand/platform and
module accents retain their identity for decoration and chart series. Text links,
status text, destructive foreground, control borders and focus rings have separate
contrast-bearing tokens. Charts must also identify series by labels/shape; a
decorative accent is not a foreground-text accessibility guarantee. Disabled
controls are explicitly exempt from contrast requirements. The browser contract
suite measures normal text/status combinations at 4.5:1 and focus/control borders
at 3:1 in both themes; recorded evidence lives alongside the screenshots.

Layer scale: base 1, sticky 80, backdrop 100, modal/sheet 200, popover/select 300,
toast 400. Dialogs, selects, dropdowns and Sonner use this scale. Theme uses a
`theme=light|dark|system` cookie and the matching local preference. The root sets
`data-theme` and `.dark`; Tailwind `dark:` follows `data-theme`. A system media
query covers JavaScript-disabled first paint, and `useSyncExternalStore` follows
OS changes. The pre-paint script reads only server-provided theme preference.

Migration inventory: remaining shell `!important` layout bridges in tailwind.css,
feature-local inline colors and CSS aliases (`--bg`, `--surface`, `--blue`,
`--sidebar-*`) belong to #103. Retire aliases only after that issue's file-family
migration and reference search. Shared surfaces, popovers and theme scales already
use canonical values; wholesale page redesign is outside these contracts.

## Data-state contract

Collections use the shared `DataState` primitive for eight distinct conditions:
initial loading, background refresh, first-use empty, filtered no-results, load
error, offline, forbidden and partial failure. Empty and no-results are separate
because their recovery actions differ: empty starts creation, while no-results
clears or changes filters. Error and forbidden notices are assertive alerts;
other updates are polite status announcements. Decorative state icons stay out
of the accessibility tree.

Background refresh, offline and partial failure preserve already loaded content.
Initial loading and terminal empty/error/forbidden states replace it. A mutation
that partially succeeds must identify successful and failed destinations rather
than collapsing the whole operation into a generic error. Feature-owned copy and
actions are passed into the primitive as semantic messages; the primitive owns
only layout, roles and continuity behavior. The `/design-system` catalog is the
reference for both languages and themes.

## Locale ADR

Use maintained `next-intl` for semantic messages and ICU interpolation/plurals,
and native Intl for numbers, currency, dates and relative time. Account shells
choose locale per request from `socialstats.language=fa|en`, defaulting to fa.
Public routes, including auth, token-based pages and 404s, always use Persian/RTL;
`i18n/public-routes.ts` defines this boundary and the Next proxy supplies the
server locale override. Public navigation preserves the saved account preference
so entering an account shell restores its language. The effective route locale
initializes HTML lang/dir and client context. Server code always passes that
locale; it has no mutable locale singleton. Account language switching writes
the cookie and refreshes the native router, preserving
pathname, valid query filters and fragments. LocalStorage is only a compatibility
mirror; it cannot override a request's SSR locale after hydration.

Existing URLs preserve the reviewed route/alias inventory. Public English routes
would require a separate canonical/redirect/SEO plan. Preference-dependent HTML
is dynamically rendered with no-store, so account locale, theme and session hints
cannot share a prerender cache.
This deliberately changes the static-page cache expectation from #109; static
assets and fonts remain immutable. Never cache the root HTML at a CDN independently
of these preferences. The cookie contract takes priority over untrusted browser
language detection and over the old module-level locale state.

Semantic dictionaries have identical checked key sets and ICU placeholders/plural
arguments. `MessageKey` is the new-code API. Legacy raw-copy translation remains
in `i18n/legacy.js` and `fa-extra.js`, plus compatibility localization inside old
primitives. `scripts/i18n-baseline.json` inventories raw JSX/attribute/notification
candidates across JS, JSX, TS and TSX. It is explicitly **not** a count of fully
translated UI. New raw text fails CI; retire those entries and hidden primitive
translation by feature in #103/#106. Untranslated legacy prose still falls back
to its original language. Public route metadata uses the authored Persian titles
and the root `Ravinta` title template; private legacy metadata can retain English
titles. The design-system catalog has a local fa/en specimen selector; it does
not change the public document locale or the account preference. New semantic
surfaces never display keys as fallback copy.

Display dates use the Persian calendar for fa and Gregorian for en; default
display timezone is UTC, with explicit workspace timezone overrides. Scheduling
and API ISO timestamps are untouched. `formatTimeAgo` uses RelativeTimeFormat for
both past and future values. Use CSS logical properties and `<bdi>`/bidi isolation
for email, URL, code and identifiers.

## Session/API ADR

Django remains the identity/authorization authority. Browsers use its opaque
database session cookie (HttpOnly, SameSite=Lax, Secure in HTTPS configuration),
not browser-readable JWTs. Its expiry is `SESSION_COOKIE_AGE`; there is no browser
refresh credential to coordinate or replay. UserSession records now track browser
session IDs as well as native JWT JTIs, so session revoke-all, password reset,
logout and account disablement remain enforceable. WebSocket cookies are validated
against the same records, require trusted browser Origin, and re-check revocation
before pings/events. Native JWT websocket/API compatibility remains available.

`X-Browser-Session: 1` selects a response contract; it grants no authority.
Token-issuing password/MFA/signup/invitation flows exchange their internal token
pair for the opaque session and remove that pair before browser serialization.
MFA challenges remain in Django's session, retaining their signed five-minute
TTL and per-challenge rate limit. The browser sees only the non-sensitive `session`
marker. Social/OIDC callbacks create a cookie session and never carry application
credentials in redirect URLs. Their one-use OAuth state checks remain intact.

GET `/api/auth/session/` bootstraps CSRF. Browser mutations, including anonymous
login, are checked for CSRF token and Origin; POST/DELETE session operations also
require CSRF without the response-contract header. Login rotates CSRF; the SDK
reads the current cookie on every mutation. Preserve Host (including a nondefault
port) through nginx so Django's Origin comparison sees the browser's origin.

Existing localStorage refresh tokens are accepted once at POST `/auth/session/`,
blacklisted, and replaced with the cookie; no new browser JWT is written. Migration
is shared per tab and serialized with Web Locks across supported tabs. Temporary
failure preserves the legacy credential for retry. Definitive rejection removes
retired credentials. Rollback must keep Django session authentication enabled or
force re-login; do not restore browser-readable tokens from the opaque cookie.

Session states are initializing/authenticated/anonymous/unavailable. Network and
5xx bootstrap failures hide private data and provide retry without revoking the
cookie; definitive 401 clears private state. Generation checks reject late `/me`
results after logout, and transport identity epochs prevent an old request's 401
from clearing a newer account. Account changes/logout broadcast only timestamps,
never credentials. Cache/realtime ownership follows the resolved identity.
Internal returnTo values reject external, protocol-relative, control-character
and backslash destinations. Unknown role/account/workspace payloads fail closed.

The server-only DAL validates `/me` with a cookie-only no-store fetch and a
request-scoped React cache. Protected server layouts enforce resolved roles;
legacy migration and outages fall through only to a client loading/recovery
boundary. Future private server fetches must use `requireServerSession` and
re-check resource authorization in Django. HTML/RSC receives a minimal identity,
never cookie values. Client guards do not replace API workspace isolation.

No generic BFF is introduced: Django owns the session and existing ingress already
forwards API/media/WS. In dev and Next production/standalone, rewrites are fixed at
build time from NEXT_BACKEND_URL (default localhost:8000); the server DAL reads
that variable at runtime. Startup instrumentation reports a build/runtime destination mismatch without
logging the destination. Rebuild if you change the rewrite destination. Next
trailing-slash normalization is disabled so Django API and WebSocket paths arrive
unchanged; public metadata retains canonical paths. Unified
nginx sends API/WS directly to Django and media from the mounted directory. The
proxy suite checks statuses 401/403/404/429/5xx, headers, Set-Cookie, redirects,
multipart/download bytes and WS upgrades against an isolated fake upstream.
The full-stack browser and Django tests cover actual authorization separately.

For HTTPS production set SESSION_COOKIE_SECURE/CSRF_COOKIE_SECURE true and forward
the trusted scheme. The HTTP self-hosting example deliberately uses false. Do
not configure a cross-origin browser API URL for the same-origin session design;
use the existing ingress. `CSRF_TRUSTED_ORIGINS` is only needed when the deployed
trusted origin differs from Django's normalized request host, not to permit
arbitrary sites.

Reply inputs in Unified Inbox and WhatsApp belong to the selected conversation.
Changing the selection (including WhatsApp's mobile Back action) starts a fresh
reply; unsent replies are cleared. Stale thread responses and sends cannot
overwrite the newly selected conversation. A failed queue Add item keeps its
modal and text available for retry; pending submission disables edits and dismissal.

Contact currently directs visitors to this repository's GitHub issue channel.
It has no local message submission or receipt; it does not promise a response time.

Composer recovery uses tab-scoped session storage, keyed by user, workspace and
post. Internal navigation, Back and reload recover unsaved editor content;
workspace changes mount an independent editor. Successful server saves remove the
recovery entry. Closing the tab ends this local recovery; unavailable browser
storage falls back to the before-unload warning.

Login return destinations carry internal path and query through both guards.
Fragments are captured by the client guard or inherited across the server
redirect and appended by Login. Return destinations are validated against origin
and role before navigation; resource authorization remains in Django.

Notification settings and the end-user matrix use the same
`GET/PUT /api/notifications/preferences/` contract: flat channel booleans on GET,
`{matrix: [{event_type, channel, enabled}]}` on PUT, followed by GET for the
canonical saved state. Webhook subscriptions remain unavailable until a server
registration and delivery API exists. Status shows only health response data;
missing monitoring history and incidents are explicitly unavailable.

Queue detail includes `items_list`, ordered by `sort_order` and ID, within the
existing tenant-scoped authorization. The queue UI displays waiting items and
persists keyboard-accessible up/down changes through the existing reorder API.

### Composer editor and recovery

Composer consumes Connected Accounts registry metadata and the publishing-mode
contract; provider colors have no effect on capability or readiness. Selection
is explicit, supports multiple accounts, and incompatibilities stay visible
without removing accounts or transforming content. The existing Page, PageHeader,
Editor primitives, query client, HTTP client and DataState contracts are reused.
Composer disables sticky PageHeader behavior so mobile controls remain reachable.

Editor hydration occurs once per user/workspace/post. Background refresh updates
publication results without replacing editor input. Failed save/upload/commands
retain text, ordered media, captions and account/destination choices in scoped
tab recovery storage; session invalidation clears those entries. In-flight writes
are locked and stale responses after scope changes cannot update the new editor.
A denied workspace/post refresh hides cached identities and editor content.
Draft save can retry the same local idempotency key. A command with a transport or
5xx outcome becomes ambiguous and offers a status read, never automatic replay.
Queued acceptance is explicitly distinguished from provider success. Account
permissions and known constraints disable incompatible delivery; the backend
always remains authoritative. Datetime input uses the browser timezone and sends
an ISO instant; changing Persian/English display does not reinterpret that instant.

Stage-5 evidence lives in `frontend/e2e/evidence/stage5/`. Browser fixtures cover
Persian/English, RTL/LTR, light/dark/system and mobile/tablet/desktop, keyboard
submission, error focus and preservation, safe save retry, ambiguous publication,
and non-UTC scheduling. Providers use mocked transports; these checks do not
certify live credentials, permissions or provider behavior.

### Page gutters

Feature pages using `PageHeader` must place both the header and content inside
one page container: `Page` or `app-page app-page--content` with the appropriate
width modifier. The standard content gutter is 32px on desktop, 16px on tablets and 12px on narrow
phones. Avoid a root with only bottom padding or a separate horizontal inset on
the body: those leave the header against the shell or double the body gutter.
The same container applies in RTL and LTR. `e2e/page-gutters.spec.js` checks
posts, queues, media and automations at desktop/mobile widths in both languages.
