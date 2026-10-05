# Backend organization

The backend remains one Django application, `social_stats`. Its model labels,
permissions, table names, foreign keys and API routes are unchanged. Splitting it
into separate Django apps would also change migration ownership and content types;
that is unnecessary for organizing the implementation.

## Where code belongs

| Responsibility | Location | Examples |
| --- | --- | --- |
| Project configuration, ASGI, Celery setup | `backend/dashboard/` | `settings.py`, `urls.py` |
| Persisted entities and their invariants | `social_stats/models/<domain>.py` | `workspaces.py`, `accounts.py`, `publishing.py`, `inbox.py`, `rbac.py` |
| HTTP endpoints | `social_stats/views/<domain>.py` | `session.py`, `workspaces.py`, `composer.py`, `reports.py` |
| Request validation and response representation | `social_stats/serializers/<domain>.py` | `calendar.py`, `inbox.py`, `marketplace.py` |
| Backend administration | `social_stats/admin/<domain>.py` | `accounts.py`, `publishing.py`, `auth.py` |
| Shared admin behavior and read-only policy | `social_stats/admin/shared.py` | `WorkspaceLabelsMixin`, `OperationalReadOnlyAdmin` |
| Admin filters and JSON presentation | `social_stats/admin/filters.py`, `widgets.py` | Workspace autocomplete, date ranges, readable JSON |
| Third-party admin integration | `social_stats/admin/integrations/` | Celery Beat, Axes, JWT token blacklist |
| Admin site configuration | `dashboard/admin.py` | Unfold settings and sidebar callback |
| Model lifecycle listeners | `social_stats/signals.py` | Onboarding initialization and completion |
| Platform implementations and metadata | `social_stats/platforms/` | Registry, publishing adapters, capabilities |
| AI implementation | `social_stats/ai/` | Provider-backed generation and existing AI endpoints |
| Security implementation | `social_stats/security/` | Sessions, MFA, audit, privacy, compliance |
| Events and asynchronous handlers | `social_stats/events/` | Event models and dispatch |
| Migration history | `social_stats/migrations/` | Existing migration graph |
| Behavioral regression tests | `social_stats/tests/` | Authorization, account attribution, publishing, admin |

Use Django's conventional plural names (`models`, `views`, `serializers`) for
packages. Files within them name the product responsibility. For example, an
inbox change is found in `models/inbox.py`, `views/inbox.py`,
`serializers/inbox.py`, and `admin/inbox.py`.

Import entities through `social_stats.models` when crossing domains. Import view
and serializer implementations from their specific domain module. The old shared
endpoint interface remains available through `views/core.py`; implementation is
now in smaller modules. Shared endpoint utilities are in `views/helpers.py`.
`serializers/core.py` retains the modest collection of shared serializers.

`AppConfig.ready()` loads signal receivers once Django has loaded all models.
Historical `marketplace_models.py`, `bot_models.py`, and `rbac_models.py` are
compatibility exports only. In particular, migration 0040 imports the marketplace
helper functions from their historical path. Do not remove these exports or edit
historical migrations to accommodate a code move.

## Admin with Unfold

`django-unfold` is pinned in `backend/requirements.txt` and installed before
`django.contrib.admin`. Daphne keeps its first position for its development server.
The backend URL remains `/backend/`; the frontend owns `/admin/`.

Application admins inherit Unfold's `ModelAdmin`, and lookup inlines use its
`TabularInline`. User/group administration retains Django's behavior with Unfold
forms. Text and JSON widgets retain the existing Persian form labels and styling.
The sidebar groups workspaces, connections, publishing, inbox, analytics, settings,
and authentication. Links are filtered through the linked admin's model permissions.
Search helps locate model lists; Unfold also provides theme controls.
Configuration is in `dashboard/admin.py`, imported by `dashboard/settings.py`.

`unfold.contrib.filters` supplies choice dropdowns, boolean radio buttons, date
ranges and workspace autocomplete. Workspace forms use fieldset tabs; lookup
items use a tabbed sortable inline with their existing `sort_order` field.
JSON editing keeps Django's validation and displays Unicode with indentation.
Rich-text widgets are intentionally excluded from plain-text and JSON fields.

Celery Beat, Axes and JWT blacklist admins are adapted in `admin/integrations/`.
They retain the original forms, actions and permission rules. Celery Beat's
crontab description uses an external script instead of its inline JavaScript.
The sidebar adds scheduling and security/session groups with permission checks.
See the official [filter documentation](https://unfoldadmin.com/docs/filters/dropdown/)
and [Celery Beat integration](https://unfoldadmin.com/docs/integrations/django-celery-beat/).

Existing authorization is preserved. Publishing records, provider messages,
reviews, and queue results remain read-only where transitions belong to services.
Unfold does not add workspace-level isolation to Django admin: access still uses
the existing staff/model permission policy, so treat it as the internal backend.

Install updated requirements and collect static files during deployment. No schema
migration is needed for this refactor. Unfold's assets are served through the
existing WhiteNoise/static-file configuration.

Both Docker image builds run `collectstatic`; the combined app entrypoint also
collects on startup. Deploy a newly built image containing the updated Python
code, dependencies and static assets. For deployments outside these containers,
run `python manage.py collectstatic --noinput` with the production settings and
restart the application. Static storage uses WhiteNoise's compressed manifest
backend: production templates reference content-hashed filenames, avoiding old
JavaScript/CSS under Nginx's immutable cache. Keep `staticfiles.json` with the
collected assets, and ensure `/static/` reaches that same directory.

Unfold's Alpine runtime evaluates expressions. `SecurityHeadersMiddleware`
therefore permits `unsafe-eval` only on HTML responses resolved inside the
`admin` namespace under `/backend/`; inline scripts remain blocked. API responses,
admin autocomplete JSON and other routes retain the strict script policy.
This scoped exception is required by the installed runtime; do not add
`unsafe-eval` globally to the CSP environment overrides.

After deployment, check that Unfold CSS/JS requests return 200 with hashed URLs,
the console has no CSP errors, the shortcut help opens with `Shift+?` and closes with
Escape, and the task/schedule forms render correctly. Re-running `collectstatic`
alone cannot fix a deployed CSP that blocks Alpine.

## Review findings and remaining opportunities

The previous flat app mixed more than fifty endpoint modules with infrastructure
and shared implementation, and the primary model file held more than sixty
entities in 2,666 lines. The shared endpoint file had 1,353 lines, including login,
workspace CRUD, analytics, reports, and public content. These responsibilities are
now separated; admin registrations and domain serializers are grouped similarly.

The existing AI, security, platform and event packages already provide meaningful
organization and remain intact. This change does not rewrite business behavior,
introduce repositories, or split the migration graph.

Further work should focus on behavior rather than moving files alone:

- `tasks.py` is still a large platform synchronization/orchestration module.
  Extract platform fetch/normalization implementations behind the existing task
  names, preserving Celery names, beat schedules, retries and worker compatibility.
- Publishing and approval services already coordinate transactions and locks.
  Keep these operations together; extract only responsibilities that can be tested
  through their actual callers.
- Root-level service helpers can be grouped by domain in a later change. A blanket
  rename would also affect asynchronous task names and runtime dotted imports.
- The largest AI/OAuth endpoint modules can be split around provider flows after
  defining shared state-validation and account-identity behavior explicitly.
- Keep one authoritative permission implementation in `authorization.py`; domain
  modules must continue to scope requests through it rather than copying checks.

These are follow-up opportunities, not claims that those refactors are complete.
