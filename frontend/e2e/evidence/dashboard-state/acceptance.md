# Dashboard acceptance follow-up to merged PR #225

## Scope and inspected state

On 2026-10-27, fetched `origin/main` at
`6811f5b9ba3392f0f4998568d3d6571ae90d2f28` (the merge of #225).
The only open PR was #7, the separate dependency upgrade. Read root/frontend
AGENTS.md, #214/#106/#215/#218 and their progress comments, #225 review and
its original evidence report. No menu or onboarding work from #216/#217 is included.
No application runtime, API, permissions, translations or baseline changes.

## Failure attribution

| Failure | Evidence and cause | Correction |
| --- | --- | --- |
| Two fa/en backlog dashboard headings | Reproduced on main. #225 intentionally replaced the greeting with “Your dashboard” / «داشبورد شما». The test also returned `[]` for the summary, allowing a title-only check to accept a failed summary. | Match the intentional title; intercept GET `/end-user/me/` with user 1/workspace 7 and valid relation counts; require the workspace, scoped connections link, localized counts, no alert, lang/dir, existing navigation and unavailable Billing. |
| Four legacy desktop `.ds-whats-new` checks | Reproduced on main and on a fresh production build of pre-#225 `41370e1`: all four desktop cases reached the missing-element assertion. Commit `44956f5c62530f1c8b6e2b077b4c292ad6e8e11f` removed the changelog destination and its link before #225. Neither TopBar nor this legacy test changed between pre-#225 `41370e1` and current main. This is an obsolete expectation, not a dashboard runtime regression, fixture error or race. | Preserve breadcrumb, compact numbers, palette, mobile navigation and direction checks. Replace the dead-link expectation with localized language selection and actual theme switching/restoration at all 12 matrix points; assert no link to the retired changelog. |
| Dashboard fixture with trailing slash | Reproduced recovery failure with `E2E_BASE_URL=http://127.0.0.1:3000/` before correction: same-origin auth requests received external-request 202 fixtures. Review comment is valid on current main. | Parse configured origin with `new URL(...).origin`; retain the external-response branch and product-write collection/assertions. |

The supplied [PR run 40459773402](https://github.com/jaavid/social-media-manager/actions/runs/40459773402)
ran head `cdd9c13af80b8c895fd7ee0aba08ff4d3bcceca7`: Docker browser parity
had **753 passed / 6 failed**, while frontend contracts passed. The latest main
Tests run inspected at start, [40468193275](https://github.com/jaavid/social-media-manager/actions/runs/40468193275),
on merge `6811f5b`, had the same six failures and 753 passes. The stack boot,
privilege, observability and routing steps passed; the browser parity step failed.
Later integration-session/seed/runtime steps were consequently not executed.
The latest overall main run was Security scans 40474839588 (failure); this test-only
follow-up does not claim to repair or validate that separate workflow.

Search of active source and e2e consumers found the old dashboard greeting only
in the two backlog assertions; `fa-extra.js` retains a generic “Hi,” translation,
not a dashboard consumer. Other `/u` tests assert redirects or connection behavior
and do not consume the replaced dashboard contract. Historical screenshots and
#225's immutable evidence were retained.

## Validation

All local commands use Node 20.19.5 /
npm 10.8.2. Browser API responses are synthetic/intercepted; these checks do not
establish live provider behavior, user-research outcomes or full accessibility.

| Execution | Observed result |
| --- | --- |
| Main before changes, six failing cases | 6 failed at the reported greeting / missing-element assertions. |
| Pre-#225 production build/start on port 3001; original legacy tests, `--grep 1440` | 4 failed, all on `.ds-whats-new`, after earlier calendar/palette/breadcrumb assertions passed. |
| Before origin fix, dashboard recovery with trailing-slash base URL | 1 failed: auth received the external 202 fixture and the dashboard alert was absent. |
| Direct production Next on port 3000, all three changed specs with trailing-slash URL, two workers | **50 passed** (6.8m): 14 dashboard, 24 backlog, 12 legacy matrix cases. |
| Fresh production build of final application source | Passed. |
| Fresh direct production build/start, browser smoke with trailing-slash URL | **16 passed** (55.8s). |
| Docker unified ingress on port 3002, trailing-slash URL, dashboard + main routes + full legacy matrix | **28 passed** (1.4m). |
| Docker health, Next/Django routing, runtime privilege checks, nginx config and supervised processes | Passed; health 200, processes RUNNING as 999:999 without capabilities. |
| Full Jest, repeated without concurrent test/build workloads | **96 suites / 532 tests passed** (47.174s). |
| Dependency contract, TypeScript, i18n, Next independence, architecture, lint and API/WS proxy | Passed; zero increases in baselines. |

Local Chromium is `/usr/bin/chromium`; an uncommitted config wrapper overrides
only its executable path, absolute test directory and server startup (servers are
started explicitly). Timeouts, retries and assertions are unchanged. The first
Jest run overlapped two builds, lint and browser tests on a 2-CPU runner: five
5-second timeouts in the unchanged Primitives, QueueManagerPage and BotFlowEditorPage
suites (527 passed / 5 failed). This result is retained, not presented as green.
The subsequent run without concurrent test/build workloads passed **96 suites / 532 tests** in **47.174s**, including all three affected suites. The same files are unchanged from main; main CI also passed Jest. No timeout or assertion was changed to obtain this result.
The Docker image was built from the repository Dockerfile with the session CA mounted as a build secret, using isolated synthetic configuration and project/volumes. Runtime image ID: `sha256:ee1300277663ba29d7880579cebcc046f14cc6b767ebe853fd4076c7c493855d`.
The direct dashboard WebSocket proxy reports connection refused without a Django
server; summary HTTP responses in browser tests are intercepted. This is not a
provider/integrated backend acceptance claim.

## Reproduction

With the project's pinned Node/npm and Chromium installed for Playwright:

```sh
cd frontend
npm run build
npm start
# In a second terminal:
E2E_BASE_URL=http://127.0.0.1:3000/ npx playwright test \
  e2e/dashboard-state.spec.js e2e/frontend-bug-backlog.spec.js \
  e2e/legacy-review-localization.spec.js --workers=2
E2E_BASE_URL=http://127.0.0.1:3000/ npm run test:next:smoke
```

For ingress, build the repository Dockerfile and run its Compose stack with fresh
synthetic configuration and isolated project/volumes with `APP_PORT=3002`
(e.g. `APP_PORT=3002 docker compose -p dashboard-acceptance up -d`) so the
Compose ingress binds port 3002. Wait for
`/healthz` to return 200. Run the same three specs with
`E2E_BASE_URL=http://127.0.0.1:3002/` and
`--grep 'dashboard states|dashboard recovery|foreign workspace|main routes|legacy review'`.
This selects the 28 dashboard/localization cases, not the unrelated backlog cases.
The pre-#225 comparison uses a detached `41370e1` worktree, its own production
build on port 3001, and the unchanged legacy spec with `--grep 1440`.
Its dependency lockfile is identical to current main; installed dependencies were
shared through a local symlink. No baseline source was edited.

The full 759-case browser suite is not claimed as a local result. The PR's external
Tests workflow selects full ingress browser coverage for e2e changes; its observed
head and status are recorded in the PR discussion. Local results above do not
substitute for that external run. Backend tests were not run locally: no backend
code changed. The Docker checks use the real stack for rendering/routing, but the
browser summary/user fixtures remain synthetic.

## Remaining acceptance

#225 is merged; this follow-up stabilizes only its test/acceptance package.
#214/#106/#215/#218 remain open for their broader criteria: marketplace/gap matrix,
other flows and copy, integrated role evidence, representative-user studies and
complete accessibility acceptance. Menu redesign (#216) and onboarding (#217)
are outside this PR. Rollback is a revert of this test-only follow-up; no schema,
API, permissions or persistent application data changes are involved.
