# Workspace authorization (#45–#48)

`social_stats.authorization` is the read-only policy engine. `acting_context`
resolves ownership, active agency relationships, legacy staff assignments and
explicit workspace membership. `accessible_workspaces` applies those same
boundaries to querysets. `evaluate` decides an action, including account scope
and review requirements. `post_decision` resolves the accounts the publisher
will actually use and evaluates all targets. Unknown actions fail closed.

The compatibility entry points (`PermissionChecker`, `check_action`,
`UserProfile.can_access_client`, `TenantScopedMixin`) delegate to this module.
`check_action` alone creates an ApprovalRequest when review is needed. Policy
inspection and team management never create approval requests.

## Compatibility and precedence

Existing profiles, RolePermission, UserPermission, StaffClientAssignment,
assigned_clients, AgencyMembership and AgencyClientRelation rows are retained.
The migrations add empty policy tables and reusable presets; they do not assign
presets, backfill grants, or rewrite existing role/relationship data. The engine
maps legacy action codes explicitly, applies user denials, and respects staff
`can_edit` / `can_export`. A missing action mapping cannot grant a staff action.
Legacy client-role workspace ownership and platform superadmin semantics remain.

1. Authentication, active membership and workspace/account boundaries.
2. Existing ownership or legacy role defaults / active agency relationship.
3. Optional organization membership preset, overridden by a workspace preset.
4. Explicit workspace action overrides; legacy user denials still win.
5. Account overrides, constrained by the effective workspace permission.

Agency relation grants and legacy staff assignment capabilities remain ceilings.
A workspace preset cannot expand them. A paused/terminated relationship or
revoked agency membership cannot be resurrected through a workspace policy or a
stale legacy assignment. Multiple agency memberships use primary_agency when
available, otherwise the first active relationship; grants are never unioned.

An account `true` grants only within existing workspace permission; a `false`
restricts that account. An empty map inherits. Account-attributed inbox and metric reads also filter denied accounts.
Account exceptions do not enroll
users or grant access to another workspace. Owners explicitly setting a
permission denial are subject to it; platform superadmins retain their existing
bypass (after account tenant validation).

The legacy tables are compatibility inputs, not a second policy engine. Their
removal is deferred until deployed compatibility has been verified. Automated
regression coverage verifies the adapters now; this PR does not claim a live
production migration or permission audit.

## Role and approval defaults

Migration 0071 seeds owner/executive, social media manager, senior editor,
editor, and analyst presets as database rows. Presets are editable data, not
branches in permission code. They apply only when explicitly selected. Existing
members keep their existing defaults. Organization membership presets apply
across that organization's active relationships, bounded by each relationship.
Workspace policies can select a different preset and set granular exceptions.

Review is evaluated separately from permission. Role review defaults can be
changed by workspace/account exceptions. Workspace `requires_approval` and
agency `requires_approval_for` are mandatory floors and cannot be waived by a
member/account exception. Disabled actions never produce approval requests.

Publishing and scheduling API calls, approval executors, and publishing workers
use the same evaluation. Scheduled posts no longer bypass workspace review.
Workers recheck membership and target account permissions before dispatch and
before outbound publishing. Posts without an attributable publishing actor or creator fail closed;
system producers should supply an authorized creator. Approved posts still need
current action permission. The publication requester is persisted separately
from the original author so an authorized owner can publish an editor draft.
Scheduled delivery also requires current publish permission. Editors cannot approve their own requests; approving
posts requires `approve_posts`, with the legacy `composer.approve` mapping.
Changing a reviewed post invalidates its review markers.

ApprovalRequest.relation is now nullable for direct workspace/staff requests.
Existing agency approval rows remain unchanged. Executors constrain object
lookups to the approval's workspace and recheck newly recorded permission keys
before executing. Legacy approval payloads without this key remain compatible.

## Management API and UI

Access Management → Workspace Team lets an administrator select a workspace,
member and optional account; choose a role preset; set permission/review
exceptions; and inspect saved effective values. Preset defaults and saved
results are shown separately. Saving reloads the effective policy. The
workspace owner may use the same APIs; configuring policies requires owner or
platform superadmin access and an already authorized target member.

- `GET /api/management/role-presets/`
- `GET /api/management/workspaces/{id}/team-policy/`
- `GET|PUT /api/management/workspaces/{id}/team-policy/{user_id}/`
- `GET|PUT|DELETE /api/management/workspaces/{id}/accounts/{account_id}/policy/{user_id}/`
- `GET|PUT /api/management/organizations/{agency_id}/members/{user_id}/preset/`

PUT replaces the scope's exception maps. Omitted keys inherit; explicit false
is a denial. Reset account exceptions with DELETE. Organization presets require
the organization owner or platform superadmin; the agency relationship ceiling
still applies. Workspace and account APIs validate known keys and actual JSON
booleans. Changes write before/after ActionLog entries inside the same
transaction; account reset records history before deleting the override.
Organization changes write audit entries to every active managed workspace.

## Validation and rollout

Run migrations 0070–0072, then deploy backend and frontend together. Database
schema changes are additive except nullable approval relation. Do not delete the
legacy authorization tables. No presets are applied automatically. The seed
migration uses an immutable snapshot and preserves referenced/customized
presets on rollback.

Tests cover legacy denials and assignment ceilings, organization relationship
revocation, preset defaults/exceptions, approval floors, account sibling
isolation, cross-workspace refusal, audit writes, approval replay, scheduling,
worker rechecks and management UI saves/error handling.
