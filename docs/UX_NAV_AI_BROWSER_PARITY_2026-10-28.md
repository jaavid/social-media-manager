# UX navigation, AI draft and browser parity acceptance — 2026-10-28

Base: merged #232 on `main` at `039a5a1`. This batch is a targeted follow-up to #108, #216, #224; the two intermittently failing browser tests are tracked here. **CI evidence must be read from this PR's final head**, not an earlier or merged SHA.

## Root causes and corrective tests

| Area | Previous failure | Change | What still requires evidence |
| --- | --- | --- | --- |
| Workspace event scope | `nx02-workspace-scope` expected a toast while WebSocket transport and subscriber could still be settling/reconnecting; first captured endpoint could become stale | Keep a set of live fixture sockets, discard closed sockets, wait for actual selector value and scoped counts, repeat only synthetic *notification* after effects settle; no writes/replay | Repeat under CI load, inspect traces if still intermittent |
| Marketing contrast | `marketing-contrast` reported 1:1 for the “محصول” control; previous parser extracted `rgb()` digits only, failed CSS Color 4 and transparent backgrounds | Use Chromium canvas to convert computed CSS colors to rendered sRGB; composite ancestral transparent backgrounds, check gradient stops, retain 4.5:1 requirement | On failure inspect actual rendered foreground/background; do not skip contrast or lower threshold |
| AI compose | Incomplete/invalid payload, late response from former workspace, callback failure or rejected clipboard operation could be treated as success | Validate completed variants, invalidate requests on switch/close, scope results to workspace, never claim draft insertion until callback succeeds, await clipboard promise | Backend's additional streaming surfaces/long-running job status and real quota contract require separate per-tool verification |

## Route and task-family matrix for #108 / #216

| Route family | Shareable state | Private scope and permissions | Evidence/owner |
| --- | --- | --- | --- |
| Marketplace listing/detail | Public `q`, filters, sort, slug | No user tokens in URL, no inferred read authorization | `MarketplacePage.jsx`, `AgencyProfilePage.jsx`, `marketplace-recovery.spec.js` — existing; broader history/screenshot matrix still pending |
| Workspace list/detail | Explicit workspace ID in path or `workspace` query; no implicit “all” | `resolveWorkspace` checks server-listed non-default ID; backend enforces access | `useWorkspaceScope.test.jsx`, `nx02-workspace-scope.spec.js` — this PR stabilizes delivery |
| Inbox | Scoped `workspace`; server applies active account permission | No stale data from previous tenant, no implicit read grants | `navigationItems.test.js`, `task-navigation.spec.js` — full filter/history review pending |
| Reports | Scoped `workspace` and user-readable filters | No cross-workspace rows or unauthorized report downloads | `task-navigation.spec.js` reports-workspace read test — full hash/filter/share review pending |
| Composer drafts | Dynamic post ID and selected `workspace` | Draft insertion local only, no unauthorized publish | `navigation.test.jsx`, `task-navigation.spec.js`, `AIWriteButton.test.jsx` — broader editor migration pending |
| Public pages vs private shell | Public language contract unchanged; private app language preference unchanged | No token, session or content text in public navigation | `core/navigation.tsx`, `navigationItems.js` — browser locale audit is ongoing |

## Issue closure decisions

- **#108:** URL/navigation invariants documented; complete cross-family browser matrix (reload, modified click, hash, filter, dynamic ID, workspace switch, 320/360/768/1440 px, fa/en) still needs acceptance before closing.
- **#216:** Role-aware registry is already implemented and regression tested by #231/#232; 5–8 real-user tree/task tests and before/after results per role are required by #215. Synthetic Playwright is not a replacement for human task evidence.
- **#224:** AI Studio directs to a scoped composer. This PR fixes the concrete compose button unsafe-output/draft boundary. Other feature surfaces (reply, ideas, voice, insights, quotas, streaming and usage) still need contract-specific tests and copy review.

All changes are safe to revert; no provider capability added, no permission or billing policy relaxed, no auto-repeat of non-idempotent writes. This batch must not auto-close these parents until full acceptance evidence exists.

## CodeRabbit review hardening — PR #233

- A scoped AI request invalidated on dialog close previously kept the disabled state, and completed variants could reappear. Cleanup now clears loading and result state as well as invalidating pending requests; two targeted regression tests cover closing during an unresolved request and reopening after a completed proposal.
- Workspace notification test now sets a 90-second per-test deadline, retains stricter nested 15-second retry waits, and sends a rejected foreign-workspace event followed by a unique permitted sentinel through the same live socket. Observing that sentinel is required before checking that the rejected event did not produce a toast. The test still rejects any cross-workspace event.
