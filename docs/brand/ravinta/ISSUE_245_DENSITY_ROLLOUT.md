# UI density rollout and remaining closure gates for #245

## Delivered in the linked PR
- Comfortable/compact CSS variables for shared Button, icon-only Button, Card, Badge, Table and modal/sheet padding.
- Compact option reduces density-dependent metrics without changing semantic focus treatment.
- Pointer-coarse policy retains at least 44px minimum for button controls and shared form controls.
- Playwright checks appearance-driven density variables and pointer ergonomics.

## Still required to close #245
- Full source inventory and classification of remaining runtime `<style>`, `document.createElement('style')`, style injection from charts and third parties, `!important`, hard-coded fixed heights and aliases.
- Audit of sidebar/nav rails and all form/table/overlay variants, confirming end-to-end density behavior.
- Real screenshot baselines (FA/EN, RTL/LTR, themes, mobile/tablet/desktop, reduced motion) and keyboard/focus acceptance, with verified CI execution.

Runtime SVG/chart geometry and platform-branded assets must not be stripped mechanically. If a class has existing fixed paddings, migrate it only after verifying visual compatibility; do not introduce new `!important` workarounds.

Ownership: #245 (density and injection), #241 (legacy literal tokens), #243 (external CSS/font and CSP), #253 (cross-route visual audit).