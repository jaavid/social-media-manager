# Issue #219 — UX/UI convergence and acceptance register

## Changes
Calendar detail/editor drawers now use the existing Radix-backed Drawer, including logical positioning for RTL/LTR, modal focus behavior, Escape and restoration. Form inputs have associated labels and announced field errors. Platform/status options expose selection state independent of color. The end-user shell consumes BrandMark rather than a placeholder glyph; mobile menu target is 44px. Scrollable tables become keyboard-focusable and the end-user content is constrained at narrow widths.

## Existing canonical families and remaining owners

| Pattern | Canonical implementation / consumer | Owner | Adapter removal / verification gate |
| --- | --- | --- | --- |
| Dashboard | `components/ui/DataState` + `features/end-user/EndUserDashboard` | frontend/dashboard | all states and actions verified via role/locale/theme tests |
| Collection | `components/ui/DataTable`, `components/ui/Table` | frontend/shared-ui | table names, localized horizontal scroll, row keyboard actions, responsive widths |
| Detail | `components/ui/Drawer` + `components/calendar/PostDrawer` | frontend/calendar | every custom detail drawer migrated or tracked in explicit child issues |
| Editor | `components/calendar/PostFormDrawer` + `features/bots/BotFlowEditorPage` | frontend/editor | labels/errors, 320px reflow and non-drag alternatives |
| Settings | `features/settings/SettingsPage` + shared fields | frontend/settings | form state/errors/focus and semantic token audit before legacy adapter removal |

## Closing gate
Run final-head build/typecheck/Jest/Playwright and collect **new** browser evidence for Persian private RTL, English private LTR and Persian public UI, light/dark, 320/360/768/1440 CSS px and actual 200% zoom. Verify Tab/Shift+Tab/Escape, focus restoration, background inertness and screen readers for end-user/calendar/bot drawers. Confirm WCAG 2.2 AA rendered contrast (normal text 4.5:1 and essential UI 3:1), motion reduction, accessible errors and drag alternatives. Internal 44px touch target preference does not replace WCAG 2.2 2.5.8 24px criterion/exceptions.

This change does **not** assert that manual screen-reader, device or zoom verification is complete. Historical screenshots do not count as new proof. Do not close parent issue #219 until final-head CI, this matrix and remaining legacy consumer gates have review evidence.
