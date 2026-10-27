# Task navigation acceptance — #214 / #216 / #218 / #215

## Inspected baseline (before implementation)

2026-10-27, main `fe70f762db00e44f9513d462665515ae5636029f` (merged #226).
Root/frontend AGENTS, CONTRIBUTING, current issues #214–#218 and comments,
ACCESS, shells, URL compatibility, Protected/server guards, session permissions,
workspace scope, connections metadata and approval/activity APIs were read.
Only open PR: #7, dependency upgrades; no overlapping menu work.
Merge CI [40491157823](https://github.com/jaavid/social-media-manager/actions/runs/40491157823)
passed frontend/Jest, production contracts, backend and Docker; Security
[40491157855](https://github.com/jaavid/social-media-manager/actions/runs/40491157855)
and unified image [40491157817](https://github.com/jaavid/social-media-manager/actions/runs/40491157817)
also passed. Dashboard #225/#226 implementation is retained.

## Role × capability × path × guard/permission × readiness

This table precedes implementation. Roles are scenarios, never client-side grants.
`auth/me.permissions` is a **legacy global** map, not the workspace evaluator's
result. Organization owner/admin is not workspace content access. Connection
account permissions are effective but do not expose every operation (notably draft
creation/approval); do not infer missing grants or organization names.

| Role/scenario | Capability | Existing path | Guard / actual access source | Ready / menu treatment |
| --- | --- | --- | --- | --- |
| End-user workspace owner | overview | `/u` | client + end_user; `/end-user/me` default workspace | Ready; preserve dashboard states |
| Owner, invited designer, approver | calendar | `/u/calendar?workspace=ID` | client + end_user; server-listed workspace; calendar API scoped queryset, source permissions evaluated per account | Ready; selection required, not a grant to publish |
| All end-user roles | create post / posts / messages / analytics | `/u/composer`, `/u/posts`, `/u/inbox`, `/u/analytics` | No delivered `/u` page; existing comingSoon flags | Unavailable in this interface, secondary non-link explanation for everyone |
| Owner, limited member, approver | reports | no `/u/reports` | No delivered end-user report page | Unavailable; no redirect to another shell invented |
| Owner / invited member | organizations/team | `/u/organizations` | client + end_user; organization APIs enforce membership, admin/owner for writes | Ready; entry includes invitations and accessible workspaces; no management promise |
| Owner / invited designer | social connections | `/u/connections?workspace=ID` | accessible workspace + connections API; connect/disconnect permission evaluated per account | Ready for reading server-filtered connection metadata; writes remain backend gated |
| Owner / approver / requester | approval requests | `/u/approvals` | `_accessible_qs`; delegated approve_posts, owner, agency or own requests; decision rechecks authorization | Ready, **all accessible workspaces**, not active-workspace badge |
| Owner / agency | activity | `/u/activity` | activity API visible workspace IDs (owner/legacy client/agency); no general member-policy inclusion | Ready as account-wide feed; not claimed as selected-workspace activity |
| Owner / member | agency/discovery/notifications | `/u/agency`, `/u/agency/find`, `/u/notifications` | existing end_user route + resource-specific API checks | Ready account-level destinations; mutation controls unchanged |
| All end-user roles | settings / billing | `/u/settings`, `/u/billing` | no delivered page | Secondary unavailable text, no links |
| Legacy/agency with assigned workspace | create/open post | `/dashboard/composer?workspace=ID` (alias `/dashboard/analytics/composer`) | client shell; composer.view discovery; API evaluates view_posts/draft_posts/publish_posts per account | Ready destination; no permission to publish inferred |
| Agency designer | posts/drafts | same composer; `/dashboard/posts` | explicit legacy grant for discovery; server effective workspace/account policy remains final | Ready only with disclosed grant; preset alone never activates menu |
| Agency approver | approvals | `/dashboard/approvals` | composer.approve discovery; approval API evaluator, self-approval forbidden | Ready with grant; request list spans accessible workspaces |
| Multi-brand agency | inbox | `/dashboard/inbox?workspace=ID` | inbox.view discovery; connections view_inbox + provider inbox/comments/reviews; API evaluator | Ready with grant; reply separately authorized |
| Multi-brand agency / analyst | reports | `/dashboard/reports?workspace=ID` | reports.view discovery; API generate_reports + view_analytics/account scope | Ready with grant; report generation not implied by menu |
| Staff/superadmin | equivalent tools | `/admin/analytics/*`; admin-only management `/admin/*` | staff/superadmin route family, permission gate + API scope | Existing ready tools retained; client shell must not advertise admin-only destinations |
| Any role | ads/webhooks/future tools | existing disabled descriptors | no readiness proof | Secondary unavailable information; no daily navigation links |

### Code findings (not runtime observations)

1. Analytics sidebar includes publishing, inbox and management; mobile tabs and
   palette have separate unguarded destination lists. Palette workspace entries
   always point at `/admin/workspace/ID`, including client sessions.
2. End-user main navigation mixes unbuilt pages with daily tasks. Its polling
   approval count is global and survives workspace changes.
3. TopBar derives the displayed workspace from account/name or the first array
   element, rather than resolved workspace scope. These are not proof of context.
4. `/u/calendar` and connections support explicit workspace; `/u` summary describes
   only the default. Approval/activity pages are account-wide and ignore workspace.

### Design hypotheses (pending human research)

Five task groups and consistent names should improve discovery. A named context
from server-listed workspace metadata, explicit selection link and separate future
features should reduce mistaken assumptions. No task-time or success improvement
has been measured. Representative tree/task testing (5–8 users, owner/invited
cohorts) remains pending; controlled walkthroughs cannot complete #216's human
acceptance criterion.

### Compatibility follow-up for #217

Organization/team selection is the existing start route; legacy onboarding is not
redesigned. End-user draft/inbox/report pages remain undelivered even though the
client shell has implementations. Session permissions do not expose per-workspace
preset capabilities and organization context is not returned in the default
summary. Product/backend must settle this contract before any future activation.

## Implemented structure and conservative access

Desktop/sidebar, mobile tabs/drawer and palette now use the same extracted
existing descriptors, with five task groups: Overview; Content & publishing;
Messages; Analytics & reports; Management. The module is “Workspace tools”, not
“Analytics”. URLs, aliases, backend authorization and schema are unchanged.

Core agency discovery now intersects the explicit legacy session permission with
validated **current-workspace** connection-account permissions: composer/posts
require `view_posts`, inbox `view_inbox`, analytics `view_analytics`, reports both
`view_analytics` and `generate_reports` on the same account. Unknown, failed,
foreign or late metadata never becomes a grant. This is conservative discovery,
not a complete authorization projection: the API does not expose draft/approval
permissions in connection metadata. Missing tools are explained; direct access
still reaches the existing page, whose backend checks remain authoritative.
No preset name or account type creates a grant. No new end-user capability was
activated. Existing provider health/constraints and operation-level permissions
remain enforced by the destination. A ready route is not a promise to publish.

Admin-only bot/leads entries are excluded from client shells even with an explicit
legacy grant. Palette quick actions are permission filtered. Search results use
existing delivered routes by result type rather than undelivered legacy `/admin`
detail links; contacts/conversations open their permitted list, not a fabricated
detail page. Recents resolve against the currently allowed catalog.

Workspace names come only from the server-listed accessible workspace matching
`useWorkspaceScope`. Unknown names are explicit; account names, first array
entries and organization authority are never substituted. All scoped tool links
carry the current ID. The selector preserves filters/hash and replaces path IDs
on admin workspace detail routes. `/u` links to existing organization/team
selection; its default-workspace dashboard remains unchanged. Approval requests
and activity stay explicitly **all accessible workspaces**; the misleading global
approval badge/poll is removed. Existing workspace-scoped agency badges retain
the scope-key contract.

## Fresh controlled observations and walkthrough

All data are synthetic/intercepted. Production Next and local Chromium are used;
these are not live-provider, integrated-backend or representative-user results.
The interactive Browser skill's required JS tool is not exposed in this session
(discovery returned none); no interactive Product Design audit is claimed.
Project Playwright is the available automated browser path. Product Design's
audit evidence rules guided separation of code, runtime and hypothesis evidence.

1. **Start / end-user menu — improved, limited capability.** Before: primary
   Posts/Composer/Inbox/Analytics show “Soon”, mixed-language organization label,
   no context name, account-wide approval count 12. After: named current workspace,
   selection entry, ready daily destinations, account-wide labels without badge;
   unavailable post/message/report tasks are secondary non-links. Dashboard
   #225 content and recovery semantics are retained. Example images:
   [before](before-end-user-fa-light-360.png),
   [after](after-end-user-fa-light-360.png).
2. **Agency composer / discovery — improved.** Before: “Analytics” container,
   guessed “Ravinta” context and all groups collapsed on short composer route.
   After: “Workspace tools”, actual server-listed brand and Content & publishing
   open with active Create post. Inbox/report visibility follows explicit current
   account grants. [Before](before-agency-en-light-1440.png),
   [after](after-agency-en-light-1440.png).
3. **Workspace switch — controlled pass.** Brand A→B updates name, link query,
   current state; old name disappears. Back/Forward/reload and Ctrl-click retain
   the selected scope. Deferred old metadata and denied refresh cannot restore
   old discovery grants. No organization name/role is invented.
4. **Mobile / keyboard — controlled pass.** End-user menu now reuses the shared
   Radix Drawer: focus stays inside, Escape restores trigger and navigation closes
   it. Persian RTL / English LTR, light/dark and 360/768/1440 renders were captured
   for both shells. All 48 images (24 before, 24 after) were inspected in contact
   sheets; representative originals were also opened. Screenshots establish
   visible states, not screen-reader or complete WCAG conformance.

Human tree/task study remains **pending**. No user task duration, unassisted
success rate or measured improvement is reported. #216 is deliberately left open.
Product/QA owns representative recruitment and seeded role walkthrough; backend/
product owns any future effective-capability projection. No individual assignment
is invented. Wider #214/#215/#218 remain open.

## Intentional test contract updates

The old “Content Calendar” palette-only label becomes “Calendar”, matching the
sidebar/mobile destination and task group; expected navigation now requires the
workspace query. Recent selection and close/runtime-error assertions remain.
Localization fixtures explicitly grant composer/calendar discovery instead of
assuming an empty permission map grants links. New cases check denied legacy and
effective-account grants. Old Analytics accessible names and “My workspace” are
updated to the intentional semantic names; localization/metrics/theme/direction,
notification writes and unavailable Billing assertions remain. No skip, retry,
timeout or baseline expansion was added.

The independent #226 documentation correction sets `APP_PORT=3002` in
`dashboard-state/acceptance.md` so Compose ingress matches the documented test
address. This does not change runtime deployment configuration.

## Validation and reproduction

Pinned Node **20.19.5**, npm **10.8.2**; Python **3.12.14**, Django **5.2.17**;
local Chromium **151.0.7922.173**. Production build/start, not a dev-server capture.

| Check | Result |
| --- | --- |
| Fresh baseline production build + controlled capture | 12 cases passed; 24 before images across two shells |
| Initial candidate production build + targeted browser package (navigation, dashboard, backlog, legacy localization, workspace layout, brand) | **92 passed**, 3.6 minutes; includes 23 new navigation cases and 24 after images |
| Full Jest | **98 suites / 543 passed** (38.609s); 49 focused navigation/scope/locale cases also passed during development |
| Existing backend authorization / team / calendar workspace reads | **34 passed**; SQLite test database, no production data; no backend source changed |
| TypeScript / dependency / Next independence / architecture / i18n / lint / API + WebSocket proxy | Passed; **0 increases** in baselines; lint 0 errors / 0 file-rule regressions; i18n 0 beyond baseline / 958 semantic keys |
| Active destination ownership | Every enabled descriptor in admin/client analytics/messaging is backed by an authored native page; admin-only entries excluded from client |
| `git diff --check` | Passed |

Before test updates, two end-user E2E assertions still wanted “My workspace” /
«فضای کاری من»; actual rendered output showed the intentional “Active workspace”
label. They were updated without dropping dashboard successful-body/count/scope,
lang/dir, action and Billing checks. Three pure localization Jest tests needed the
new discovery-hook dependency supplied in their existing mocked setup; effective
permission races have separate QueryClient-backed tests. An initial overlapping
capture invocation produced artifact-file collisions; the isolated baseline run
passed all 12 cases. These failures are not presented as product regressions or
final successes. No timeouts or assertions were weakened.

```sh
cd frontend
npm run build
npm start
# Separate terminal, with Playwright browsers installed:
NAV_EVIDENCE=e2e/evidence/task-navigation \
E2E_BASE_URL=http://127.0.0.1:3000/ npx playwright test \
  e2e/task-navigation.spec.js e2e/dashboard-state.spec.js \
  e2e/frontend-bug-backlog.spec.js e2e/legacy-review-localization.spec.js \
  e2e/workspace-navigation-layout.spec.js e2e/brand-rollout.spec.js --workers=2
CI=true npm test -- --runInBand
npm run typecheck
npm run i18n:check
npm run check:dependencies
npm run check:next
npm run check:architecture
npm run lint
npm run test:proxy
```

Local Playwright used an uncommitted config wrapper overriding only the executable
path `/usr/bin/chromium` and absolute test directory; timeout/retry/assertions were
unchanged. `DASHBOARD_CHROMIUM` is the existing optional executable override used
by dashboard and navigation evidence specs. `NAV_EVIDENCE` controls screenshot
output only, never assertions. Before captures used the baseline build and the
capture-only version of the test; after tests contain the behavioral assertions.
Replaying after assertions against baseline is intentionally not expected to pass.
The exact original PNGs and runtime-source hashes are in `manifest.json`.

```sh
cd backend
DB_NAME= SECRET_KEY=navigation-synthetic-local-test DEBUG=True \
.venv/bin/python manage.py test \
  social_stats.tests.test_unified_permission \
  social_stats.tests.test_organization_team \
  social_stats.tests.test_calendar_workspace_reads --verbosity=1
```

External head CI, full ingress browser and security results are recorded in the
PR discussion with their exact head SHA/run URLs. They are not substituted with
local synthetic-browser counts. Local Docker was not rerun for this frontend-only
change; the repository's unchanged CI selector owns the unified ingress run.
Rollback: revert the PR; no migration, API, backend authorization or persistent
data change is involved.

### CI checksum false positive

The first head `1914d6c` Security run `40496343942` flagged the manifest's
`useNavigationAccess.js` **source SHA-256** as `generic-api-key`, because the file
path was a JSON object key adjacent to the digest. The value was recomputed from
the source and matched exactly. The manifest now uses separate `file` / `sha256`
rows, preserving all checksums. Gitleaks 8.24.3 was rerun locally with redaction;
no scanner ignore, allowlist, baseline or workflow change was introduced. The
branch's own initial commit was amended so PR history does not retain the false
positive representation. Final CI results refer to the replacement head.

### Scope-consumer and smoke follow-up

On replacement head `8c0ea19`, external production contracts passed build/Jest/
i18n/lint/architecture but smoke had 14 pass / 2 fail: the editor recovery test
still selected the old mobile “Home” label, and the realtime workspace smoke
missed an active-workspace event after the new selector introduced a separate
URL navigation. The realtime test passed in isolation locally; a timing-independent
CI reproduction is not claimed. The selector now delegates to the **existing**
`useWorkspaceScope.selectWorkspace`: URL replacement when a workspace query is
present, identity-owned path selection otherwise. This restores the delivered
scope contract rather than adding a parallel selection/history mechanism. The
realtime/count/foreign-event assertions in `nx02-workspace-scope` are unchanged.
The editor test retains its denied-refresh/draft-privacy assertions and now has
an explicit Dashboard discovery grant and the shared “Dashboard” label.

A separate, confirmed consumer defect was found in `ReportsPage`: on a URL with
`workspace=8`, its request trace sent `/shared-reports/?workspace=7`, taking the
session default instead of URL scope. The page now consumes `useWorkspaceScope`
and keys its existing collection by that resolved ID. A behavioral test requires
first read 8 (never default 7), then read 7 after explicit selection. No endpoint,
parameter vocabulary, report-generation feature or backend authorization changed.

The four focused regressions (realtime scope, editor privacy, link/history scope,
and report request scope) passed on the follow-up build. A review also correctly
identified overlapping active states on `/u/agency/find`; My agency now uses an
exact match and a separate test requires exactly one current destination.
The review's suggested Messaging gate discrepancy did not match the current
catalog: `inbox.view` belongs to unified inbox, while Messaging uses WhatsApp/bot
permissions; both discovery paths evaluate those identically. A negative
scenario verifies a unified-inbox grant cannot advertise the WhatsApp module.

The completed ingress run on `8c0ea19` had **775 pass / 7 fail**. Besides the
old Home selector, it exposed duplicate connection reads: discovery used a
parallel cache key while ConnectedAccounts used `QK.connections`. Discovery now
shares that delivered query and its retry/error state; identity isolation remains
owned by SessionProviders. The existing connected-account test still requires
loading → failure → explicit retry → stale refresh and **exactly three** reads.
The other failures were obsolete identity/focus consumers: account identity is
now read from the actual account menu (not a guessed workspace subtitle), and
the typography focus fixture explicitly grants its real Dashboard tab. Their
cross-tab identity/logout, credential, focus/viewport and typography assertions
remain. A zero-grant mobile primary menu now renders no empty landmark.

Final local follow-up: fresh production build, **25 navigation cases passed**
(including report request scope and a single active agency destination), **543
Jest tests passed**, and lint/i18n/architecture stayed at zero baseline increases.
The refreshed 24 after captures replace the candidate images; all original before
captures are retained. The report consumer is included in the source manifest.

A separate **30-case** final run passed all 16 native smoke cases plus the slow
connection/retry/read-count regression, cross-tab account/logout regression and
all 12 active typography locale/theme/width cases. No retries, skips or timeouts
were added. The unchanged backend authorization/team/calendar package remains
34 passed.
