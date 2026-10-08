# Stage 6 gap assessment

Baseline: origin/main `3fad6641f956575ab21b6fcb2d54a3faad7ea7fb` (2026-10-06).

Root/frontend AGENTS.md; FRONTEND_CONTRACTS, ACCESS, PLATFORM_INTEGRATION_CONTRACT, STAGE5_COMPOSER and account health inspected. Issue bodies/comments fetched on 2026-10-06; #103/#106/#112/#111/#114 have no comments. Merged prerequisite PRs: #110, #155, #157, #158, #159, #160, #161, #162; their commits are ancestors of baseline. #103 is already closed, #106/#112 remain open. Closure is not evidence that every route was migrated.

Statuses: **done** means existing implementation and validation identified; **remaining** means implementation or acceptance evidence is incomplete; **dependency** means an actual unavailable prerequisite. A broad criterion is remaining if only part is covered. No missing merge prerequisite found. No new provider or health model is needed. Live provider transport/credential validation is unavailable in this environment; offline fixtures cannot establish it.

Delivery order: A Inbox/Engagement → B Analytics/Reporting → C route-family/editor visual and state contracts. Each PR must state its remaining criteria explicitly. No Closes directive until every criterion below has implementation and validation evidence.

## #103

| Criterion (original) | Baseline status | Evidence / action |
| --- | --- | --- |
| `components.json` برای Next App Router + RSC/TSX/aliases واقعی اصلاح شود و CLI overwrite ایمن آزمایش شود. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| یک primitive معتبر و مستند برای Button/Input/Textarea/Select/Combobox/Checkbox/Radio/Switch/Dialog/Sheet/AlertDialog/Tabs/Menu/Tooltip/Table/Toast/Skeleton/Empty/Error. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| adapterهای legacy فقط با owner و معیار حذف مشخص باقی بمانند؛ wrapper جدید موازی ممنوع. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| form contract مشترک: label/help/error/pending/disabled/autofocus/submit/validation. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| destructive actionها از AlertDialog/confirmation contract مشترک استفاده کنند. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| keyboard/focus/restore/Escape/nested overlay/RTL/accessibility behavior browser-tested باشد. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| shell + auth | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| dashboard + collection/list surfaces | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| settings + Connected Accounts | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| composer + scheduling | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| inbox/engagement | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| analytics/reporting | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| fullscreen/complex editors | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| marketing surfaces در حدی که product brand مشترک لازم دارد | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| API مستند برای primitiveها و پنج page pattern. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| هیچ visual token جدید page-local بدون دلیل ثبت‌شده اضافه نشود. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| viewportهای 360/768/1440 بدون overflow ناخواسته برای route familyهای اصلی. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| RTL/LTR، keyboard، contrast و reduced motion در browser coverage. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| platform brand metadata با semantic product colors تفکیک شده باشد و #112 بتواند provider جدید را بدون CSS ویژه feature نمایش دهد. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| بدهی inline/shared legacy با baseline قبل/بعد گزارش شود؛ هدف ممنوع‌کردن dynamic styleهای معتبر نیست. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| lint/typecheck/check:next/build/Jest/Playwright و design-system tests سبز بمانند. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| migration پالت کامل، hover/active/soft/focus/semantic/chart و aliases در canonical frontend/src/styles/tokens.css؛ نه theme موازی یا import مستقیم palette.json. | done | frontend/src/styles/tokens.css; frontend/e2e/frontend-contracts.spec.js |
| Noto Sans Arabic برای فارسی/عربی و Noto Sans برای لاتین؛ reuse loader محلی موجود و وزن واقعی 400/500/600/700/800. | done | frontend/src/app/layout.jsx; frontend/e2e/typography.spec.js |
| کنتراست، first paint و explicit/system dark بعد از migration دوباره بررسی شوند. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |

## #106

| Criterion (original) | Baseline status | Evidence / action |
| --- | --- | --- |
| قرارداد native `loading`, `error`, `global-error`, `not-found` و Suspense در route groupهای واقعی. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| failure موضعی feature کل ProductShell را بی‌دلیل از بین نبرد. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| root/global fallback بدون وابستگی به provider خراب قابل رندر باشد. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| public/server-safe data از Server Components/fetch با cache/revalidation صریح استفاده کند. | done | frontend/src/lib/auth/server.ts; docs/FRONTEND_CONTRACTS.md |
| private interactive/realtime data از TanStack Query یا abstraction معادل featureمحور استفاده کند. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| keyها identity/workspace/filter را کامل encode کنند و logout/account switch cache را invalidate کنند. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| AbortSignal/race prevention برای navigation/filter/workspace changes. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| transport/auth/permission/validation/not-found/rate-limit/provider error envelope قابل تشخیص باشد. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| 401/revocation با browser-session contract #110 هماهنگ باشد؛ outage/5xx credential معتبر را پاک نکند. | done | frontend/src/core/session; frontend/src/services/http/client.ts; frontend/e2e/frontend-contracts.spec.js |
| retry بر اساس status/idempotency باشد؛ mutation غیر idempotent خودکار replay نشود. | done | frontend/src/services/queryClient.ts; frontend/src/services/http/client.ts |
| inline error برای actionable state، toast برای notification؛ double-toast/false-success ممنوع. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| skeleton با layout واقعی و `aria-busy/status`. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| EmptyState فقط برای پاسخ موفقِ بدون داده؛ network/5xx هرگز empty نمایش داده نشود. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| no-results از empty dataset متمایز باشد. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| background refresh دادهٔ موجود را بی‌دلیل پاک نکند. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| form/editor input هنگام recoverable failure حفظ شود. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| offline/reconnect behavior مشخص و test-covered باشد. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| correlation/reference id امن در error surface/log integration قابل استفاده باشد؛ هماهنگ با #66. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| credential/private content در UI/log نشت نکند. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| slow network، initial failure، background error، malformed response، offline/reconnect و 401/403/404/429/5xx برای route familyهای اصلی تست شوند. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| network/5xx هیچ‌وقت EmptyState یا success تولید نکند. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| تغییر سریع workspace/account/filter stale result نشان ندهد. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| retry همان operation را با policy درست تکرار کند و mutation unsafe replay نشود. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| focus recovery، reduced motion و screen-reader status برای stateهای اصلی پوشش داشته باشند. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| shell و form input در failureهای recoverable حفظ شوند. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |
| lint/typecheck/check:next/build/Jest/Playwright سبز بمانند. | remaining | C: inspect route-family implementation and browser failure/visual evidence; existing primitive alone is insufficient |

## #112

| Criterion (original) | Baseline status | Evidence / action |
| --- | --- | --- |
| کارت/گروه platformها از registry ساخته شود؛ نام، icon/brand metadata، status، auth strategy و readiness hard-code نشوند. | done | backend/social_stats/views/connections.py; frontend/e2e/connected-accounts.spec.js |
| فرم اتصال generic بر اساس auth schema/strategy ساخته شود؛ OAuth redirect، API key، bot token و custom extension boundary مشخص باشد. | done | frontend/src/features/end-user/MyConnectionsPage.jsx; backend/social_stats/views/connections.py; backend/social_stats/tests/test_connected_accounts.py |
| multiple `SocialAccount`ها و destinationهای provider به یک قرارداد UI مشترک متصل شوند. | done | backend/social_stats/views/connections.py; frontend/src/services/domains/connections.ts |
| media/content modeها از capability و constraints استخراج شوند. | done | frontend/src/features/composer/ComposerPage.jsx; frontend/src/lib/composer.ts; frontend/e2e/stage5-composer.spec.js |
| validation generic برای max length، media count/type/size/aspect/duration و destination constraints قابل بیان باشد. | done | backend/social_stats/publishing_contract.py; frontend/src/features/composer/ComposerPage.test.jsx |
| provider-specific editor modeها extension slot داشته باشند، نه switch سراسری. | done | frontend/src/components/connections/composerExtensions.jsx; frontend/e2e/stage5-composer.spec.js |
| انتخاب چند platform intersection/compatibility را بر اساس capabilities محاسبه کند و incompatibility را واضح نشان دهد. | done | frontend/src/lib/composer.ts; frontend/src/features/composer/ComposerPage.test.jsx |
| inbox/comments/reviews/replies بر اساس capability ظاهر شوند. | remaining | A/B: engagement/metrics generic surface |
| conversation/destination metadata generic باشد و شناسه‌های خاص provider در adapter بمانند. | remaining | A/B: engagement/metrics generic surface |
| metric availability از provider metadata/contract بیاید؛ UI metric غیرقابل پشتیبانی را fake نکند. | remaining | A/B: engagement/metrics generic surface |
| sync/readiness/error states یک contract مشترک داشته باشند. | remaining | A/B: engagement/metrics generic surface |
| brand color/icon هر platform فقط presentation metadata باشد و semantic product colors را override نکند. | remaining | A/B: engagement/metrics generic surface |
| fallback امن برای provider بدون asset اختصاصی وجود داشته باشد. | remaining | A/B: engagement/metrics generic surface |
| provider fixture از #111 بدون تغییر در source کد Connected Accounts قابل نمایش/اتصال آزمایشی باشد. | done | frontend/e2e/connected-accounts.spec.js; backend/social_stats/tests/test_connected_accounts.py |
| همان fixture با capability `publish_text` در Composer ظاهر شود و با حذف آن capability کنترل publish ناپدید شود. | done | frontend/e2e/stage5-composer.spec.js |
| provider فاقد inbox/analytics هیچ UI دروغینی برای این قابلیت‌ها نگیرد. | remaining | A/B: engagement/metrics generic surface |
| هیچ فهرست duplicated از platform keys در featureهای اصلی باقی نماند؛ موارد استثنا مستند شوند. | remaining | A/B: engagement/metrics generic surface |
| RTL/LTR، light/dark، mobile/desktop و accessibility روی generic provider components تست شوند. | remaining | A/B: engagement/metrics generic surface |
| platform statusهای planned/experimental/beta/active به‌صورت یکدست و غیرگمراه‌کننده نمایش داده شوند. | remaining | A/B: engagement/metrics generic surface |

## Baseline debt

Record lint/i18n/architecture baselines and inline style inventory before/after each batch; do not remove legitimate dynamic styles merely to lower counts. Legacy builtins are flagged in `platforms/definitions.py`, owned by integration maintainers; retire each compatibility path only after its transport and conformance regression checks cover the shared execution boundary.

## Known implementation gaps

- Inbox hard-coded PLATFORM_PILLS; thread errors swallowed; list errors clear valid data; reviews hook has no scope/race/error handling; mobile detail hidden.
- Reply/review bypass runtime boundary; review permission and account read mapping need inspection.
- Analytics platform map duplicated; absent metrics coerced to zero; summary DTO totals are consumed as flat values; overlapping account/provider semantics aggregated; no race guards.
- Complex editors and other legacy families require criterion-level migration/evidence, not a blanket completion claim.

## Batch A implementation and evidence

The Inbox is a Collection + Detail two-pane extension of Page/PageHeader; on mobile, selection and Back expose one pane at a time. Reviews reuse this feature, not another shell. Provider-owned Telegram Suggested Posts remain behind a declared extension; financial approval restrictions are unchanged.

Generic account filtering consumes the scoped connections contract, permission projection, capability flags and engagement readiness. `platforms/engagement.py` and ProviderExecution own authorized delivery for HTTP and approval executors. Legacy publisher translation belongs to BasePlatformProvider.reply, owned by integration maintainers; remove it per provider after typed reply transport regressions pass. List/detail/review snapshots have scope/generation/AbortSignal ownership; background failure retains data, authorization/not-found hides it. Input is preserved on reply failure, and an ambiguous outcome locks further sending for manual provider reconciliation. No remote exactly-once claim is made.

Validation: frontend Jest 50 suites/197 tests, plus 7 targeted tests after label correction; backend Inbox/account/provider suite 38 tests, followed by 79 Inbox/RBAC/Telegram tests after approved delivery consolidation; lint/typecheck/check:architecture/i18n/check:next/build and conformance (11 providers) passed; migration drift was clean. Browser evidence covers fa/en, light/dark/system and 360/768/1440 with keyboard/error focus/input preservation. Baseline screenshots come from detached origin/main, not reconstructed UI.

Inbox/reviews inline JSX style sites: 72 before, 0 after. Dynamic provider metadata and legitimate media sizing styles remain at provider boundaries. Global lint/architecture/i18n debt baselines are unchanged; no thresholds were loosened.

Not yet certified: live provider credentials/transport, remote reconciliation or deduplication, and whole-issue completion outside these surfaces. B and C criteria remain pending; this batch does not close #103/#106/#112.

## Batch B — authoritative analytics/reporting

`PlatformManifest.analytics_metrics` describes source key, localized meaning, unit and period;
`analytics_sync_handler` is a provider-owned legacy adapter boundary. Product report and sync
surfaces contain no named provider branch or parallel health catalogue. `platforms/analytics.py`,
`WorkspaceViewSet.analytics_report` and `analytics-reports.ts` enforce account/date/page identity.
CSV export uses the identical authorized account/date filters; no cross-provider aggregation.
`DailyMetric.provider_metrics` records only actually received finite numeric values. Migration
0080 intentionally leaves old rows null: historical presence is unknown, never guessed as zero.
The existing legacy columns remain for their existing owners; this surface does not read them.

`AnalyticsPage` composes the existing Collection pattern. Account/filter changes remount the
query boundary; aborted/late reads and mutation responses cannot update another selection.
Same-key background failures retain measurements with an explicit stale warning, while
401/403/404 hide them. Sync queue acknowledgement is distinct from successful retrieval.
Sync health and freshness come from the existing account-health policy; zero/missing/unknown,
partial/stale/failure/unavailable have distinct text and state. Unknown metrics do not produce
charts. Provider-only descriptors prevent assumed cross-provider metric equivalence.

Validation: report parser Jest cases; Django `test_analytics_report_contract` (including the
standard independently registered fixture, zero/missing/history, tenant/export boundaries,
revoked actor and sanitized transport failure); provider conformance and multi-account tests.
Browser matrix and screenshot evidence live in `e2e/stage6-analytics.spec.js` and
`e2e/evidence/stage6/analytics-*`. Source baseline is the same detached origin/main as A.

Legacy owner: provider maintainers own `analytics_defaults.py`/sync task adapters; replace each
adapter only after its provider supplies typed metric descriptors and conformance-tested
`sync` execution. Existing historical rows need a genuine provider resync to establish metric
presence; inventing/backfilling values is forbidden. Live provider credentials are unavailable.

## Final criterion reconciliation (after A/B/C and bounded 6D/6E implementation)

The baseline tables above are historical and unchanged. **done** below is supported by the cited implementation and tests; **remaining** means the whole checkbox is broader than the certified surfaces, with its exact next action stated. Real dependencies are listed separately. Do not use a Closes directive for these issues.

### #103

| Original criterion | Final status | Implementation / validation or next action |
| --- | --- | --- |
| `components.json` برای Next App Router + RSC/TSX/aliases واقعی اصلاح شود و CLI overwrite ایمن آزمایش شود. | done | components.json; STAGE6_SURFACE_CONTRACTS isolated CLI overwrite evidence |
| یک primitive معتبر و مستند برای Button/Input/Textarea/Select/Combobox/Checkbox/Radio/Switch/Dialog/Sheet/AlertDialog/Tabs/Menu/Tooltip/Table/Toast/Skeleton/Empty/Error. | done | canonical components/ui API table; Primitives.test.jsx; frontend-contracts.spec.js |
| adapterهای legacy فقط با owner و معیار حذف مشخص باقی بمانند؛ wrapper جدید موازی ممنوع. | done | STAGE6_SURFACE_CONTRACTS legacy owner/removal table; ErrorState now DataState adapter |
| form contract مشترک: label/help/error/pending/disabled/autofocus/submit/validation. | remaining | Input/Textarea/Select tests and migrated forms satisfy the contract; older form families still have raw fields and need feature-owner migration |
| destructive actionها از AlertDialog/confirmation contract مشترک استفاده کنند. | remaining | Reports/BotFlow destructive confirmations use shared Modal alertdialog with Cancel focus; audit remaining older destructive actions before whole-issue closure |
| keyboard/focus/restore/Escape/nested overlay/RTL/accessibility behavior browser-tested باشد. | remaining | frontend-contracts, stage6 Inbox/Analytics/state/editor tests cover migrated overlays and keyboard; remaining legacy nested overlays need route-specific evidence |
| shell + auth | done | AppShell/EndUserShell inner ErrorBoundary; RouteFailure.test.jsx; frontend-contracts session tests |
| dashboard + collection/list surfaces | done | AdminOverview/ClientDashboard/ReportsPage; stage6-state-contracts.spec.js screenshots/status matrix |
| settings + Connected Accounts | remaining | ConnectedAccounts/MyConnections done in #161; Stage 6E migrates account profile/name/photo with scoped reads, safe save recovery and staged photo-removal confirmation; Security/Agency, account deletion, workspace business settings and other older settings forms remain |
| composer + scheduling | done | Composer #162; stage5-composer.spec.js; ComposerPage.test.jsx including stage6 scope handoff |
| inbox/engagement | done | UnifiedInboxPage/ReviewsPage/useInboxResource; stage6-inbox.spec.js and inbox-races tests |
| analytics/reporting | done | AnalyticsSurface/ReportsPage/PublicReportPage; analytics parser/backend reports tests and stage6 browser suites |
| fullscreen/complex editors | remaining | BotFlow/VideoStudio migrated scope/recovery and narrow drawer; TestMode/TriggerConfig now use shared Drawer/Modal with failure preservation and ambiguity guards; NodeInspector/trigger widget controls now use canonical fields with per-node intermediate drafts, validation, save recovery and confirmed-delete focus; other complex editor internals still need field migration; MetaAdsPicker scoped reads, validation, per-campaign recovery and authorization are covered by Stage 6D Meta tests |
| marketing surfaces در حدی که product brand مشترک لازم دارد | remaining | Existing MarketingLayout/tokens preserved; no broad marketing migration in stage6; typography/first-paint tests certify existing common brand only |
| API مستند برای primitiveها و پنج page pattern. | done | STAGE6_SURFACE_CONTRACTS API and five existing pattern tables, including documented extensions |
| هیچ visual token جدید page-local بدون دلیل ثبت‌شده اضافه نشود. | done | Migrated collections use canonical utilities/tokens; editor geometry is documented; no new palette/theme or unregistered visual token |
| viewportهای 360/768/1440 بدون overflow ناخواسته برای route familyهای اصلی. | done | stage6 Inbox/Analytics/state/Video suites at 360/768/1440; frontend-contracts/connected-accounts/stage5 existing coverage |
| RTL/LTR، keyboard، contrast و reduced motion در browser coverage. | remaining | RTL/LTR and reduced-motion/browser keyboard covered for migrated families; no exhaustive contrast audit of every legacy editor/control |
| platform brand metadata با semantic product colors تفکیک شده باشد و #112 بتواند provider جدید را بدون CSS ویژه feature نمایش دهد. | done | BrandIcon tests; provider metadata used for presentation only in new surfaces; no provider-specific feature CSS |
| بدهی inline/shared legacy با baseline قبل/بعد گزارش شود؛ هدف ممنوع‌کردن dynamic styleهای معتبر نیست. | done | Stage6 before/after inventory below, global baselines unchanged; genuine canvas/media/dynamic geometry retained |
| lint/typecheck/check:next/build/Jest/Playwright و design-system tests سبز بمانند. | done | Required local gates and full GitHub Tests workflow; final validation record/PR links |
| migration پالت کامل، hover/active/soft/focus/semantic/chart و aliases در canonical frontend/src/styles/tokens.css؛ نه theme موازی یا import مستقیم palette.json. | done | Existing canonical tokens.css and frontend-contracts.spec.js; no palette.json imports introduced |
| Noto Sans Arabic برای فارسی/عربی و Noto Sans برای لاتین؛ reuse loader محلی موجود و وزن واقعی 400/500/600/700/800. | done | Existing local loaders/fonts; typography.spec.js; no font/theme replacement |
| کنتراست، first paint و explicit/system dark بعد از migration دوباره بررسی شوند. | remaining | Visual light/dark/system matrix and existing first-paint coverage pass; exhaustive contrast certification for all older controls remains open |

### #106

| Original criterion | Final status | Implementation / validation or next action |
| --- | --- | --- |
| قرارداد native `loading`, `error`, `global-error`, `not-found` و Suspense در route groupهای واقعی. | done | Existing native group loading/not-found and new app/global-error; app/error uses provider-independent RouteFailure; next route/build checks |
| failure موضعی feature کل ProductShell را بی‌دلیل از بین نبرد. | done | Shell inner ErrorBoundary plus RouteFailure.test.jsx confirms chrome survives local render failure |
| root/global fallback بدون وابستگی به provider خراب قابل رندر باشد. | done | RouteFailure imports only React and pure messages; provider-free rendering test; global-error owns html/body |
| public/server-safe data از Server Components/fetch با cache/revalidation صریح استفاده کند. | done | Existing server-safe auth/session fetch and FRONTEND_CONTRACTS; public interactive report keyed by token intentionally uses Query |
| private interactive/realtime data از TanStack Query یا abstraction معادل featureمحور استفاده کند. | remaining | Inbox feature-owned resource, Analytics/Reports/Dashboard/Video Query mutations migrated; unrelated old useData hooks retain legacy ownership table |
| keyها identity/workspace/filter را کامل encode کنند و logout/account switch cache را invalidate کنند. | remaining | Changed keys include identity/workspace/account/thread/date/page; session logout/revocation invalidates; unrelated legacy QK detail keys require owner migration |
| AbortSignal/race prevention برای navigation/filter/workspace changes. | done | Changed resources use AbortSignal and scope/generation/mounted guards; inbox races, Composer/editor late-save tests, slow browser changes |
| transport/auth/permission/validation/not-found/rate-limit/provider error envelope قابل تشخیص باشد. | done | apiError and authoritative provider errors; status matrices; safe references; malformed DTOs rejected |
| 401/revocation با browser-session contract #110 هماهنگ باشد؛ outage/5xx credential معتبر را پاک نکند. | done | Browser-session #110 retained; tests prove transient failure preserves session/valid credentials and 401 invalidates |
| retry بر اساس status/idempotency باشد؛ mutation غیر idempotent خودکار replay نشود. | done | Query read retry is status-aware; mutation retry=0 and networkMode=always prevents offline queue/replay; queryClient.test.js |
| inline error برای actionable state، toast برای notification؛ double-toast/false-success ممنوع. | remaining | All changed flows use actionable inline recovery and validated success; unrelated legacy fetchers still toast/log raw errors and need owner migration |
| skeleton با layout واقعی و `aria-busy/status`. | remaining | DataState loading/refreshing aria-busy/status covered; not every legacy route has a layout-matched skeleton |
| EmptyState فقط برای پاسخ موفقِ بدون داده؛ network/5xx هرگز empty نمایش داده نشود. | done | Changed collection/report parsers reject malformed/5xx; browser initial failures never empty; EmptyState/DataState semantic contract |
| no-results از empty dataset متمایز باشد. | done | Inbox filters and Analytics dataset_count distinguish empty/no-results; Reports local month filtering; no-results tests/parser cases |
| background refresh دادهٔ موجود را بی‌دلیل پاک نکند. | done | Scoped same-key refresh retains data with stale/offline; browser matrices for Inbox, Analytics, Reports and Dashboard |
| form/editor input هنگام recoverable failure حفظ شود. | done | Reply, share/password, Composer, BotFlow, Video failures preserve drafts; actual mutation failure and late-result tests |
| offline/reconnect behavior مشخص و test-covered باشد. | done | Query paused/offline and safe reconnect reads; editor onlineManager pauses autosave; browser offline/reconnect plus no unsafe replay default |
| correlation/reference id امن در error surface/log integration قابل استفاده باشد؛ هماهنگ با #66. | done | apiError UUID/hex x-request-id and DataState referenceId filtering; errors.test.ts; RouteFailure safe generated incident callback |
| credential/private content در UI/log نشت نکند. | remaining | Changed errors/workers/public reports sanitized; no credential exposure in metadata/URLs; broad repository legacy logging still requires security/feature-owner follow-up |
| slow network، initial failure، background error، malformed response، offline/reconnect و 401/403/404/429/5xx برای route familyهای اصلی تست شوند. | remaining | Changed families have status/network/slow/background/malformed/offline evidence and existing session 401 tests; exhaustive matrix for every older route/editor is not certified |
| network/5xx هیچ‌وقت EmptyState یا success تولید نکند. | done | Validated response/status on every changed write; real backend/provider failed-result cases and browser transport failures |
| تغییر سریع workspace/account/filter stale result نشان ندهد. | done | Changed keys/scope remount and AbortSignal/mounted guards; account/thread/workspace/editor race tests |
| retry همان operation را با policy درست تکرار کند و mutation unsafe replay نشود. | done | Explicit read recovery; safe save intent reuses existing Composer key; unsafe reply/publication locks ambiguous outcomes; no offline queued writes |
| focus recovery، reduced motion و screen-reader status برای stateهای اصلی پوشش داشته باشند. | done | DataState SR status/busy, focused reply/editor/password error; shared overlay restore/Escape; reduced-motion browser matrix |
| shell و form input در failureهای recoverable حفظ شوند. | done | Shell local boundary and recoverable draft retention; shared report destructive failure retains table and modal |
| lint/typecheck/check:next/build/Jest/Playwright سبز بمانند. | done | Required checks and final GitHub Tests workflow; no thresholds relaxed |

### #112

| Original criterion | Final status | Implementation / validation or next action |
| --- | --- | --- |
| کارت/گروه platformها از registry ساخته شود؛ نام، icon/brand metadata، status، auth strategy و readiness hard-code نشوند. | done | Existing registry connections contract and connected-accounts tests #161 |
| فرم اتصال generic بر اساس auth schema/strategy ساخته شود؛ OAuth redirect، API key، bot token و custom extension boundary مشخص باشد. | done | Existing generic auth schema/extension boundary #161; provider-conformance and standard fixture |
| multiple `SocialAccount`ها و destinationهای provider به یک قرارداد UI مشترک متصل شوند. | done | Connections metadata + Inbox destination/account contracts; multiple account/backend regressions |
| media/content modeها از capability و constraints استخراج شوند. | done | Existing Composer publishing descriptor/constraint contract #162 and stage5 tests |
| validation generic برای max length، media count/type/size/aspect/duration و destination constraints قابل بیان باشد. | done | Existing publishing_contract.py and Composer validation tests; no duplicate model |
| provider-specific editor modeها extension slot داشته باشند، نه switch سراسری. | done | Existing composerExtensions/provider-owned extension registry; stage5 tests |
| انتخاب چند platform intersection/compatibility را بر اساس capabilities محاسبه کند و incompatibility را واضح نشان دهد. | done | Existing lib/composer capability intersection tests #162 |
| inbox/comments/reviews/replies بر اساس capability ظاهر شوند. | done | Inbox/Reviews derive capability+permission+readiness, no provider-name branch; standard fixture tests |
| conversation/destination metadata generic باشد و شناسه‌های خاص provider در adapter بمانند. | done | Shared conversation/thread account/destination metadata; scoped backend/query/list/detail/cursor/realtime tests |
| metric availability از provider metadata/contract بیاید؛ UI metric غیرقابل پشتیبانی را fake نکند. | done | Manifest.analytics_metrics and provider_metrics presence; unavailable/null/zero/partial/unknown parser and backend tests |
| sync/readiness/error states یک contract مشترک داشته باشند. | done | Existing health/sync policy reused; safe generic worker, readiness, freshness and failure/recovery tests |
| brand color/icon هر platform فقط presentation metadata باشد و semantic product colors را override نکند. | done | BrandIcon and provider presentation metadata separated from action/state colors in migrated surfaces |
| fallback امن برای provider بدون asset اختصاصی وجود داشته باشد. | done | Existing BrandIcon fallback + registry fixture; no custom feature CSS needed |
| provider fixture از #111 بدون تغییر در source کد Connected Accounts قابل نمایش/اتصال آزمایشی باشد. | done | Standard independently registered fixture and connected-accounts browser/backend tests |
| همان fixture با capability `publish_text` در Composer ظاهر شود و با حذف آن capability کنترل publish ناپدید شود. | done | Existing standard fixture Composer positive/negative capability tests #162 |
| provider فاقد inbox/analytics هیچ UI دروغینی برای این قابلیت‌ها نگیرد. | done | stage6 Inbox/Analytics positive/negative capability fixtures; no active unsupported control or fake chart |
| هیچ فهرست duplicated از platform keys در featureهای اصلی باقی نماند؛ موارد استثنا مستند شوند. | remaining | Changed primary surfaces removed named provider inventories; services/platforms.js and legacy consumers still own static catalogue compatibility, remove only after remaining consumer contract migrations |
| RTL/LTR، light/dark، mobile/desktop و accessibility روی generic provider components تست شوند. | done | stage6 generic component fa/en light/dark/system 360/768/1440 matrices plus keyboard/focus tests |
| platform statusهای planned/experimental/beta/active به‌صورت یکدست و غیرگمراه‌کننده نمایش داده شوند. | done | Connections registry status and capability support/beta checks; planned/unsupported actions never become active in migrated features |

### Real dependencies / limits

- No stages 0–5 merge prerequisite is missing. A → B → C is the implementation dependency; retarget dependent PRs only after their parent merges.
- Provider credentials/remote services are not configured. Real Telegram paid delivery, provider transport, rate limits, remote duplicate reconciliation and live analytics sync have not been exercised. Fixtures/conformance are not evidence of remote exactly-once behavior.
- Historical DailyMetric presence and SharedReport account scope cannot be recovered by guessing. Genuine provider resync / explicit new shared link is the recovery path.
- Captions backend is not implemented; the editor exposes unavailable rather than an active unsupported action.
- #103 was already closed on origin/main. Its broad legacy form/editor/contrast debt above still prevents a truthful whole-issue completion certificate. #106/#112 remain open; this series does not close them.

### Static debt inventory

Counts below are a diagnostic inventory, not an acceptance score. Scope is JSX `style={` sites and literal token references in the listed files, comparing origin/main 3fad664 to this series. Dynamic canvas positions, drag targets, media geometry and provider presentation styles remain valid.

| Source | Inline JSX style sites before → after | Literal `var(--...)` occurrences before → after |
| --- | --- | --- |
| `features/AdminOverview.jsx` | 194 → 0 | 52 → 0 |
| `features/ClientDashboard.jsx` | 133 → 0 | 93 → 0 |
| `features/ReportsPage.jsx` | 52 → 0 | 32 → 0 |
| `features/PublicReportPage.jsx` | 60 → 0 | 39 → 0 |
| `components/ui/ShareReportModal.jsx` | 51 → 0 | 24 → 0 |
| `components/ui/ErrorBoundary.jsx` | 13 → 0 | 17 → 0 |
| `components/ui/ErrorState.jsx` | 5 → 1 | 7 → 0 |
| `features/bots/BotFlowEditorPage.jsx` | 27 → 25 | 36 → 36 |
| `components/bot/TestModeDrawer.jsx` | 30 → 21 | 47 → 32 |
| `components/bot/TriggerConfigModal.jsx` | 41 → 28 | 44 → 29 |
| `features/video/VideoStudioPage.jsx` | 52 → 45 | 53 → 46 |

Global lint/i18n/architecture baseline files and dependencies were not edited. The actual visible finding count may fall as old source is migrated; valid dynamic styles were not removed to improve counts. See STAGE6_SURFACE_CONTRACTS.md for each adapter owner and removal condition.

### Final batch C local validation

112 Playwright cases passed against the final production build: status/slow/offline/reconnect matrices, publication approval, ambiguous test-run locking, password/report recovery and 72 locale/theme/viewport combinations. Actual baseline/after screenshots and failure evidence are in `frontend/e2e/evidence/stage6/`. Relevant Django suites passed 151 cases, including real SessionAuthentication CSRF verification and bot DTO scope. Lint, check:next, architecture, i18n, typecheck and production build passed without changing debt baselines. GitHub CI is recorded in PR #168 after final-head verification.

### Stage 6D — Meta Ads recovery

Rechecked latest origin/main `7ee976a`: #166/#167/#168 are merged; main Tests and
Security are green. #106/#112 remain open and #103 remains closed with the legacy
debt recorded above. Historical baseline tables are unchanged.

MetaAdsPicker now validates wire collections and ownership, cancels obsolete reads,
preserves verified same-scope data on recoverable refresh failure, hides denied
data, rejects unverified selection at trigger publication and gives per-control
recovery. Workspace/account permission and campaign/ad parentage use the existing
backend authorization contract. `MetaAdsPicker.test.jsx`, `stage6d-meta.spec.js` and
`test_meta_ads_scope.py` provide slow/failure/malformed/refresh/offline/race and
permission/isolation evidence. Before images are from detached `7ee976a`; after
images capture failed refresh with retained selection under `e2e/evidence/stage6d/`.
The frontend/Meta integration owner and extension removal criteria are recorded in
STAGE6_SURFACE_CONTRACTS.md.

Remaining: older settings/form/destructive-action families, other complex editor internals,
legacy useData/key/aggregate/static catalogue consumers, route-specific skeletons,
raw logging/copy and exhaustive legacy overlay/contrast/failure matrices. No Stage 7,
#116, dependency upgrade or broad adapter removal is part of this batch. Multiple
Meta credentials fail closed; bounded provider collections explicitly report partial
data. Mock Graph/browser recovery tests do not certify live Meta credentials or
remote API behavior.

### Stage 6D — Bot editor controls (dependent on Meta recovery)

NodeInspector and TriggerConfigModal internal fields now reuse canonical Input,
Textarea, NativeSelect, Checkbox and Button. Labels, required/error descriptions,
pending/disabled behavior and keyboard access follow the existing field contract.
Node-owned intermediate number/JSON drafts survive node switching and drawer
remounts, block save/publication until valid and preserve the last valid schema.
Valid generic JSON replaces the object without losing deliberate key removals.
Ordered item lists, variable interpolation and unknown schema properties remain
intact. Flow/identity/workspace changes reject late persona/trigger responses; the
existing active-flow list read is scoped and abortable with local retry.

BotFlowEditor changes are limited to draft validity/ownership and captured delete
target integration. Its existing save, TestModeDrawer and overlay architecture are
retained. Confirmation cancellation restores the delete trigger; successful removal
uses the existing Modal/Drawer returnFocusRef fallback to the canvas after the
trigger disappears. Genuine canvas geometry and provider preview styles remain.

Evidence: NodeInspector/TriggerConfigModal/Primitives Jest cases and
`stage6d-controls.spec.js` cover invalid JSON/numbers, switching, ordered items,
save failure/manual recovery, confirmation and focus, including 20 immediate
Cancel-focus/Escape cycles without closing the inspector. The 18 node matrix cases
cover fa/en, RTL/LTR, light/dark/system, 360/768/1440 and reduced motion; trigger
cases cover keyboard input and recovery at both narrow/wide widths. Before images
are from detached `7ee976a`; after images include actual fixture save failures in
`frontend/e2e/evidence/stage6d/`. Final test/CI results are linked in the two PRs,
which must merge Meta first, controls second. No test/baseline/threshold is relaxed.

The remaining Stage 6 criteria above remain **remaining**: whole settings/form and
destructive-action coverage, other complex editors/VariableInserter and legacy
copy, old useData/key/aggregate/static catalogue consumers, layout-specific route
skeletons, raw logging and exhaustive legacy overlay/contrast/failure matrices.
#106/#112 stay open; #103 stays closed without a whole-issue completion claim.
Stage 7/#116, upgrades and real Meta connection certification are out of scope.

### Stage 6E — Account profile form and photo recovery

Started from origin/main `f781fbc` after #171/#172 merged; main Tests and Security
passed. #106/#112 remain open and #103 remains closed. Historical baseline tables
are unchanged. This bounded family is UserSettingsPage's Profile Information form,
not the entire Settings route or workspace business profile.

ProfileSettings consumes the existing account-owned `/profile/` GET/PATCH API and
existing canonical Input/Button/Modal/DataState. Keys and draft remounts include
user, role, account type and workspace context. The backend intentionally derives
the target user from SessionAuthentication, not a submitted user/workspace ID;
no backend or migration change is needed. GET validates the user ID, names, email
and safe photo URL; PATCH validates its distinct returned name/photo shape.
Obsolete reads abort, late writes after context changes cannot update the new
form/cache, recoverable refresh keeps edits, and authorization/not-found hides
cached private data. Initial read failure never becomes a guessed editable profile.

Photo removal uses the existing alertdialog with Cancel initial focus and trigger
restoration. Confirmation stages removal in the local draft; only Save applies
it. A failed save retains names, selected File and removal intent. Writes have a
synchronous pending guard, are not replayed automatically and show safe inline
failure. Uncertain save copy calls for server verification before manual retry;
no remote atomic/exactly-once guarantee is claimed. Blob previews are revoked on
replacement/unmount. Discarding an unsaved upload clears only its File/input/preview,
restores the saved photo and focuses the upload control; it never emits remove_avatar
or stages persisted-photo deletion. File selection has image/5 MB checks and clears after a
verified success. Technical email direction uses existing LTR styling.

Evidence: ProfileSettings Jest tests and stage6e-profile.spec.js cover malformed
responses, initial/background failures, 403/404/429/503, slow reads, offline/reconnect,
identity/workspace late responses, validation, file recovery and confirmation.
The browser matrix covers fa/en, RTL/LTR, light/dark/system, 360/768/1440,
keyboard/focus and reduced motion. Before/after failure screenshots are in
frontend/e2e/evidence/stage6e. The baseline uses the pre-batch 6D production build;
its UserSettingsPage source blob matches origin/main `f781fbc` exactly.

Remaining: account deletion, Security/Agency, developer/privacy settings,
workspace business-profile forms and their destructive actions; other complex
editor controls/VariableInserter, legacy data hooks/keys/static catalogues,
route-specific skeletons, raw logging/copy and exhaustive legacy contrast/failure
coverage. No Stage 7/#116, provider work, adapter-wide removal or dependency change.

### Remaining recovery rollout — latest main after #174

Reconciled against main `db9020528e31fd035ad89efd036329e6022c1c60` on
2026-10-07. #166–#168, #171–#173 and #174 are merged. The issue comment describing
an unmerged Stage 6 stack is historical. MetaAdsPicker, NodeInspector,
TriggerConfigModal, BotFlowEditor and ProfileSettings retain their existing
contracts and tests; these implementations are not repeated. #70/#67 are complete.

Two active legacy surfaces are migrated here:

- Sync Logs: `useSyncLogs` uses Query ownership including user/role/account type,
  workspace and requested client, passes AbortSignal and validates the collection.
  Same-key refresh failures retain rows and local filters; 401/403/404 hide private
  rows. Empty is possible only after a verified success. No-results clears filters.
  This endpoint returns the latest 100 records; filters explicitly apply to loaded
  records, not a claim of exhaustive history. Provider keys come from returned
  records, including unknown providers. Raw provider exception text is excluded
  from the display DTO rather than exposed in an expandable error cell.
- Active sessions: the existing account-owned GET and POST contracts are unchanged.
  Keys and draft remount include resolved identity/workspace. Validated reads,
  status-aware retry, offline/reconnect, local errors and retained background data
  replace guessed empty lists. Revoke uses the canonical alertdialog with Cancel
  initial focus and trigger/heading restoration. Pending writes lock dismissal and
  submission. A malformed or uncertain result never announces success; a verified
  read is required before manually retrying an uncertain operation. Late writes
  after context changes cannot update the new screen. No mutation is automatically
  retried or queued. Sign-out-everywhere copy accurately includes the current
  browser session: the existing API receives no browser-readable JWT/keep_jti.
  Changing which sessions the backend revokes is outside this migration.

Acceptance is assessed at whole-issue scope below. Previous "done" rows describing
changed families are evidence for those families, not a certificate for every
legacy route. **#106 remains open.**

| Original #106 criterion | Current whole-issue assessment / evidence |
| --- | --- |
| Native loading/error/global-error/not-found/Suspense | Implemented: native route fallbacks, `RouteFailure`, account Suspense; existing RouteFailure/frontend-contracts tests. Legacy layout-specific skeleton coverage remains below. |
| Local failures retain ProductShell | Implemented in migrated families, including these two; `ErrorBoundary`, browser shell assertions. Remaining legacy raw-response render paths require family coverage. |
| Root/global fallback independent of providers | Complete: `app/global-error.jsx` and provider-free `RouteFailure`; existing Jest/browser evidence retained. |
| Public/server-safe cache/revalidation | Complete for current server DAL: no-store request-owned auth; public report intentionally uses token-scoped Query. No new server fetch introduced. |
| Private feature-owned data abstraction | Remaining: old useData OAuth/overview/goals/alerts/lookups and NotificationBell's separate notification reader; Sync Logs is now migrated. |
| Identity/workspace/filter keys and cache invalidation | Resolved provider replacement/clear on identity/logout is implemented in AppProviders. Remaining legacy local readers do not encode all ownership and must be migrated; these two queries and their race tests are complete. |
| Abort/race prevention | Complete for migrated families; new hook/component and browser tests cover delayed reads and writes on account/workspace switch. Remaining old readers lack the same guarantee. |
| Distinguishable error envelope | Shared apiError/status/reference contract implemented. These two validate malformed collections/writes and never expose raw errors. Remaining legacy consumers still flatten errors. |
| 401/revocation; 5xx preserves credentials | Complete shared #110 contract; new browser 401 cases use real client invalidation and redirect, 503 cases preserve the shell and permit recovery. |
| Retry by status/idempotency | Shared Query policy complete (429/auth/malformed not auto-retried; transport/5xx reads retry once). New revocations do not auto-retry and uncertain outcomes require verification. Audit remaining manual mutation paths separately. |
| Inline actionable errors; no double-toast/false-success | Complete in migrated families. Remaining MFA/APIKeys/privacy, NotificationBell actions and other legacy mutations still need checked success and inline recovery. |
| Layout skeleton; busy/status | These collections use canonical skeletons and busy/status. Remaining legacy route loaders are not all matched to page layout. |
| Empty only after success | Complete in migrated families including these two. Remaining `DataPrivacySection.loadAll` synthesizes empty/default responses on errors; MFA status failure still falls through to disabled UI. |
| No-results differs from empty | Complete in migrated collections; Sync Logs browser/Jest covers both. Remaining legacy collection consumers need individual verification. |
| Refresh retains loaded data | Complete in migrated families and these two; new malformed/background/offline browser cases. Remaining old state hooks need race/refresh coverage. |
| Recoverable failure retains form/editor input | Existing Profile/Composer/Bot/Video/reply recovery retained. New session confirmation preserves captured target. Remaining account deletion/password/agency, developer/privacy and workspace business-profile drafts need their own guarantees. |
| Offline/reconnect | Shared safe Query reconnect and no queued writes retained; these two browser flows and revocation replay tests pass. Remaining local polling/mutation families need migration. |
| Safe correlation/reference integration | Implemented shared contract and validated x-request-id surfaces; new browser references are asserted. Remaining legacy surfaces do not all use it. |
| No credential/private-content leak | Changed surfaces use checked DTOs and semantic failures, omitting provider diagnostics. Remaining raw error/log consumers require owner migration; no repository-wide certification. |
| Slow/initial/background/malformed/offline/status browser matrix | Covered for previously migrated main families and these two. Remaining settings, notification/action and legacy editor families prevent whole-issue completion. |
| Network/5xx never empty/success | These two are covered by parser, Jest and browser regressions. Known privacy/MFA/notification gaps above remain. |
| Rapid scope/filter changes never stale results | These two now have hook/component and browser identity/workspace races; Sync Logs filters are synchronous local views. Remaining old local readers need equivalent guards. |
| Retry repeats same operation safely | New read retry preserves scope; revocation retains target, verifies ambiguous outcome and does not replay on reconnect. Remaining manually implemented mutations need status/idempotency review. |
| Focus/reduced motion/screen-reader | These two use DataState/canonical controls and browser keyboard, Cancel/Escape, focus restoration, busy/status and reduced-motion checks in fa/en light/dark at 360/1440. Remaining family matrices are incomplete. |
| Shell and inputs retained | These two browser/unit regressions plus existing Stage 5/6 editor/profile evidence. Remaining legacy forms and sibling-section partial failures still need coverage. |
| Required checks stay green | Validation belongs to the final PR/CI result. Existing lint/i18n/architecture thresholds and dependencies are unchanged. All-files pre-commit has existing repository hygiene/Ruff debt; unrelated autofixes must be restored. |

Implementation/test references: `lib/recoveryCollections`, `useData.useSyncLogs`,
`SyncLogsPage`, `settings/components/ActiveSessionsList`, their Jest regressions
and `e2e/state-recovery-remaining.spec.js`. Before images in
`e2e/evidence/state-recovery` are from detached main `db90205` with initial 503;
after images demonstrate initial failure recovery and failed background refresh with retained rows. Browser
transport fixtures do not certify live provider availability or remote exactly-once
delivery. No backend/session/provider schema or dependency is changed.

Next priority by user impact: MFA and privacy/deletion (false disabled/default
state and destructive actions), API keys/password/agency/workspace forms, then
notification/alert polling and actions plus other live legacy data-hook consumers.
GoalTracker and useOverview/useGoals currently have no active route consumer;
do not prioritize unused abstractions ahead of live failures. Finish the remaining
editor controls and route skeleton/failure/accessibility matrices afterward.

**#112 coordination:** neither migrated flow depends on new provider capabilities.
Sync Logs displays returned provider identifiers without a duplicated platform
inventory. Actual remaining catalogue coupling is `services/platforms.js`,
`useLookups`' PLATFORM_LIST filtering, and its Settings/Onboarding/PostIdeas/MyPosts
consumers. Their registry metadata/unknown-provider semantics must be reconciled
with #112 before retiring the static compatibility catalogue. Recovery migration
of those reads does not require waiting for a new provider or changing #111/#110.

### Account security and privacy recovery — main after #175

Started from `3e5751f894f174f31386751504dccf96398a5974`, the merge of #175.
Read root/frontend AGENTS, CONTRIBUTING, complete #106/#112 bodies/comments,
recent merged PRs #171–#175, the assessment above and current APIs/components.
The historical unmerged-stack comments are superseded by current main ancestry.
#70/#67, Sync Logs, Active Sessions, profile, bot controls and Meta Ads work is
retained. No provider/session/API-client defaults or debt thresholds are changed.

The pre-implementation reconciliation above still applies at whole-product scope.
Native route/root boundaries, the shared #110 session/error/read-retry contract,
scoped provider cache replacement and migrated collection/editor families are
implemented and retain their evidence. This batch resolves the known MFA
false-disabled and privacy fabricated-default gaps, plus the two distinct account
deletion paths. It does **not** certify all legacy features or close #106.

| #106 criterion group | This batch's implementation / evidence | Whole-product remainder |
| --- | --- | --- |
| Feature ownership, identity/workspace keys, abort/race protection | `accountRecovery` uses account-owned Query keys including role/account type/workspace, AbortSignal and keyed draft remounts. Late writes cannot apply to a replacement context. Parser/component/browser race regressions. | Other legacy local readers and polling paths still need ownership migration. |
| Error envelope; 401 vs outage; retry/idempotency | Existing `apiError`, safe references, cookie session and Query read retry are reused. Writes have synchronous guards and no queue, retry or reconnect replay. Auth/permission/not-found hide affected data. | Legacy raw failures and manually written mutations outside this family remain. |
| Initial/loading/refresh/empty/offline/forbidden/not-found/error | Checked DTOs; initial failure cannot imply disabled MFA, no consent, running processing or absent deletion. Each privacy card has its own read/state/retry. Valid empty collections/null request are explicit; MFA has enabled/disabled/pending states, not collection empty. Skeleton/busy/status reuse existing primitives. | Route-specific skeletons and exhaustive legacy family matrices remain. |
| Data/draft preservation, local partial failure | Valid same-scope data, enrollment/code input, newly issued codes and deletion reason/typed confirmation survive recoverable failures. Valid mutation DTOs update only their resource; failed subsequent GET retains the acknowledged result. | Password/agency/business and other legacy drafts remain. |
| Valid mutation outcome; no false success | Setup, verify, rotate, disable, export, consent, processing, scheduled deletion/cancel and immediate DELETE each validate their distinct response. Clipboard success waits for the actual Promise. Processing is per owned workspace and requires one affected row; no guessed aggregate pause boolean. | API-key create/revoke/copy and notification/alert actions remain. |
| Focus, keyboard, pending, reduced motion | Existing Modal/alertdialog uses Cancel initial focus and trigger/heading restoration; pending prevents dismissal and duplicate submission. Inline failure receives focus; successful read recovery restores the heading. Technical codes use LTR. fa/en narrow/wide evidence and browser keyboard/reduced-motion tests. | Other old overlays/controls need family-level evidence. |
| Secret/privacy safety and observability | MFA secret/QR/backup codes stay in component memory only; status DTO/cache excludes them. Error surfaces use semantic copy and validated reference IDs, not backend text. Export diagnostics are excluded and download URLs are checked against the existing token-download route. Synthetic fixtures only; sensitive browser tests disable trace/screenshot/video. | Repository-wide raw error/log/copy consumers are not certified. |
| Required regression/browser/build checks | `accountRecovery.test.ts`, `AccountRecovery.test.jsx`, `account-recovery.spec.js` and `test_privacy_recovery.py`; final validation reported in PR. Baselines unchanged. | Existing all-files hygiene/Ruff debt remains distinct from changed-file checks. |

#### Distinct wire contracts and recovery limits

- MFA `/auth/mfa/status/` is the authority for enabled/pending/count. Setup actually
  **rotates** the secret before verification; despite the backend's historical
  "idempotent" wording, it is never automatically retried. Verify enables MFA and
  returns ten one-time codes; regenerate replaces all previous codes; disable
  returns `{ok:true}`. Malformed/lost writes are uncertain, require a verified
  status read and never emit success. Status cannot retrieve a lost seed/codes or
  prove which code generation is active. Restart/another rotation is an explicit
  new confirmation, with the replacement/invalidation consequence explained.
- Export GET is `{requests:[...]}` and POST is a single export DTO, subject to
  in-flight conflict/cooldown. An uncertain POST requires reading the list; active
  queued/processing exports prevent another request. No claim of exactly-once
  dispatch, delivery email or automatic replay is introduced.
- Consent GET returns a latest-decision map plus server-owned `available` types;
  an omitted decision is explicitly "not recorded" rather than a network-derived
  false. POST is append-only and must acknowledge the same type/value/date.
- Processing GET is owned workspace rows. POST targets one captured workspace
  (existing client/workspace vocabulary adapter retained) and must acknowledge the
  requested boolean and exactly one affected workspace. Zero affected is failure.
- Privacy deletion uses the existing 30-day POST request and POST cancellation.
  A backward-compatible authenticated GET on `/privacy/delete-account/` now
  returns `{request: latestAccountOwnedRequestOrNull}`. This was the missing
  reconciliation reader; it never queues deletion and ignores supplied user IDs.
  GET includes cancelled/processing/completed/failed states instead of fabricating
  "no deletion" from exports. POST's existing queued-request idempotency and
  cancellation behavior are retained. Unknown request/cancel outcomes require
  verified GET before any new confirmation; cancellation 404 is not success.
- The separate client profile DELETE is **immediate**, has no grace/cancel/status
  endpoint and returns the existing exact `detail` acknowledgment. Unknown
  completion locks further deletion and calls for checking account access/support;
  it cannot safely be inferred from an unrelated failed profile GET. Verified
  deletion followed by failed logout retries **only** the existing logout operation.
  These tests use mocked transport or isolated Django test users, never live deletion.

#### Actual #112 dependency and next batch

MFA/privacy/deletion need no registry, provider capability or catalogue change.
The remaining #112 dependency is still the static catalogue/`useLookups` coupling
and Settings/Onboarding/PostIdeas/MyPosts consumers identified after #175. Those
metadata/unknown-provider semantics must be reconciled before removing the adapter;
independent recovery work can proceed now.

Next priorities, verified against active source rather than redoing merged work:

1. `SettingsSections.APIKeysSection`: unchecked list/create/revoke DTOs, ambiguous
   one-time key issuance, unawaited clipboard, legacy destructive confirmation and
   missing context/refresh preservation. Treat newly issued keys like MFA codes.
2. `UserSettingsPage.SecurityTab` password and `AgencyTab`, then workspace business
   forms in `SettingsPage`: checked outcomes, pending guards, retained input,
   scoped/abortable reads and accessible confirmation/recovery. Password change
   and agency disconnect must keep their actual session/role-specific semantics.
3. `NotificationPreferences`, `AlertBell`/notification reader and `useAlerts`/AlertsPage:
   scoped polling, malformed DTOs, local failures, permission/reconnect and checked
   action outcomes. Preserve the fixes already made to session/operations paths.
4. Remaining live legacy data hooks/keys, editor helpers, catalogue consumers and
   route skeleton/accessibility/failure matrices. Unused overview/goals abstractions
   still follow live user-impacting failures.

Before/after evidence lives in `frontend/e2e/evidence/account-recovery/`; before
uses detached main `3e5751f`, and after uses actual failed reads/retained state in
fa/en, RTL/LTR, dark/light at 360/1440. No secrets, QR or backup codes are captured.
Fixture evidence does not certify remote exactly-once behavior or real accounts.


Final local validation (Node 20.20.2 / Python 3.12): 65 Jest suites / 328 tests,
694 Django tests (3 existing skips), production build, typecheck, lint (zero
errors/regressions), i18n (747 semantic keys), check:next, architecture and both
production/mismatched-runtime proxy checks passed. Browser validation covered
141 distinct changed/adjacent cases: the 135-case MFA/privacy/profile/session/log
run plus six added initial-offline/initial-failure evidence cases; thirteen final
context/keyboard/evidence cases were rerun successfully with normalized fixtures.
Six baseline captures used the detached main production build. Changed-file
pre-commit passed; all-files Gitleaks and Bandit passed. Mandatory all-files
pre-commit still reports the pre-existing hygiene/Ruff debt (271 findings before
fixes). Unrelated autofixes and regenerated historical evidence were restored;
no gate or debt baseline was weakened. Full Docker/ingress and full browser CI
results belong to the PR's Tests workflow, not a local certification.

## UI completion batch — main after #176

Baseline `a9644ef` (2026-10-07), latest main fetched before changes. Root/frontend
AGENTS, CONTRIBUTING, full bodies/comments of #106/#115/#116/#112, merged #175/#176,
recent main ancestry, this assessment and Ravinta v1.1 files inspected. Historical
stack comments are superseded by merged main. Operations #70/#67, sync/session,
MFA/privacy/deletion, profile, bot and Meta Ads implementations are retained.

### Pre-implementation scope reconciliation

| Issue / criterion | Verified existing implementation | Remaining work / acceptance evidence |
| --- | --- | --- |
| #106 boundaries, read retry, session/error transport | App native loading/error/global-error/not-found; provider-independent RouteFailure; queryClient/status/idempotency and cookie session contracts, migrated Stage 5/6 families, #175/#176 regressions | Existing route and family tests do not certify every legacy consumer; full family failure/accessibility matrix remains |
| #106 account keys/password | Real backend collection/create/revoke, profile eligibility and password validators | SettingsSections APIKeysSection fabricates empty collections, accepts unchecked writes, unawaited clipboard; SecurityTab defaults non-social after failed profile and accepts any password response |
| #106 agency/business | Existing role-scoped backend and workspace APIs | AgencyTab converts failure to disconnected; SettingsPage business read/write lacks race/checked DTO/draft contract |
| #106 notifications/alerts | Existing polling and notification preferences endpoints | NotificationBell ignores read failures; useAlerts retains cross-context local rows, unchecked writes; preferences reader/writer unchecked; no complete local failure matrix |
| #106 remaining hooks / catalogue | Scoped migrated collections/editor/report consumers | Live legacy readers, editor helper failures, lookups and raw errors need final consumer inventory; unused useOverview/useGoals are not live blockers |
| #115 fonts/weights/locale | Local Noto variable fonts, OFL files, i18n.css role weights/locale line boxes, typography.spec and catalog specimens | Audit active override consumers, theme.js contradictory roles, actual control clipping and product matrix beyond catalog; first paint/hydration/system/200% validation at final head |
| #116 tokens/mark | Canonical tokens and approved geometric SVG master; shared BrandLogo exists | Duplicate accessible names, incomplete variants/clearance, text-only provisional wordmark; full name/install/metadata inventory and contrast/provider provenance evidence |
| #116 external acceptance | README/palette mark name proposed; BRAND specifies spelling, master mark approved | Final outlined Persian/Latin lockups not delivered; domain/handle/trademark verification absent. Cannot close issue or fabricate approved assets/availability |

Execution: first API Keys/password PR; second remaining state families; third
active typography; fourth independent brand rollout. Each targets main. A dependent
branch must reconcile with newly merged main and rerun required checks before merge.
No automatic merge is requested. None of these scope observations authorizes a
Closes directive until all original acceptance criteria are verified.

Real #112 dependencies: `services/platforms.js` compatibility catalogue,
`hooks/useData.js:useLookups` filters backend keys by PLATFORM_LIST; named platform
lists in SettingsPage/Onboarding/PostIdeas/MyPosts still need registry and unknown
provider semantics. This blocks a whole-product claim of exclusively metadata-led
provider presentation (#116) and completion of these data consumers (#106), not
account recovery or typography. No provider or commercial feature is added.

### API Keys / password implementation

`keyPasswordRecovery.ts` validates the distinct wire contracts and projects list
metadata without secrets/hashes/raw diagnostics. `APIKeysSection` uses account,
role/type and workspace identity; GET requests include captured authorized workspace
and include_inactive=1 for authoritative revocation reconciliation. The checkbox
filters that complete collection locally, with empty vs no-results distinction.
Scopes/IP allowlist and backend ownership are preserved. Create must return a full
one-time key matching its prefix/name/scopes/IPs and active metadata. Only metadata
enters Query cache; the full value stays in the keyed component's transient state.
Refresh failure preserves draft and issued value; denied reads hide private data.
Clipboard success follows the awaited writeText Promise. Writes have a synchronous
pending guard and no automatic replay/reconnect queue.

Ambiguous issuance requires a checked list and explicit acknowledgment before a
separate operation; the list cannot prove which request issued a row or retrieve
the full key. Revocation reconciliation observes target inactivity, not causation.
No lost-key recovery or exactly-once assertion is made. Password eligibility uses
validated profile id/is_social, not a default. The password write accepts only the
actual detail acknowledgment. A malformed/lost result retains input and locks
resubmission: neither profile GET nor session status can prove its outcome.

Backend `views/profile.py:change_password` updates the password hash without
`update_session_auth_hash` or tracked-session revocation. Django cookie sessions,
including the current one, therefore fail authentication on their next request;
native JWT and tracked rows are not explicitly revoked. UI copy states this actual
contract. MFA/session controls remain independent of password eligibility/read
failure, including social accounts. Tests use mocked transports or isolated users;
no live revoke/password action and no credential images/traces are recorded.

Evidence and required-check results are recorded with the PR; whole #106 remains
open pending agency/business/notifications/alerts and final legacy family coverage.

API/password local validation: Node 20.20.2 and Python 3.12; full Jest 67 suites /
343 tests, Django 696 tests (3 existing skips), build/typecheck/lint (0 new errors
or file/rule regressions), i18n (779 semantic keys), check:next and architecture
passed. Production proxy contract check passed. The 19-case changed-flow browser
suite passes: statuses including terminal session 401, malformed read/write,
background failure, offline/reconnect/no replay, duplicate pending revoke, focus
recovery and credential-free fa/en dark/light screenshots. Unit coverage includes
issued-key cache exclusion, awaited clipboard failure and late identity response.
The isolated Django test confirms actual cookie hash invalidation after password
change. Required all-files pre-commit reports the same prior hygiene/Ruff debt
(271 findings, 114 autofixes); 99 unrelated modified files were restored. All-files
Gitleaks/Bandit and changed-file pre-commit passed; no baseline/assertion/policy was
weakened. UI screenshots under `e2e/evidence/key-password` exclude secrets.

PR #177 review follow-up: checked issuance now accepts exactly the backend's documented 50-entry / 80-character scope / 50-character IP truncation and warns when stored metadata differs; unrelated mismatches still fail validation. API key clipboard messages describe keys rather than MFA codes. Definite password HTTP 400 has localized rejection guidance, cleared on editing, while unknown mutations stay locked. Targeted 16 Jest tests and all 19 browser cases passed again; production build passed.

### Settings, notification and route recovery follow-up

Agency connection, business workspace profile, both preference surfaces and alert/notification feeds now use checked backend DTOs and the existing scoped read/action recovery contract. Shared recovery rendering moved to components/ui; old feature imports remain compatible. Identity includes user/role/type/workspace and feed filters; readers accept AbortSignal. Denied access hides only the affected data. Same-context outages preserve snapshots/drafts; malformed writes never announce success. Synchronous write guards, explicit status reads and no reconnect queue prevent automatic mutation replay. A status read observes current agency/preferences/alert state, never proves causation or exactly-once execution.

Agency disconnect validates the actual detail + opaque session acknowledgment. Session refresh is a separate recoverable read after known success, not a reason to replay disconnect. Confirmation focuses cancel, preserves failure and uses checked read after ambiguity. Notifications and alerts fail independently; invitations validate accepted/rejected acknowledgment and distinguish subsequent session refresh failure. Alert filters belong to query identity; keyboard activation, dialog focus/Escape recovery and polite statuses are explicit. Native account route-group loading/error boundaries reuse the provider-independent fallback, covering shell children without redoing #175/#176.

Business writes compare returned workspace identity and editable fields with the submitted draft. Existing competitors are read-only in ClientSerializer; multipart product_images[index] is not a supported upload contract. Those controls now describe their limits and competitor management stays in its existing flow. No backend capability is invented. Ambiguous profile writes preserve input and unlock only after explicit checked read; that does not prove which write won.

Validation before final prerequisite synchronization: 69 Jest suites / 350 tests passed; 32 browser cases passed (four families × 403/404/429/503/malformed, terminal 401, slow initial loading, malformed mutations, draft retention, duplicate guard, offline/reconnect, independent shell and focus). Four detached-main before screenshots plus four after screenshots contain only synthetic non-sensitive reader failures. Build, lint (413 existing findings, zero regressions), i18n and architecture passed. Branch then synchronized with the PR #177 review follow-up; final checks are recorded in its PR.

#106 remains open. Final live-consumer inventory still identifies MyPostsPage consuming the validated usePosts hook without rendering its failure states, useOAuthStatus/useLookups legacy readers and editor auxiliary requests. useOverview/useGoals/useGoalProgress have no current consumers and are not a live blocker. Provider catalogue exclusivity/unknown-provider capability behavior remains owned by #112 (`useLookups`, services/platforms.js and the named Settings/Onboarding/PostIdeas/MyPosts consumers). Follow-up priority is live auxiliary readers and their browser failure matrices, not a new registry or reimplementation of merged batches.

Final settings/notification head after #177 synchronization: production build and all 32 browser cases passed; full Jest rerun passed 69 suites / 351 tests. An earlier concurrent run hit the unchanged BotFlowEditorPage tests' 5-second timeout; no timeout/assertion was relaxed, and the full rerun passed.

### Live auxiliary readers and post consumer

`auxiliaryRecovery.ts` checks the current OAuth status and public lookup wire DTOs, projects status/account metadata without credential fields, and accepts the backend JSONField's arbitrary lookup metadata. These are transport validators, not a replacement provider catalogue. Public lookups use a public query identity; private posts/workspaces/status include account id, role/type, workspace and request filters. AbortSignal and keyed account scopes prevent late prior-context results. Permission/not-found responses hide affected private data; same-context reader outages retain valid snapshots.

MyPosts now renders independent post, connection and lookup recovery regions, validated empty vs no-results, explicit read refresh and authorized workspace selection for staff. A real existing regression was reproduced: its PageHeader received plain objects instead of ReactNodes and crashed the route. The consumer now renders its metadata as nodes. Lookup errors do not reset business/onboarding/ideas drafts; the existing compatibility choices are explicitly described as fallbacks, not proof of a provider capability.

Independent scope deliberately excludes the unused AdminOnboardingPage (the active admin route redirects). Remaining live onboarding profile reader (`ClientOnboardingPage` mount effect), PostIdeas history/edit mutations and composer auxiliary permission handling need their own contract audit; these are not certified by adding LookupState. #106 remains open. The existing `useLookups` PLATFORM_LIST filter and Settings/ClientOnboarding/PostIdeas/MyPosts named provider presentation are actual #112 dependencies. No complete #112 registry or new feature is introduced.

Local validation: 71 Jest suites / 356 tests passed, including malformed DTOs, preserved background snapshots, delayed workspace/logout and same-user role changes. Production build, architecture and i18n checks passed with unchanged baselines. Changed-flow browser results and synthetic before/after evidence are recorded in the PR after final refresh-control validation.

### Required CI baseline evidence for this batch

Main commit a9644ef (PR #176) Tests run 37658045064 already has the frontend native-browser step cancelled and the Docker runtime verification step failing. PR #177 run 37681668259 passes backend tests, frontend source checks/build/proxy/Jest, then the overall ten-minute frontend job cancels the 537-case browser suite; Docker reports missing registered task `celery.backend_cleanup`. PR #178 has the same frontend time-budget cancellation. These CI outcomes are not described as successful full browser checks. No runtime operation batches, Celery task definitions, CI time policy, assertions or ratchet baselines were changed to conceal them. Local complete changed-flow checks remain separate evidence; final full-suite integration is still required.

Final auxiliary head: all 20 browser cases passed, including explicit background refresh retention, offline filtered read, staff rapid workspace changes, section-local focus recovery and independent healthy sections. Four actual detached-main before/after images are in `frontend/e2e/evidence/auxiliary`; the baseline route failure is the reproduced PageHeader regression, not a fabricated mock UI. Final lint reports 411 existing findings and zero new errors/regressions; i18n checks 809 parity-correct semantic keys; architecture checks 739 modules with seven unchanged findings. No backend behavior changes in this follow-up.

Additional independent lookup-state correction: a valid public lookup containing rows omitted by the existing compatibility filter now announces partial data instead of silently presenting fewer choices. A validated empty lookup has its own local empty notice; failed/offline refresh of an empty snapshot cannot announce a fresh empty result. Compatibility copy no longer conflates outage with genuine emptiness and is shown only when the form actually uses its compatibility choices. Supported choices, healthy posts and inputs are preserved. No filter/catalogue/capability contract is rewritten and no provider is activated. Five shared-component regression tests pass; partial-state tests structurally failed against the previous renderer. The existing complete combined suite passed all 663 cases before this final presentation correction; related new/browser/source validation follows and is recorded separately. #112 still owns registry-driven presentation, named form defaults and generic capability/readiness contracts; this notice alone does not certify those criteria.

### Additional live editor/onboarding contract audit

The active onboarding reader previously treated failed profile GET as loaded, Next advanced after silent failed PATCH, and product URL metadata was overwritten with []. PostIdeas history/approval/edit writes swallowed failures; inline edit cleared input after failure; calendar status reconciliation omitted the staff workspace. These independent gaps are corrected against ClientSerializer and the existing post_ideas views, without executing #112. SessionProviders replaces QueryClient for id/email/role/type/workspace identity; connection helper reads reuse QK.connections so the existing ConnectedAccounts observer and realtime invalidation continue sharing the scoped cache.

The onboarding reader requires the real full workspace DTO and completion flag before initializing a form; Next advances only after a matching PATCH acknowledgment. Existing product URL/brand metadata survives saves, unsupported competitor/product upload controls describe the serializer limit, and known completion followed by failed session refresh retries only the read. Unknown writes retain drafts, are never replayed, and status reads only observe current values; explicit review is required to unlock an independent request. New-workspace progress stays local until checked creation at Complete.

PostIdeas uses checked history/calendar/idea/approval/add-to-calendar DTOs, private identity/workspace keys and AbortSignal. Failed edit keeps text/date; save is explicit and keyboard accessible; sensitive writes have one pending guard and unknown results remain locked. A follow-up GET cannot prove which write caused current metadata or recover an unreturned generated calendar. Checked calendar creation with failed history refresh preserves the known acknowledgment. Workspace changes invalidate pending action callbacks, remount scoped state, and do not let the old URL effect overwrite selection.

The twenty-opening immediate Escape browser regression reproduces on detached main and the prerequisite stack. Focused Modal handles Escape at its own content boundary; background Drawer dismissal ignores events outside its content while Radix registers the nested layer. Portalled nested content is excluded by DOM containment. No bot workflow, registry, mutation or operational feature is reimplemented. A meaningful shared-primitive unit test repeats focus/inspector preservation twenty times. Full Jest: 73 suites / 361 tests pass; build, lint (406 prior findings, zero new errors/regressions), i18n (821), architecture (741/seven unchanged), check:next and changed-file pre-commit pass. All 25 browser cases pass at the final build, including the correctly named workspace selector, late history exclusion and unchanged twenty-opening immediate Escape regression.

#106 remains open: #112-owned compatibility provider fallback/presentation cannot certify unknown-provider partial/error semantics or registry capability provenance, and required CI still has prior runtime/time-budget debt. Unused AdminOnboarding/useGoals/useOverview are not counted as live acceptance evidence. No unsupported provider or capability was added. The independent onboarding/history/action gaps listed above are resolved rather than hidden behind #112.

### Composer auxiliary permissions and final keyboard recovery

The remaining live composer queue reader could display cached private queue names after a 403/404 and treated a genuinely empty dataset like a filtered no-results set. Its local region now distinguishes initial/refreshing/offline/denied/not-found/rate-limit/malformed/error states, keeps same-context outage drafts and valid queue metadata, and hides revoked metadata. Queue submission is disabled while the reader is paused/failed; reconnect only refreshes reads. Existing-post 404 hides stale content until a checked read restores access, without saving/replaying. Draft namespaces include user id, role, account type, workspace and post; a same-user role/type change cannot reuse the previous draft namespace. Existing-post identity also uses the committed composer pathname while dynamic params settle, avoiding a transient new-editor scope. No provider capability or API contract is added.

The nested confirmation's focus restoration is deferred until the underlying Radix focus scope resumes; disconnected prior-context targets are ignored. The unchanged twenty-opening Escape regression remains intact. This addresses a real intermittent return-focus failure observed during integration; no timeout or assertion was weakened.

Final independent-head validation: production build and full Jest (73 suites / 366 tests) pass. All 41 changed/neighboring browser cases pass, including the new 15-case queue/existing-post reader matrix, existing client/superadmin draft/queue flows, keyboard editing across fa/en light/dark/system widths, scheduling instant preservation, capability removal and advanced media draft recovery. Synthetic before/after evidence is in frontend/e2e/evidence/composer-reader; traces/screenshots of sensitive operations remain disabled. Additional repetition and final combined-stack results are recorded separately.

The earlier 647-case integration attempt passed 645 cases but failed composer reload and the repeated nested dialog test under concurrent heavy jobs. It is not reported as green. This follow-up is independently reviewable after #182; merge order is #177 → #178 → #179 → #182 → composer follow-up → #180 → #181. #106 remains open for the precise #112 provider-presentation/capability dependency and the documented required CI debt; adding local components/tests alone does not satisfy those criteria.

The unchanged twenty-opening dialog case passes three additional independent repetitions (60 openings); the unchanged superadmin save/reload case passes ten repetitions with four browser workers. Changed-file pre-commit including secret scanning passes. These repetitions complement, rather than replace, the pending final combined full suite.

Final composer source checks: lint 815 files / 406 prior findings / zero errors or file-rule regressions; i18n 823 parity-correct keys; architecture 741 modules / seven unchanged findings. No baseline or policy change.

Composer integration follow-up: the two-worker 662-case run still reproduced an empty editor after a client's immediate reload. The committed-path fallback alone did not resolve this. A deterministic warm-query-cache unit test demonstrated that the initial hydration effect flipped a ref before the draft state committed; the subsequent persistence effect wrote the old empty render as a recoverable post draft. Persistence now waits for committed editor readiness, so a navigation/reload cannot recover that temporary empty draft. The regression failed on the prior code and passes after the correction; all 26 composer unit cases pass, including preserving a subsequent unsaved edit across remount. An additional synthetic browser case checks save/navigation/immediate reload and counts empty recovery writes without logging content. Final combined rerun follows; the earlier 662-case run is not claimed green.

### Typography calibration

Typography uses the existing local Noto Sans Arabic/Noto Sans variable faces (100–900) and licenses. Active family overrides, locale line-height inheritance, semantic body/control/section/title/display roles, Arabic glyph samples and technical bidi spans were audited and corrected. Archived frontend and inactive theme.js are unchanged. No external font request or duplicated file was added. Mobile settings/search/navigation clipping found in actual 200% screenshots was corrected; scrollable mobile tabs retain keyboard access.

The branch is synchronized with the state-family prerequisite. Before the final semantic prose/bidi sweep, all 26 browser cases passed (12 catalog + 12 active settings matrices, pre-hydration font/locale and blocked-font fallback/locale-switch checks); production build, full Jest (69 suites/351 tests), lint/i18n/architecture passed. Final marketing display/body cases and checks are recorded in the typography PR. Screenshots are synthetic and validate rendering rather than implying any real account action.

No #112 provider registry execution is needed to meet the typography criterion: only the current unknown-platform fallback font changed; provider keys/capabilities/colors are retained. Public routes keep their existing Persian-only locale policy; English is covered in product/catalog surfaces. No final logo wordmark or naming/trademark approval is implied by font work.

### Typography final calibration and verification

The active override audit removes serif/Inter/system-ui family conflicts, applies semantic body/control/section/title/display weights 400/500/600/700/800 and locale line boxes, and bidi-isolates rendered identifiers in active shell, messaging, workspace, management and lead views. Marketing display headings are explicitly 800; legal titles remain 700. Dormant theme.js and archive are not rewritten. Existing local Noto variable faces, next/font/local, two same-origin font requests, fallback and OFL licenses are retained; font synthesis stays disabled.

Real 200% clipping found in the account form is fixed: one mobile gutter, accessible narrow search icon, scrollable keyboard-reachable mobile navigation, localized file-selection Button with wrapping filename and focus return, and settings container reflow when content space becomes narrow. No business capability or theme palette is added. Catalog covers Persian vowel marks/forms/half-space/numerals, English, mixed identifiers, five weights, buttons, badges and table cells.

At the final prerequisite-synchronized head, build and all 71 Jest suites / 357 tests pass; 32 typography browser scenarios pass. Evidence covers fa/en, RTL/LTR, light/dark, 360/768/1440, normal and 200% reflow, before-hydration font/locale metrics and failed-font readable fallback. Product and catalog screenshots are synthetic and credential-free; detached-main before product images are included. The complete native browser suite is being run separately before a whole-issue close assertion. #115 has no essential dependency on #112; monogram family correction does not assert provider capabilities. Full-suite outcome remains distinct from changed-flow evidence and the existing CI time-budget debt.

Complete native integration at ee215f7 ran all 606 cases: 603 passed. The old account-settings fixture expected switch/Save despite the new native checkbox/Save preferences; its actual persistence/write assertions are retained with corrected semantic locators. That case and superadmin composer pass on rerun; composer also passes ten unchanged isolated repeats, and main passes the same scenario. The immediate nested-confirmation Escape case fails on both detached main and the typography branch with the same assertion (dialog remains open). The additional #106 recovery PR repairs the shared dismissal primitive, keeps the twenty-opening browser assertion, and verifies inspector preservation/focus. Typography's 32 cases, final lint (zero regressions), i18n (810) and architecture (739/seven unchanged) pass. This records observed failures and does not call the initial complete run green.

### Final #115 acceptance decision

All #115 criteria have implementation and browser evidence: active family/weight overrides are corrected; role weights 400/500/600/700/800, Persian 1.8/1.45 and Latin 1.55/1.2 line boxes, zero Persian tracking, no synthesis, isolated mixed identifiers, and full glyph/weight/control catalog are verified. Existing local variable Noto faces, next/font/local, fallbacks and OFL are preserved; archive/dormant theme remains unchanged. Thirty-two related browser scenarios pass again after the final lookup-state correction, including fa/en × light/dark × 360/768/1440, 200% reflow, failed-font fallback, pre-hydration first paint, locale switch and hydration checks. No essential #112 or external wordmark dependency applies to typography.

The synchronized complete stack passes production build/typecheck, 75 Jest suites / 375 tests, lint (817 files; 404 pre-existing findings; zero errors/regressions), i18n (856 parity-correct semantic keys), architecture (741 modules; seven unchanged findings), check:next (832 active files) and both production proxy checks. Before the final lookup presentation correction, the complete native suite passed all 663 cases. After it, all 128 browser cases covering every LookupState consumer plus typography/brand pass, including three new partial/empty/background-failure scenarios. No claim of a separate complete 666-case run is made. Earlier incomplete/failing runs remain recorded as historical failures.

#180 includes the closure directive for #115; the issue closes when that reviewed change merges into main. #106 and #116 remain open for the separately stated criteria/dependencies. Required CI still has the evidenced prior overall browser-job budget and Docker verification debt; local results do not imply green CI or weaker baselines/policies.

### Independent Ravinta rollout

See `docs/brand/ravinta/ROLLOUT_STATUS.md` for master provenance, provisional text fallback, visible-name inventory, deterministic install exports and explicit compatibility exceptions. Product display names and email subjects use Ravinta while technical/API/DB/cookie/cache identifiers and existing external destinations remain compatible. Shared mark variants preserve geometry, clearance and one accessible name; root metadata and canonical canvas theme-color now follow explicit/system themes before hydration.

#116 is not closed: final outlined lockups and name/domain/handle/trademark decisions are absent; exclusive provider-driven presentation remains #112-owned; whole-product raw-color/contrast and native OS installation certification are not claimed. Asset file dimensions, safe zone and headless manifest delivery are verified separately from actual installation. Canonical pairs and representative product layouts have browser evidence; no synthetic secret is photographed.

Brand verification at the typography prerequisite stack: all 72 Jest suites / 359 tests, 697 Django tests (three existing skips), production build and all 15 brand browser cases pass. Lint/i18n/architecture retain their baselines. Required pre-commit security/hygiene checks pass after EOF normalization; Ruff reports 20 existing findings in the renamed-copy files, exactly the same 20 by code/message as their prerequisite HEAD (zero new findings). Its automatic changes to unrelated Python formatting were restored. No assertion, baseline, policy or compatibility identifier was weakened.
