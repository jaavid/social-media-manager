# Stage 5 — Composer, Scheduling and Approval

Started from `origin/main` at `96db7ec` (stage 4, PR #161). Root/frontend
AGENTS.md, contributing/UI contracts, provider contracts, Connected Accounts,
health, authorization and recovery code were reviewed. Issues #112, #103, #106,
#111 and #114 had no comments when reviewed; #103/#111/#114 were already closed.
Stage 4 account connection/health contracts and stages 0–3 runtime/UI contracts
were reused, rather than reimplemented.

| Criterion | Existing implementation reused | Stage-5 completion/evidence |
| --- | --- | --- |
| Provider discovery | Manifest, registry, reference fixture, execution boundary | Publishing-mode descriptors; generic Composer has no provider-name branches; capability removal disables publishing |
| Accounts and readiness | Workspace Connected Accounts, local health, RBAC | Explicit single/multiple account destinations; mode/scope readiness; per-delivery logs; backend authorization |
| Validation | Typed provider errors, SSRF, Telegram advanced validator | Shared HTTP/approval/worker validation; constraints on workspace assets; real video metadata fixture (including storage without local paths); no invalid transport calls |
| Payload fidelity | UnifiedPost/QueuedItem JSON fields and provider prepare hooks | Draft/edit/duplicate/approval/schedule/queue snapshots; Telegram rich/poll/album order/caption/context preservation |
| Scheduling | UTC-aware timestamps, scheduler, approval policy | Reject naive/past instants; retain future schedule after approval; stale revisions/tasks rejected; Asia/Tehran locale-switch browser test |
| Recovery | Existing HTTP/query/DataState contracts | Scoped tab drafts, one-time hydration, pending lock, local create deduplication, safe manual retry, ambiguous results and hiding cached private data after denied refresh |
| UI | Existing Page/Editor primitives and tokens | Persian/English, RTL/LTR, light/dark/system, 360/768/1440px, keyboard/error focus; screenshots in `frontend/e2e/evidence/stage5/` |

Publication acceptance and queue acceptance do not claim provider success.
Ambiguous remote outcomes require reconciliation; there is no remote exactly-once
claim. Remote URL media bytes/availability and live credential/provider behavior
cannot be proven by offline tests. Production transport calls were not performed.
The current provider-specific rich/poll extension belongs to Telegram; Bale's
existing supported payload options remain preserved at its adapter boundary.

Out of scope and still remaining: #112 Inbox/Analytics migration and its other
acceptance criteria; #106 surfaces outside Composer; brand #116, metrics and
commercialization. No issue is closed by this stage. Apply database migrations
0078–0079 before serving the updated Composer contract.
