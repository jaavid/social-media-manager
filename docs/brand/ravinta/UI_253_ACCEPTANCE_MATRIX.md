# Ravinta UI consistency: implementation baseline

Tracking: #253 (primary), #215 (visual/user evidence), #241 (visual tokens), #245 (density and injection), #108 (workspace URL).

## Source-of-truth route groups (Next app tree)

Do not count redirects, aliases, `View.jsx` and dynamic segments as independent visual screens without inspecting their rendered destination.

| Route family | Source root | Immediate regression focus |
| --- | --- | --- |
| End-user | `frontend/src/app/(account)/(end-user)/u/` | `calendar`, `connections`, role/action visibility, workspace propagation |
| Staff analytics | `frontend/src/app/(account)/(staff)/admin/(shell)/analytics/` | `dashboard`, `caption-writer`, `ai-studio`, `inbox`, `composer`, `calendar` |
| Workspace dashboard legacy routes | `frontend/src/app/(account)/(workspace)/dashboard/analytics/` | distinguish redirects/aliases from rendered experiences before baseline |

## Reuse contracts — do not fork primitives

| Component | Canonical source | Rules / ownership |
| --- | --- | --- |
| PageHeader | `frontend/src/components/layout/PageHeader.tsx` | One page heading; `action` and `actions` both render if provided; back button is localized; actions wrap on narrow screens |
| SectionHeader | `frontend/src/components/ui/SectionHeader.jsx` | Logical text-start for RTL/LTR; heading levels remain semantic; legacy `style` prop is compatibility-only (#241) |
| EmptyState | `frontend/src/components/ui/EmptyState.tsx` | Use only for genuinely empty collections, not API failure or missing authorization (#106) |
| DataState | `frontend/src/components/ui/DataState` | Explicit loading/error/forbidden/empty states; actionable recovery where appropriate (#106) |
| Workspace scope | Existing shell and `useWorkspaceScope` | Do not introduce a page-local second workspace picker; verify Back/Forward and tenant boundaries (#108) |
| Platform controls | Existing connection and calendar components | Separate OAuth-connected, public monitoring-only, setup-required and unavailable; never infer connection from monitoring (#253/#112) |

## Next PR evidence matrix

For each actually rendered screen, record its tested entry URL, role/workspace, source component, observed defect, before/after screenshot, and accessibility result. Required axes: FA/EN; light/dark; 360, 768, 1280 and 1440 widths. Cover keyboard focus, 44px targets, overflow, permission feedback, loading/error/empty, and workspace switching. No screenshot is evidence until captured against a verified build.

| Target | Route evidence | Visual evidence | Interaction evidence |
| --- | --- | --- | --- |
| End-user calendar | Pending | Pending | Pending |
| End-user connections | Pending | Pending | Pending |
| Staff caption writer | Pending | Pending | Pending |
| Staff AI Studio | Pending | Pending | Pending |
| Staff analytics dashboard | Pending | Pending | Pending |
| Messaging and scheduling | Pending | Pending | Pending |

This PR is an **incremental functional fix and acceptance scaffold**, not full satisfaction of #253 or the adjacent cross-cutting issues. Nightly full Playwright coverage introduced by #257 does not substitute for reviewed visual baselines.
