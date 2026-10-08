# Platform integration contract (PLAT-000 / PLAT-003)

## Ownership and compatibility

`backend/social_stats/platforms/manifest.py` defines the validated `PlatformManifest`,
capability constraints and retry policy. `platforms/definitions.py` owns the existing
catalogue: identity, localized titles, rollout, authentication, capability statuses
and implementation dependencies occur in one definition. `platforms/registry.py`
and `platform_registry.py` are compatibility views, not independent declarations.
The historical model choices and their order remain unchanged; no migration or
production-ready claim is introduced for experimental platforms.

Runtime discovery imports public modules from `social_stats.publishers` and
`social_stats.platforms.providers` in sorted order. Modules beginning with `_` and
`base` are excluded. Deployments may supply an explicit ordered-independent tuple
of fully qualified modules in Django `PLATFORM_PROVIDER_MODULES`; those names are
sorted too. Imports fail visibly. `register_provider` requires a validated manifest,
rejects duplicate canonical/runtime keys before mutation, and derives builtin
manifest references by the historical output-service alias. `google_my_business`
remains the public key; `gmb` remains a compatible runtime alias. Unsupported
catalogue entries get a disabled runtime adapter, so catalogue and runtime align.
Tests live outside discovered packages: the example never appears in production.

First-party OAuth, analytics and engagement services already have dedicated
flows. Their manifests are marked `legacy_adapter=True` and preserve those flows
rather than advertising new implementations. Their adapters share the SPI and
existing publisher behavior; supported product capabilities may still be implemented
by those dedicated services. The compatibility flag is reserved to the exact
builtin manifest objects; new providers cannot opt out of the account boundary or
strict conformance. Moving additional old operations behind the execution boundary
can be done provider by provider without changing catalogue keys or rollout.

## Adding a provider: three files and a tracking issue, five steps

For a provider with ordinary credentials and no extra product surface, create:

1. `backend/social_stats/platforms/providers/<key>.py`: one `PlatformManifest`,
   publisher/transport adapter and decorated `BasePlatformProvider` subclass.
   Alternatively split manifest and adapter into two files if size warrants it.
2. `backend/social_stats/tests/test_<key>_contract.py`: mocked transport tests for
   enabled capabilities, failures and account isolation.
3. `docs/platforms/<key>.md`: official API evidence, scopes, account/destination
   semantics, sandbox validation, egress origin, rotation and operational readiness.

Also open a child issue using [the onboarding template](PLATFORM_PROVIDER_CHECKLIST.md).

Then:

1. Declare identity, category, rollout and auth strategy. Use `custom` only with a
   documented provider-owned flow; username/password is not an accepted strategy.
2. Supply the complete status map (`supported`, `beta`, `planned`, `not_available`),
   `Capability` constraints, destination kinds, optional extension names, inbound
   mode and conservative `ResiliencePolicy`. `capabilities` retains legacy discovery
   tags; the status map determines enabled product behavior. New runtime
   `ProviderCapabilities` are derived during registration, so do not duplicate
   the status map as boolean declarations on a new adapter.
3. Implement the relevant contracts below and register with `@register_provider`.
   No provider-name edit to the loader, Composer or Connected Accounts is required.
   If the provider uses HTTP, additionally register its allowlisted origin in
   `egress/registry.py`; this is a security policy change, not a feature switch.
   A credential/auth extension or webhook URL handler is an additional file only
   when the provider needs one. Keep these inside its integration layer.
4. Add account-isolation and transport-mocked behavioral tests. Run the commands
   below. The reference is `tests/platform_fixtures/example.py`, imported only by
   tests. `test_provider_conformance.py` proves metadata, Connected Accounts API,
   Composer dispatch and typed execution without edits to feature switches.
5. Record official evidence and end-to-end sandbox results in #113 or its child
   issue before changing a future provider to `beta` or `active`. A green offline
   suite proves the interface; it does not prove a real API integration is ready.

A deployment plugin outside the builtin package supplies its module path through
`PLATFORM_PROVIDER_MODULES` instead of adding it to a central provider-name list.

## Typed operation boundary

An authorized caller selects a workspace, SocialAccount and its encrypted
PlatformCredential, then constructs `ProviderExecution(provider, credential,
DestinationContext(...))`. Authorization (membership/RBAC) remains the caller's
responsibility; execution verifies workspace, account, platform, destination kind,
remote identity, active state and expiry before adapter dispatch. A legacy token
without a SocialAccount cannot pass this new boundary.

| Operation | Input | Result / implementation |
|---|---|---|
| connect/reconnect | credential mapping, through ConnectionService | ConnectionResult; identity and secrets are persisted separately |
| disconnect | scoped destination | ProviderResult; revoke plus local account/extension cleanup |
| refresh | scoped destination | ConnectionResult with replacement tokens; caller persists under the same account |
| publish | PublishRequest and DestinationContext | PublishResult; content, media, intent key and declared extensions |
| sync / analytics | scoped destination | StatsResult with normalized numeric metrics; raw_response is internal |
| ingest | verified InboundEvent | InboxResult with account-scoped items/cursor; adapter deduplicates event IDs |
| reply | ReplyRequest | ProviderResult; adapter verifies thread ownership and permissions |
| health/readiness | scoped credential | HealthResult (ready, expired, not_connected/error code) |

Disabled capabilities fail with `ProviderError(code='unsupported')` before an
adapter call. Constraints enforce content length, item count, destination kinds
and scopes; HTTP media inputs pass the shared HTTPS/SSRF policy. `max_bytes` and
media format/duration limits must also be enforced by the adapter when inspecting
or uploading bytes. Destination and request types replace arbitrary platform IDs
in new feature code. Adapter kwargs remain solely a legacy compatibility detail.
Provider extension hooks `connection_identity`, `connected`, `disconnected` and
`prepare_publish` keep provider-specific storage and Composer translation in the
integration layer. Telegram's integration row and rich-media resolution use those
hooks; other providers need not implement Telegram behavior.

`health` reports local credential readiness, not guaranteed upstream authorization.
Polling consumers checkpoint cursors only after account-scoped event persistence.
Webhook adapters verify signatures before constructing `authenticity_verified=True`;
that boolean is trusted internal input, never copied from a public request body.
The adapter must reject a thread/event belonging to another account, even if the
workspace is the same. Approval and scheduling retain the original publication
intent; the Composer boundary uses `post:<id>` scoped by workspace/account.

## Security, egress and retry requirements

- Tokens stay in encrypted PlatformCredential fields, never SocialAccount metadata.
  Connection results hide secrets in repr; public connection data and identity
  metadata pass the shared redactor and scrub actual returned token values.
  Public platform metadata is explicitly constructed; it excludes implementation
  paths, HTTP origins, credentials and provider-specific account identifiers.
- Provider errors at new execution/connect boundaries contain safe stable codes.
  Raw payloads are internal. Rate-limit and expired-token subclasses preserve the
  worker's backoff and credential deactivation behavior. Production logging uses
  the existing redacting formatter; never log tokens or full request/response bodies.
- Use `BasePlatformProvider.outbound_request` or the shared egress router with the
  manifest's registered service. The router rejects an origin outside that service.
  For downloaded user media use shared SSRF/file checks, redirect validation and
  size/time limits. Never bypass these using a direct requests call.
- `ResiliencePolicy` states bounded attempts, Retry-After handling, idempotency and
  reconciliation. The worker honors the new provider's rate-limit budget and
  `mutation_retry='never'`. Timeouts/network failures after sending a mutation
  remain ambiguous: do not blindly replay them. Reconcile remote results or require
  manual review; `idempotent` requires an actual deduplication implementation.
  The example proves account-scoped intent/event deduplication with an in-memory
  test store; production adapters need durable storage and concurrent claims.

## Conformance and CI

From `backend/`:

```sh
python manage.py check_provider_conformance
python manage.py test social_stats.tests.test_provider_conformance
python manage.py check_platform_config
python manage.py test social_stats.tests
python manage.py makemigrations social_stats --check --dry-run
```

The offline runner checks every registered manifest, alias, callable lifecycle,
media implementation and declared retry policy. New adapters additionally must
implement enabled analytics, ingestion and reply contracts. Failures identify
`<provider>: <area>.<contract>: <reason>`. CI runs the runner explicitly and the
full Django suite (including fixture behavior and existing integration regressions).
Frontend tests consume the same fixture metadata as a synthetic API payload and
verify Connected Accounts and Composer capability selectors without registering
production catalogue entries. Build and Jest remain mandatory PR checks.

The checklist describes required behavioral coverage per capability. It is not
possible to prove authenticity, deduplication or remote idempotency through Python
method introspection; each future adapter supplies transport tests and evidence.

## Connected Accounts auth and UI extensions

`contract.auth` derives from the manifest's `auth_type`, optional `auth_fields`
(localized `AuthField` descriptors, never values), and `oauth_start` internal path.
Ordinary bot/API-key schemas are derived defaults; custom strategies must declare
fields or a real OAuth start path before the UI offers a flow. The generic surface
consumes the workspace-scoped connections API, validates responses, and does not
consume the legacy frontend fallback catalogue or OAuth-provider name map.

Optional `ui_extensions` names are separate from publishing request `extensions`.
Only a provider that declares an installed UI extension gets that UI. The Telegram
settings extension lives at `components/connections/providerExtensions.jsx`, uses
the currently selected account and workspace in its query key, and preserves the
existing account-scoped Telegram API. Providers with ordinary authentication need
no frontend registration; extension registration is only for actual custom UI.

See [Connected Accounts](CONNECT_ACCOUNTS.md) for readiness, sync staleness,
authorization and recovery policies. Connection additions and reconnects share the
`connect_platforms` action; the persistence boundary also authorizes an existing
identity when a caller submits it through “Add account”.

### Composer publishing intents (stage 5)

`contract.publishing_modes` maps each mode to an enabled publish capability,
validated constraints, and an optional declared `ui_extension`. A provider with
only `publish_text` automatically exposes text mode; feature code needs no
platform registration list. Provider-specific editors live behind named slots
(currently `telegram_composer`). Additional modes must declare their capability,
constraints and extension in the provider manifest. Connected Accounts exposes
per-account publish/schedule permissions and `publishing_readiness[mode]`,
including granted scopes and destination compatibility, without exposing tokens.

The shared post payload is `content`, `media_type`, ordered `media_urls`,
`target_platforms`, and `platform_overrides`. Provider options may contain ordered
`account_targets: [{social_account_id, destination_id}]`. Legacy single-account
options remain readable. Each account must belong to the authorized workspace;
destination IDs must belong to that account. Provider-owned payloads (rich
messages, polls, media captions and destination context) remain intact in draft,
edit, duplicate, approval, scheduling and queue snapshots. Queue platforms must
match the selected platforms exactly. No automatic conversion drops content.

The HTTP boundary, approval executors and delivery worker validate the intent
before provider calls. Typed validation failures include `unsupported`,
`text_limit`, `media_count`, `media_size`, `media_type`, `media_aspect`,
`media_duration`, `media_dimensions`, `scope_denied`, and `permission_denied`.
Asset constraints are checked against workspace-owned media. Uploaded video
duration and dimensions are inspected with the existing MoviePy/FFmpeg tooling;
storage without a local path uses authorized upload bytes in a temporary file. Remote HTTPS media
also passes SSRF checks and is inspected by adapters during upload; offline
validation cannot establish remote byte dimensions or availability.

Draft creation accepts a UUID `Idempotency-Key`, scoped to actor and workspace.
Repeating the same payload returns the saved intent; a changed payload returns
409. `resolve_intent` retrieves only the actor's intent in that workspace. This
policy applies to local draft creation, not provider publication. Delivery logs
identify each account target, retain completed legacy deliveries, atomically
claim pending work, and preserve ambiguous outcomes for reconciliation. Network,
timeout and invalid-response outcomes must not automatically replay. Existing
bounded rate-limit retry policy remains. No remote exactly-once guarantee is
introduced. Scheduling accepts future timezone-aware instants; locale only
changes display. Editing a scheduled/queued intent invalidates its approval and
returns it to draft, and stale approval revisions cannot execute.

Apply migrations 0078–0079 before serving this API/UI version. They add local
intent deduplication and per-account delivery keys without deleting existing logs.

### Historical Telegram reconnect (2026-10-08 review batch)

A selected account with historical `bot_id:chat_id` identity may reconcile to canonical chat identity only when provider validation proves that exact bot and chat, the original scoped attached credential exists and no canonical account collision exists. Preserve account, credential and extension IDs under the existing workspace transaction/lock. Untargeted historical reconnect requires selection. Never use display names or suffix matching, replace another account, or adopt an ambiguous unattached credential. Scope is rechecked after provider validation. Public fixture tests verify idempotency, isolation, quotas and transaction rollback; real provider reconnect is outside this audit.
