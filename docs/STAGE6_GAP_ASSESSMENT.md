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
