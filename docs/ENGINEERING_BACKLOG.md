# Engineering backlog

This is the temporary source of truth while GitHub Issues are disabled for the repository. Once Issues are enabled, each item should be mirrored to an issue and this document should link to those issues.

## Delivery rules

- Keep schema/auth/reliability work separate from visual-only refactors when possible.
- Merge 2–4 tightly related items into one deployable batch instead of deploying every small patch independently.
- Every batch must pass backend, frontend, Docker integration, and security CI before deploy.
- Preserve the UI modernization path: Vite + Tailwind/shadcn now, decomposition next, then route-by-route Next.js App Router migration.

## Batch A — runtime reliability and OAuth log safety

- [x] **REL-001** Register nonstandard Celery task modules so scheduled/event tasks are never discarded as unregistered.
- [x] **REL-002** Make the internal service-health probe return Django's response directly instead of an HTTPS redirect.
- [x] **SEC-001** Prevent OAuth `code`, `state`, tokens, and other query parameters from being persisted in HTTP access logs.
- [x] Add regression tests for the runtime configuration above.

## Batch B — auth readiness + Connected Accounts UX

- [ ] **AUTH-001** Serialize JWT refresh/retry and WebSocket reconnect so concurrent 401s trigger one refresh operation.
- [ ] **OPS-001** Expose OAuth/provider readiness to authenticated admins without exposing credential values.
- [ ] **UI-002A** Rebuild Settings → Connected Accounts with Tailwind/shadcn and explicit states: setup required, ready, connected, expired, error.
- [ ] **UI-002B** Show callback URI, required APIs/scopes, reconnect/disconnect actions, account identity, and last successful sync.

## Batch C — multi-account foundation

- [x] **ACC-001** Introduce `SocialAccount` as the public platform-account identity separate from secrets.
- [x] **ACC-002** Change `PlatformCredential` to belong to `SocialAccount` and remove the current one-account-per-platform-per-workspace constraint.
- [x] **ACC-003** Migrate existing credentials losslessly into SocialAccount rows.
- [x] **ACC-004** Update OAuth callbacks to upsert by `(workspace, platform, external_id)` instead of overwriting `(workspace, platform)`.
- [x] **ACC-005** Update publishers, sync jobs, inbox, analytics and status endpoints for multiple accounts.
- [ ] **UX-ACC-001** Add account selector/multi-select to composer, inbox, analytics and scheduling surfaces.

Target model:

```text
Organization
  └─ Workspace
       ├─ SocialAccount (Instagram A)
       │    └─ PlatformCredential
       ├─ SocialAccount (Instagram B)
       │    └─ PlatformCredential
       └─ SocialAccount (YouTube)
            └─ PlatformCredential
```

## Batch D — tenancy and authorization unification

- [ ] **TEN-001** Add/formalize Organization/Tenant ownership above workspaces.
- [ ] **TEN-002** Standardize product vocabulary from legacy `Client` to **Workspace** in APIs/UI; defer DB rename until safe.
- [ ] **RBAC-001** Unify legacy `UserProfile/StaffClientAssignment/UserPermission` authorization with marketplace `AgencyMembership/AgencyClientRelation` authorization.
- [ ] **RBAC-002** Define organization/workspace role presets while keeping granular permission overrides.
- [ ] **RBAC-003** Define approval defaults per role/action and expose them in team management.
- [ ] **RBAC-004** Add optional SocialAccount-level permission overrides after workspace RBAC is stable.

### Initial Atieh organization mapping

- Organization: `آهنگ آتیه`
- Workspaces: `مؤسسه آتیه`, `آتیه آنلاین`, `تأمین ۲۴`, `قلمرو رفاه`, `آتیه نو`
- Amin: owner/executive across all workspaces
- Saman: social-media manager across all workspaces
- Matin: senior editor across all workspaces
- Shadi: editor for Atieh Online
- Majid: editor for Tamin 24
- Saeedeh: editor for Ghalamro Refah
- Ali: editor for Atieh No

Role presets must be defaults, not hard-coded authorization; the underlying permission engine remains granular.

## Commercialization

- [ ] **BILL-001** Move subscription/entitlements to Organization level and define enforceable limits for workspaces, members, social accounts, storage/AI usage and premium capabilities.
- [ ] **BILL-002** Add billing-provider abstraction, trial state, invoices/payment status and plan lifecycle.
- [ ] **COMM-001** Separate self-serve organization ownership from agency-managed relationships cleanly.
- [ ] **COMM-002** Add invitations, verified-domain/SSO options, ownership transfer and offboarding.
- [ ] **COMM-003** Add tenant-safe audit export, retention controls and enterprise policy hooks.

## UI modernization → Next.js

Completed foundation:

- [x] **UI-000** CRA → Vite while preserving deployment behavior.
- [x] **UI-000A** Tailwind CSS v4 + shadcn-ready aliases/tokens.
- [x] **UI-000B** Modernized app shell/topbar/mobile navigation/workspace switcher.
- [x] **UI-000C** Migrated Button/Card/Badge primitives to Tailwind.

Next:

- [ ] **UI-001** Migrate core primitives: Input, Textarea, Select, Dialog, Sheet, DropdownMenu, Tabs, Tooltip, Table/DataTable, Skeleton, EmptyState, Toast/Sonner.
- [ ] **UI-002** Remove remaining shell/settings inline styles and migrate high-traffic management surfaces to the design system.
- [ ] **UI-003** Decompose large `App.js`/entry composition into `app/providers`, `app/routes`, `app/layout`, `features`, `components`, `lib`.
- [ ] **UI-004** Put routing/navigation/auth/API/env/storage behind Next-compatible boundaries; avoid feature-level direct router coupling.
- [ ] **UI-005** Gradually migrate touched modules to TypeScript without blocking feature work.
- [ ] **UI-006** Complete RTL, responsive/mobile, keyboard navigation, focus states, accessible labels and contrast audit.
- [ ] **NEXT-001** Migrate route-by-route to Next.js App Router after the app/runtime boundaries above are stable.
- [ ] **NEXT-002** Move metadata/server-safe loading/auth boundaries to Next.js while preserving `components`, `features`, `lib`, hooks and stores where appropriate.

## Operations / observability / hardening

- [ ] **OBS-001** Structured production logging with request/correlation IDs and secret redaction policy.
- [ ] **OBS-002** Celery task failure/latency metrics, queue depth and provider-sync health.
- [ ] **OPS-002** Run container supervisor/nginx with the minimum practical privileges and remove root/supervisor warnings.
- [ ] **OPS-003** Make provider OAuth/token expiry and last-sync health visible in admin operations UI.
- [ ] **OPS-004** Add deployment smoke checks for OAuth readiness and all Celery beat task registrations.

## Suggested deployment sequence

1. **A — Reliability/security**: Celery registration + health probe + OAuth access-log safety.
2. **B — Connected Accounts/auth UX**: refresh race + provider readiness UI + shadcn Settings surface.
3. **C — Multi-account**: SocialAccount schema/migration + OAuth/publish/sync account targeting.
4. **D — Organization/RBAC**: tenant/workspace terminology and one authorization model, then Atieh role presets.
5. Continue **UI modernization in parallel**, but only start `NEXT-001` after `UI-003` and `UI-004` are complete.
6. Add commercial billing/entitlements on top of Organization + unified RBAC, not on legacy Client semantics.
