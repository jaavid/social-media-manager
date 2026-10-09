# NX-02: Effective workspace scope

`useWorkspaceScope` is the shared resolver for realtime, sidebar counts,
dashboard-today, search, analytics, inbox selection and shell event toasts.
The admin workspace switcher displays this effective scope; its all-workspaces
action navigates to the global workspace list. Workspace and legacy
client IDs identify the same entity in these APIs (`clientsAPI` aliases
`workspacesAPI`; HTTP transport maps `client_id` to `workspace_id`). This does
not rename provider account IDs or other domain identifiers.

Resolution order:

1. Route `workspaceId` / `clientId` (including admin pathname hydration) or
   explicit `workspace` query parameter. Invalid or denied routes resolve to
   no workspace; they never fall back.
2. Explicit selection owned by the current user and the current pathname.
   Storage is a preference, not proof of access. Non-default selections and
   routes require a successful `/workspaces/{id}/` response matching the ID.
3. Valid session `workspace_id`, otherwise legacy `client_id`.
4. No workspace. `null` never grants all-workspace access.

IDs are positive safe integers, accepting decimal strings. Admin global pages
retain their established independent global data APIs. Counts have no global
scope: the backend previously returned zero when no workspace was resolved;
now the frontend skips that request and displays zero badges. No arbitrary
first workspace is selected for multi-workspace identities.

Only identity-owned, pathname-local explicit choices persist. Route scope is
not copied to storage. Old unowned `currentClientId` storage is ignored by the
resolver. Legacy store setters remain for compatibility and have no active UI
consumers. Logout and cross-tab invalidation reset the store. QueryClient
replacement on identity changes remains unchanged. Scope-tagged badge reads
hide old values synchronously; counts queries include identity and workspace,
and responses must identify the effective workspace before being mirrored.

Realtime transport remains a cookie-authenticated identity connection with
client-side scope filtering. Unscoped, invalid and unrelated events are ignored.
Listener callbacks update in the layout phase; subscriptions clean up and the
transport retains identity-based reconnect/cleanup behavior.

## Deferred NX-03 work

Posts/calendar consumers still do not universally use the QK factory. This
change retains their existing invalidation keys; it does not solve all stale
page queries. Calendar state/query migration and broad invalidation-key cleanup
remain NX-03. No backend authorization or payload contract changes are included.

## Limits

A non-default workspace pauses consumers while its access request is pending
or denied. Backend authorization remains final, including revocation after a
successful access read. Path-local selection intentionally does not carry over
to unrelated global pages. Feature-local state outside the listed consumers is
not a full application-wide state migration.
