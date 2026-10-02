# Workspace vocabulary (TEN-002 / issue #44)

A **Workspace** is the product container for a brand/company's social accounts,
content, inbox, analytics and settings. Persian UI calls it **فضای کاری** (plural:
**فضاهای کاری**). Its owners and members are people; invitations are addressed to
workspace owners. An agency's commercial customers may still be called clients
in marketing copy. Provider OAuth/HTTP clients remain application terminology.

Organization/Tenant ownership (#43) and the RBAC redesign (#45–#48) are separate
changes. This terminology release adds no organization boundary or new authority.

## Canonical routes and compatibility

All routes below are relative to `/api/`. Canonical and legacy routes use the
same views, querysets, authorization and persisted IDs; neither is a redirect.

| Canonical route | Retained compatibility route |
| --- | --- |
| `workspaces/` and `workspaces/{id}/` | `clients/` and `clients/{id}/` |
| `workspaces/{id}/{action}/` | `clients/{id}/{action}/` |
| `workspace/setup-solo/` | `client/setup-solo/` |
| `admin/create-workspace/` | `admin/create-client/` |
| `management/workspaces/` and detail/permissions/portal-config | `management/clients/` equivalents |
| `management/staff/{id}/workspaces/` | `management/staff/{id}/clients/` |
| `ai/v2/usage/by-workspace/` | `ai/v2/usage/by-client/` |

Management routes retain their existing workspace-member/access-management
semantics, rather than creating a new ownership or membership model.

The SPA uses `/admin/workspaces` and `/admin/workspace/{id}` (including settings,
edit and ROI deep links). Old `/admin/clients` and `/admin/client/{id}` links
still resolve. Existing `/client/*` account-role portal routes stay supported.

## Transport fields

Use these names in new API consumers:

| Canonical input | Retained input |
| --- | --- |
| `workspace` | `client` |
| `workspace_id` | `client_id` |
| `workspace_ids` | `client_ids` |
| `workspace_email` | `client_email` |
| `assigned_workspaces` | `assigned_clients` |

For resource relationship bodies, use `workspace` where the old serializer
accepted `client`. For context query parameters or action bodies, use
`workspace_id` where the old endpoint accepted `client_id`. These aliases do not
introduce new required fields or make context selection available on endpoints
that previously did not support it. JSON, URL-encoded forms and multipart forms
are supported. Staff assignment `add`/`assignments` items accept `workspace_id`.
Conflicting canonical/legacy values return HTTP 400; tenant identity is never
selected by precedence. Equal duplicate aliases are accepted.

Responses retain old fields and add corresponding Workspace fields, including
`workspace`, `workspace_id`, `workspace_name`, `workspaces`,
`assigned_workspaces`, `total_workspaces`, `queued_workspaces` and
`workspace_count` wherever their old counterparts exist. JWTs issued through
the main login flow include `workspace_id` alongside `client_id`.

The boundary adapter only maps transport fields and known resource envelopes.
Opaque nested JSON (metadata, brand assets, event payloads, etc.), OAuth
application IDs, external provider data and user-authored text are preserved.

Frontend consumers use `workspacesAPI`, `useWorkspaces` and
`useWorkspaceSummary`. `clientsAPI`, `useClients`, `useClientSummary` and the
old management/admin SDK method names remain compatibility aliases. The shared
SDK sends canonical workspace fields for legacy transport inputs as well.
Deploy the backend aliases before or alongside the new frontend; old frontends
continue to work against the new backend. No removal date is scheduled here.

## Database rename explicitly deferred

The persistence model remains `Client`, the table remains
`social_stats_client`, and relation columns remain `client_id`. Existing
foreign keys, IDs, Celery signatures, permission codes and stored `role='client'`
values are unchanged. Migration 0069 only changes Django display metadata and
the human-readable role label to `Workspace member`; its SQL is a no-op.
Django admin resource and relationship labels use Workspace.

A future database rename requires its own migration plan after Organization and
RBAC boundaries stabilize: inventory external SQL/exports, prepare compatibility
views if needed, verify foreign keys and rollback, and coordinate deployment.
Do not mix that physical rename into this vocabulary release.
