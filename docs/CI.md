# CI test policy

The `Tests` workflow always starts and reports the existing
`Frontend — build + Jest tests` gate. Job-level change selection avoids leaving
a required check pending when a PR only changes documentation. This gate fails
if selection fails, a required frontend job fails, or it is unexpectedly skipped.
The existing backend and Docker check names are retained. No branch protection,
security scan, dependency version or image-publication setting is changed.

## Which checks run?

| Change/event | Source checks, build and full Jest | Django | Docker integration | Browser suite through nginx |
| --- | --- | --- | --- | --- |
| PR: docs, README, archived frontend only | Skip | Skip | Skip | Skip |
| PR: frontend feature, style or public asset | Once | Skip | Run | Smoke |
| PR: frontend identity, routing, shared SDK, settings, marketplace, dependencies, test tooling | Once | Skip | Run | Full |
| PR: backend | Skip unless frontend also changed | Run | Run | Full |
| PR: CI, Docker, scripts, env or unknown root file | Once | Run | Run | Full |
| Push to main/develop, daily schedule, manual run | Once | Run | Run | Full |

`scripts/ci_changes.py` compares the complete PR base/head diff, including deletions
and both sides of renames. Unknown paths and unavailable revisions select every
check. Update its tests when introducing another shared runtime directory.
Source checks include dependency consistency, Next independence, ESLint,
architecture, locale strings, TypeScript and API/WebSocket proxy contracts.
Jest remains complete: its measured runtime did not justify affected-test selection.

The native Next build runs the browser smoke suite once. The unified Docker stack
runs the same smoke tests for ordinary frontend PRs, and the complete browser suite
for high-risk PRs and full runs. The Docker job retains the real browser-session
check, CSRF/session authorization integration, nginx routing, writable runtime
paths, process supervision and health checks. Mocked browser API fixtures do not
replace those real integration checks.

Full browser coverage runs once per workflow through the production ingress,
rather than also running it in two native Next shards. No test is removed.
Platform-specific visual snapshots remain an explicit `npm run test:visual` task.
Ordinary frontend PRs can therefore reveal a regression outside smoke only after
merge; changes to critical shared paths still run full browser coverage before merge.

## Browser smoke and local commands

Existing tests tagged `@smoke` cover assets, SSR/RTL hydration, public navigation,
anonymous/staff/client guards, MFA handoff, language/theme, session outage/retry,
workspace scoping, publication capability, denied-workspace editor data and queue
failure/retry for both client and superadmin. There are initially 13 tests in four
files. Keep this selection small and meaningful; the full suite still discovers
the tagged tests normally.

From `frontend/`, using Node 20.19.5 and npm 10.8.2:

```sh
npm ci --prefer-offline --no-audit --no-fund
npm run check:dependencies
CI=true npm test
npm run build
npx playwright install --with-deps chromium
CI=true npm run test:next:smoke
# Full browser suite against Next, or use E2E_BASE_URL for a running Docker stack:
CI=true npm run test:next
```

Chromium binaries are cached by OS, architecture and the exact lockfile hash.
`playwright install --with-deps chromium` always runs: it installs Linux system
dependencies even when the binary is cached. A cold cache still downloads Chromium;
`npm ci` still installs the locked packages. Failure traces are uploaded for seven
days. Production build output and node_modules are not reused across revisions.

The daily full run is at 02:00 UTC (05:30 Tehran). Event-specific concurrency groups
prevent a push from cancelling the nightly/manual run; new commits cancel obsolete
runs within the same event/ref.

## Baseline and verification

On the successful main run
[37997964643](https://github.com/jaavid/social-media-manager/actions/runs/37997964643),
Docker took 875 seconds, including 585 seconds in the browser parity step. Native
shards took 440 and 420 seconds and each repeated npm installation, source checks,
production build and all Jest tests (26 and 21 seconds respectively).

This policy targets repeated build/check work and browser matrix duration. Compare
warm-cache runs with similar change categories after merge; these baseline timings
are evidence of the old duplication, not a promised duration for the new workflow.
