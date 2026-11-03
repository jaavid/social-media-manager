# Workspace and URL navigation contract — #108

## Canonical scope handling
- `frontend/src/lib/runtime/navigation.ts` owns internal canonicalization and the `workspaceScopedSearch` helper.
- `useWorkspaceScope`, end-user `AccountControls`, and staff `WorkspaceContext` must all use it to change an explicit URL workspace.
- A changed workspace removes account/channel/source/conversation IDs plus cursor, page and offset, while preserving unrelated tab, sort and locale parameters. A same-workspace update preserves state.
- Workspace authorization is enforced through authenticated backend access and checked IDs, never inferred from URL parameters alone.
- Query cache keys must remain scoped by user/workspace; any unscoped caller found in route validation is a defect.

## Route family ownership and required verification
| Family | Typical routes | Shareable state | State to clear on workspace change | Required acceptance |
| --- | --- | --- | --- | --- |
| Marketplace | `/u/agency/find`, agency pages | search/sort/page where implemented | account filters, cursors | share, reload, Back/Forward |
| Workspace lists | `/admin/workspaces`, `/u/organizations` | view, filters where implemented | selected tenant details | selection and unauthorized ID |
| Inbox | `/admin/analytics/inbox`, `/dashboard/inbox` | search/tab/sort where supported | channel/account/conversation/page | Back/Forward, privacy, keyboard |
| Reports | `/admin/analytics/reports`, `/dashboard/reports` | report period/sort where supported | source/account/page | URL round-trip, export privacy |
| Composer | `/dashboard/composer/[id]` | draft ID only where authorized | workspace-specific filters | alias, fullscreen editor, modified click |

## Evidence status
- Unit regression added for query sanitization and preserving unrelated URL state.
- Browser regression expanded for staff selector transition with account/channel/pagination filters.
- Existing navigation tests cover fragment/state handoff, modified click and canonical aliases.

## Outstanding before closing #108
Run verified browser matrix on all four target families for FA/EN and viewport/theme combinations; capture actual reload, Back/Forward, hash/scroll, dynamic IDs, fullscreen editor, role-scoped privacy and cache isolation. No claim of completion is made from static code inspection alone.
