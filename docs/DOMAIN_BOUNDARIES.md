# Workspace, brand, team and competitor domain boundaries

## Identity and relationships

- **User:** an authenticated human identity. A user can belong to multiple organizations/workspaces subject to explicit membership and permissions.
- **Organization / agency:** the business or service-provider grouping, not a substitute for an authorized workspace scope.
- **Team:** a collaboration/role grouping within the organization's authorized context; never a tenant authorization shortcut.
- **Workspace (legacy Client):** the data isolation boundary for competitors, connected accounts, posts, inbox and reporting. Existing database `client_id` naming is compatibility, not a separate brand domain.
- **Brand:** identity, guidelines, voice and assets managed *within* a workspace; it is not a user or workspace authorization boundary.
- **Competitor:** external public entity tracked **for one workspace**; never confuse it with a connected account controlled by that workspace.
- **Bright Data:** a backend provider for configured public-source collection flows. Its dataset and connector credentials are infrastructure configuration, never independent workspace entities or a frontend role.

## Competitor page behavior

The selected valid workspace defines the list and creation scope. When no workspace is selected, the page prompts for selection and does not show cross-workspace competitor data. A workspace change clears previous competitor content and discards obsolete list responses. Backend membership and authorization still govern access.

## Follow-up architecture work

Do not rename database fields or consolidate agencies, brands, and teams in a hotfix. Inventory existing persisted relationships and migrate with explicit backward compatibility and authorization tests. Align Bright Data status and availability copy with actual provider capability; do not promise an unsupported collection operation.

See [Access](ACCESS.md), [Workspace scope](NX_02_WORKSPACE_SCOPE.md), [Architecture](ARCHITECTURE.md).
