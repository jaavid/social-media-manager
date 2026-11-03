# UI-STATE-001 (#106) — runtime coverage and closure ledger

Date: 2026-11-03. This is a *source/test inventory*, not evidence of executing every test today. Workflows must be checked on the final PR head before claiming acceptance.

## Verified implementation mapping

| Gap family | Current implementation | Executable regression evidence | Status and remaining validation |
| --- | --- | --- | --- |
| End-user dashboard `/u` | `EndUserDashboard.jsx` distinguishes pending/read failure/empty/scope mismatch/unknown stats; abort-aware identity-keyed GET | `EndUserDashboard.test.jsx`; `e2e/dashboard-state.spec.js` (fa/en, light/dark, 360/768/1440, failure→retry/focus) | Code present; existing screenshots are historical until fresh replay |
| Public marketplace `/marketplace` and agency browse | `MarketplacePage.jsx` uses filter-keyed abortable GET, a distinct error screen, safe retry, previous-result stale indication | `MarketplacePage.test.jsx`; `e2e/marketplace-recovery.spec.js` | This PR fixes 404 on a refresh with cached rows (no longer show removed agency as stale); dedicated Jest + browser regressions |
| Staff dashboard/report/editor | Shared `DataState` and scoped data readers | `e2e/stage6-state-contracts.spec.js` | Existing tests span 403/404/429/5xx, offline, write ambiguity and role differences; current-run execution not yet verified |
| Posts, OAuth connections, shared lookups | Localized region recovery, scoped queries | `e2e/auxiliary-reader-recovery.spec.js` | Existing tests include malformed data, abort and stale reads |
| Sync logs and sessions | DataState, isolated mutation tracking | `e2e/state-recovery-remaining.spec.js` | Existing tests include denied reads, no mutation replay, keyboard focus and private scope |
| Composer helper/editor | Local read/write feedback | `e2e/composer-reader-recovery.spec.js`, `e2e/editor-helper-recovery.spec.js` | Need fresh CI evidence and checks that all relevant surfaces are included |

## Acceptance checklist against #106

- **HTTP vs empty:** Dashboard and Marketplace explicitly distinguish read failures from confirmed absence; marketplace stale 404 regression in this PR.
- **Scope/cancellation:** Dashboard identity/access key and Marketplace filter query key + AbortSignal are tested. Other families have focused E2E contracts; a cross-family identity matrix is not yet exhaustively attested.
- **Unsafe retry:** Marketplace retry invokes `list.refetch()` (GET); no replay of a create/update/delete. Other write paths should be verified by their existing contract tests.
- **Accessibility:** Focus-on-success is tested for dashboard and Marketplace. Full screen-reader, reduced-motion and live visual regression need fresh checks, not only the presence of `DataState`.
- **Outstanding:** Collect current CI/browser result references for the named families, attest any unsupported roles and produce the evidence required to close the broader issue. No assumption that a passing unit test alone closes #106.

The parent #214 and visual audit #253 remain separate. This ledger must be updated against current execution results before #106 can be closed.
