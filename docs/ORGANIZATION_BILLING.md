# Organization subscriptions and entitlements

Billing belongs to `Organization`, independently of workspace access and agency
management. `Subscription.organization` is unique. Workspace plan fields and
legacy agency/workspace subscription rows are historical compatibility data;
they cannot grant effective product entitlements.

## Plans and assignment

Existing and newly created tenants default to `self-hosted` (unlimited), preserving
existing installations. Historical SKUs keep their former unlimited behavior.
Commercial limits are explicit operator assignments, not client-editable fields:

| Plan | Workspaces | Members | Active social accounts | Media bytes | AI requests/month | Capabilities |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| self-hosted | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited | All |
| org-free | 1 | 3 | 3 | 1 GiB | 50 | AI |
| org-pro | 10 | 25 | 50 | 50 GiB | 1,000 | AI, automation, reports/export |

From `backend/`:

```sh
python manage.py migrate
python manage.py assign_organization_plan 123 org-free
```

Assignment changes neither subscription status nor tenant ownership. A downgrade
never deletes data: resources already above the new cap remain readable and can
be edited without growth or deleted. Unknown plan identifiers fall back to bounded
`org-free`. Active/trialing states use plan limits; other states deny growth and
premium execution. Provider integration and lifecycle transitions are covered by
BILL-002 (#50), not this policy module.

## Effective state and enforcement

Authenticated organization owners and platform superadmins can query
`GET /api/organizations/{id}/entitlements/`. Active members receive 403; unrelated
users receive 404. The response contains organization/subscription IDs, plan,
status, effective capabilities, and each resource's current/limit/remaining values.
`null` limits mean unlimited. Billing never grants workspace permissions.

Workspace, active membership and social-account writes, media-library uploads and
premium configuration saves enforce policy in ordinary ORM saves as well as API
and admin paths. Authorization gates report/export and automation actions; workers
recheck automation capability before execution. Resource writes lock the tenant row
within the transaction to serialize quota checks and mutations. Production should
use PostgreSQL row locks; SQLite's transaction locking can reject competing writers.
Bulk ORM writes/raw SQL intentionally bypass model saves and are reserved for trusted
migrations/maintenance, not application resource creation or reactivation.

Members count distinct active membership users plus the owner once. Accounts count
active `SocialAccount` rows, not credentials. All workspaces count, including inactive
ones. Storage counts primary media-library file bytes, excluding generated thumbnails,
logos and external URL references. Upload size is checked before storage writes.
AI provider requests reserve capacity atomically before the call in text, streaming
and vision paths, legacy endpoints, chat tool loops and background jobs, across
every workspace in the tenant. Cache hits consume no quota.
Failed provider attempts retain the reservation to avoid retry-based quota bypasses.
The AI window is the UTC calendar month and resets by period key; it is independent
of provider billing periods. Platform-only AI tools without a workspace retain global
budgets. Existing daily/per-workspace and global AI safety budgets still apply.

## Data migration

Migration 0082 transfers a tenant's single legacy workspace subscription in place,
retaining its plan, status, gateway identifiers and invoice foreign keys.
Current-month non-cached AI logs seed the migrated reservation counter. When there
are multiple conflicting subscriptions or none, it provisions `self-hosted` and
leaves historical rows untouched. Agency subscriptions are never inferred as tenant
ownership. The database enforces one subject per row and one subscription per tenant.
The migration is intentionally irreversible: combining later tenant billing changes
back into historical workspace subscriptions has no unambiguous safe mapping.
