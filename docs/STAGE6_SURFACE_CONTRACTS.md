# Stage 6 surface contracts

This extends `FRONTEND_CONTRACTS.md`, `docs/brand/ravinta/BRAND.md`, the existing
provider integration and Stage 5 Composer contracts. It introduces no shell,
theme, data library, health model or parallel primitive set.

## Existing page patterns and extensions

| Pattern | Composition / ownership | Stage 6 examples |
| --- | --- | --- |
| Dashboard | Page + PageHeader + actual authorized summaries, localized dates, explicit metric meaning | AdminOverview workspace collection; ClientDashboard published-post counts, account-scoped AnalyticsSurface |
| Collection | Page/Header + filters + Table/cards + pagination + DataState | Inbox, AnalyticsSurface, ReportsPage |
| Detail | Selected identity, explicit Back, scoped resource and local recovery | Inbox thread; PublicReportPage |
| Editor | Identity-keyed draft, synchronous pending guard, inline failure, retained input, explicit destructive confirmation | Composer, BotFlowEditorPage, VideoStudioPage |
| Settings | Page/Header + labeled sections, explicit permissions, local save recovery | ConnectedAccounts, MyConnectionsPage, existing settings routes |

The Inbox Collection/Detail extension shows one pane at 360px and both at wider
sizes. A selection changes the data owner, not the shell. The bot editor is a
fullscreen Editor extension: its canvas has a bounded viewport, local scrolling,
keyboard-accessible palette, reduced-motion layout and confirmation before node
delete. PublicReport is a read-only Detail extension outside ProductShell; its
password gate owns its input and never renders account data before authorization.
VideoStudio is an Editor with derived media operations; publication hands the
selected asset to the existing Composer, which owns capabilities, readiness,
approval, intent/idempotency and ambiguous outcome handling. `?workspace=` is an
explicit scope handoff on the existing URL, not a navigation migration.

Dashboard overview now counts **published posts in the selected date range** from
the authorized posts endpoint. It does not label different providers' reach,
views or legacy totals as equivalent metrics. Per-account metrics live in the
Analytics tab. Existing Calendar and ROI tabs and dedicated feature URLs remain.
SharedReport v2 likewise contains per-account descriptor-based reports, never a
cross-provider total. Migration 0081 freezes authorized account IDs for new
links. Older links with unknown account scope show unavailable; the owner must
recreate them with explicit accounts. Author revocation and link expiration or
deactivation take effect on server reads. Previously downloaded reports cannot
be remotely recalled.

## Primitive API and form contracts

These are the existing canonical files under `src/components/ui`, not new copies.

| Primitive | Supported contract |
| --- | --- |
| Button | variant/size, loading or disabled, ref, native button props; as for links |
| Input / Textarea | controlled value/onChange, label/hint/error, forwarded ref, native required/disabled/autocomplete/validation |
| NativeSelect | native options/events, label/hint/error, forwarded ref; compatibility owner: form maintainers |
| Select / Combobox | options/value/onChange(value), searchable, disabled options; Select's searchable mode is the existing combobox, not another implementation |
| Checkbox / Radio / Switch | controlled checked/value and onChange, native labels/disabled and ref |
| Dialog / Modal / Sheet / Drawer | Radix controlled open/onOpenChange, title/description, trap and restore focus, Escape; Modal initialFocusRef and role='alertdialog' for destructive actions |
| Tabs / DropdownMenu / Tooltip | existing Radix roots/triggers/content, keyboard and direction inherited from AppProviders |
| Table / DataTable | shared semantic table elements; horizontal table scrolling stays within collection |
| Toast | canonical toast wrapper for notifications; actionable failures remain inline |
| Skeleton / EmptyState / ErrorState / DataState | shared layout/status/recovery primitives; no feature-owned duplicate |

Forms use visible labels, aria-describedby for help/error, required/native
validation before submit, synchronous duplicate-submit guards and pending state.
Do not focus every toast. Focus actionable editor/reply failure notices; keep
input and account choices on recoverable failure. Destructive dialogs initially
focus Cancel and restore the trigger on Escape/close. BrandIcon/color are
provider presentation only; actions and status use semantic product tokens.

`components.json` now declares RSC/TSX and the actual aliases. Safe CLI overwrite
was exercised with `shadcn@3.5.0 add button --overwrite --yes --cwd <isolated-copy>`:
it replaced the seeded temporary `button.tsx`; production `Button.tsx`, package
and lockfile were not overwritten. Repeat generation in a scratch directory,
review case-sensitive names and adopt compatible changes into the canonical
owned primitive. Do not run unattended overwrite over application wrappers.

## Data states and ownership

DataState distinguishes loading, refreshing, empty, no-results, partial-data,
offline, unavailable, forbidden, not-found, error and stale. Zero is a measurement;
null is missing, and historical unknown presence stays unknown. Only a successful
validated empty response is empty. Failed same-scope refresh preserves data with
a stale/offline notice. Authorization/not-found responses hide old private data.
Reference IDs displayed by DataState are UUID/32-hex values from x-request-id;
arbitrary header text and raw provider errors are never rendered.

Session QueryClient remains per identity. Feature keys include identity,
workspace, account, thread, effective filters and paging where applicable.
AbortSignals and generation/scope ownership reject obsolete responses. Reads
may retry once only on unavailable transport/5xx; malformed/auth/permission/429
are not automatically retried. Mutations default to retry=0. Analytics polling
repeats authorized reads after queue acknowledgement; it stops on terminal
authorization/rate-limit failure and never requeues a mutation. Metadata-only
realtime events refresh the selected account. A queued sync is not success.

Root/global error fallback depends only on React and a pure message catalog.
ProductShell catches local render failure inside its chrome. Its incident callback
contains a generated reference and safe name only, never editor contents, raw
exception or component stack. Public report fetch owns an AbortSignal and token;
explicit refresh clears its locally unlocked payload before revalidation.

## Legacy owners and removal criteria

| Adapter/debt | Owner | Removal criterion |
| --- | --- | --- |
| NativeSelect, Modal, Drawer, ErrorState, toast | frontend primitive maintainers | callers migrated to canonical API; native-event and focus contracts pass before removal; these wrappers already wrap the shared primitives |
| `BasePlatformProvider.reply` publisher translation | provider maintainers | provider typed replies pass transport/conformance and existing Telegram paid-action tests |
| `analytics_defaults.py` and declared legacy sync tasks | provider maintainers | real metric descriptors and typed sync transport verified; historical presence established by a genuine resync |
| legacy `useData` hooks other than migrated workspace/posts reads; legacy aggregate summary/timeseries consumers | owning feature maintainers | migrate each consumer with exact scope, status matrix and validated DTO; do not invent metric equivalence |
| `/video/youtube-upload/` compatibility API | video/provider maintainers | legacy clients use Composer publication; endpoint now requires explicit account, permissions, approval guard and rejects false success, but it is not an idempotent publication API |
| page-local legacy VideoStudio/BotFlow canvas styling | editor maintainers | adopt shared layout/control APIs with keyboard/RTL/viewport evidence; preserve genuine geometry, media sizing and canvas positions |
| remaining old marketing/settings/collection screens | feature maintainers | audit and migrate route-by-route with failure/keyboard/visual evidence; global issue closure requires this evidence |

Captions remain unavailable (backend implementation is absent); the UI makes no
active generation claim. Actual ffmpeg/remote transport and live provider credentials
were not exercised. No scope prerequisite PR is missing from origin/main.

## Editor overlays and public report verification

TriggerConfigModal and TestModeDrawer use the canonical Modal/Drawer and restore focus. Typed acknowledgements distinguish approval from publication, preserve configuration/phone on failure and lock replay after ambiguous unsafe responses. Test phone is component-local; the old persistent phone key is removed. Polling validates conversation, flow and workspace identity using the existing read-only bot conversation client field; failed stop retains running data. NodeInspector fields and MetaAdsPicker scope/error reads remain explicitly owned legacy gaps, not certified by this overlay migration.

Public password verification uses the existing CSRF bootstrap/header contract, including authenticated sessions. Token/public routes retain the existing Persian locale policy; browser tests cover this policy rather than assuming an English preference overrides it.

## Stage 6D: scoped Meta picker reads

MetaAdsPicker remains a Meta extension; it does not add provider-specific logic to
registry-driven features. Its existing QueryClient owns identity/role/account-type,
workspace, Marketing ad-account and individual campaign keys. All reads consume
AbortSignal; changing an owner clears the dependent selection and never uses
previous-key placeholder data. Each campaign's ads have independent read/retry
state. Recoverable same-key refresh preserves verified rows and selection; an
authorization/not-found response hides cached rows and disables saving. Unknown
or cross-scope selections cannot pass the trigger publication gate.

Picker APIs require explicit `workspace_id` (normalized by the existing vocabulary
middleware), existing `manage_automation` authorization, including the credential's
SocialAccount override, and one unambiguous active workspace Facebook credential.
The Marketing ad account must occur in the credential's `/me/adaccounts` response;
campaign parentage and returned ad parentage must agree. Missing credentials are
disconnected only after authorization. Provider failures use safe codes/statuses;
provider 401 means denied provider access, never revoked application authentication.
Malformed collections are failures. Bounded Graph responses with another page are
explicitly partial; a missing item on a partial membership read is unverified,
never proof that the item does not exist. Pagination URLs/tokens are not exposed.

Owner: bot/Meta integration maintainers. Removal criteria: retire this extension
only when a replacement preserves scoped Marketing API parentage, per-campaign
recovery, validated payload selection and equivalent authorization/browser tests.
Multiple Facebook credentials require explicit credential selection in a future
Meta extension; this picker reports ambiguous/unavailable rather than choosing one.
Legacy Meta health and spend-sync consumers retain their separate owners; this
batch does not migrate them or claim live Meta connectivity.

## Bot inspector and trigger field ownership (Stage 6D)

Owner: bot editor frontend maintainers. NodeInspector maps the existing node
schema to canonical fields; TriggerConfigModal owns one configuration/draft per
trigger type, keyed by identity/workspace/flow. The small editorMessages label map
translates existing schema terminology; it is not a new field primitive. Remove a
legacy field mapping only when its node is retired or a schema-driven inspector
preserves the same ordering, interpolation, unknown properties and JSON fallback,
with node/flow switching and invalid-input recovery regressions passing.

Per-node field drafts belong to the editor instance. Invalid intermediate JSON or
numbers cannot overwrite the last valid object or silently disappear on node
switch/mobile drawer unmount. Save/publish/autosave consult the same validity guard.
Failed saves retain draft/configuration; generic JSON accepts only object values
and commits on blur. Node patches include their explicit owner. Async persona and
workspace active-flow reads cannot mutate a newly selected node.

Deletion uses the existing shared Modal alertdialog. Cancel restores its trigger;
a confirmed deletion captures the target and supplies the canvas as returnFocusRef
to the existing Modal/Drawer when that trigger is removed. returnFocusRef is an
optional explicit fallback; ordinary overlay restoration remains unchanged. Initial
confirmation focus waits one animation frame for the existing Radix dismissal layer
to register, so an immediate Escape cannot also close its inspector Drawer.

Owner: editor/feature maintainers for untouched VariableInserter, older editor
helpers, legacy help/preview copy and settings/destructive families. Remove their
legacy behavior per surface after canonical field/overlay and localized
keyboard/contrast/failure evidence exists. Canvas coordinates, ReactFlow geometry,
node metadata color and WhatsApp-specific preview presentation are valid extension
styles; deleting them to lower a static count is not a removal criterion.
