# Issue #241 — canonical theme-token migration

This document accompanies the migration PR based on the merged appearance editor (#240).

## Policy and inventory

- Canonical CSS tokens remain in `frontend/src/styles/tokens.css` and are exposed to Tailwind in `tailwind.css`. No second theme registry is introduced.
- Historical machine-readable color baseline: `docs/brand/ravinta/RAW_COLOR_INVENTORY.json`, originally **1,660 occurrences across 142 files**. It is a ceiling for the ratchet, not a count of active UI regressions.
- Run `npm run audit:design-tokens` for the current per-file and per-family JSON inventory (raw hex, rgb/a, JSX inline style objects, Tailwind arbitrary visual utilities and style tags).
- Run `npm run check:design-tokens` to reject any new raw hex above the historical per-file budget and any regression to migrated-feature budgets for raw rgb and inline style counts. All *new* source files start with a zero raw-hex budget; token definitions are allowed in `tokens.css`.
- Explicit, justified exceptions for immutable provider logos, platform brand metadata, and data-defined artwork use a same-line `design-token-exempt: platform-brand`, `fixed-asset`, or `data-color` comment. This is not blanket permission to hardcode generic UI colors.
- Runtime position, chart geometry and authenticated third-party brand colors are **not** blindly converted to CSS tokens.

## Migration coverage

The following **first-party hardcoded hex count** was measured on the specific components at the time of transformation, before/after this change. This is not a full-repository count.

| Area | Component | Before | After |
| --- | --- | ---: | ---: |
| Settings | SettingsPage | 5 | 0 |
| Calendar | CalendarPage | 9 | 0 |
| ROI | ROICalculatorPage | 58 | 0 |
| ROI | ROIFunnel | 15 | 0 |
| Dashboard | StatCard | 29 | 9 |
| Marketing | HomePage | 26 | 0 |
| Marketing | MeshGradient | 2 | 0 |
| Marketing | BentoPreviews | 38 | 9 |
| Marketing content | solutionPages | 36 | 0 |
| Marketing content | productPages | 12 | 0 |
| Composer | CaptionWriterPage | 73 | 0 |
| Composer | PostIdeasPage | 52 | 0 |
| Onboarding | ClientOnboardingPage | 55 | 0 |
| Settings components | CompetitorSection | 28 | 0 |
| Bot editor | nodeCatalog | 25 | 0 |
| Bot editor | BotFlowEditorPage | 1 | 1 |
| Bot messaging | MessageForms | 4 | 0 |
| Bot testing | TestModeDrawer | 4 | 0 |
| Management | ClientsTab | 3 | 0 |
| Management | ManagementPanels | 10 | 0* |
| Management | StaffTab | 1 | 0 |
| Business settings | BusinessAssetSections | 8 | 0 |
| Business settings | BusinessAudienceSection | 4 | 0 |
| Business settings | BusinessIdentitySections | 6 | 0 |
| Workspace management | AllClientsPage | 42 | 0 |
| Calendar CSS | common.css | 4 | 0 |
| **Total of these measured files** | | **550** | **19** |

* The management color-picker uses a documented fixed hex default because native `input[type=color]` cannot accept CSS custom properties; the two data-color occurrences are exempted by same-line metadata and not counted as generic UI colors. The 19 retained literal instances are backwards-compatible icon color aliases in StatCard, external provider brand data in Bento previews, and one existing editor literal. The UI uses semantic first-party colors through `var(--...)`, including token-aware tinted backgrounds. `CanvasNode` and `NodeInspector` now mix colors using CSS `color-mix()` rather than invalid string concatenation like `var(--info)22`.

## Accessible behavior

- First-party status backgrounds and text now consume semantic success/info/warning/danger tokens.
- Editable primary/surface/text, density/spacing and radius settings apply to migrated app cards, status badges, marketing visuals, bot node metadata, charts and ROI funnel.
- The marketing animation no longer injects a component-local `<style>` tag. Reduced-motion behavior is defined in bundled CSS.
- Platform-specific fixed colors are intentionally preserved where brand recognition requires them.

## Acceptance evidence before closing #241

- [ ] `npm ci`, `npm run lint`, `npm run check:dependencies`, `npm test -- --runInBand`, `npm run build`.
- [ ] Browser screenshots in RTL/LTR, light/dark, 360/768/1440 widths, 200% zoom and reduced motion, including settings, calendar, bot flow editor, composer, analytics and marketing.
- [ ] Confirm remaining legacy first-party visual literals outside the migrated file set are either migrated or individually justified in the audit. **An overall declining count is not sufficient to claim full migration.**
- [ ] All CodeRabbit review threads addressed and the unified-stack browser tests pass.

Do not automatically close #241 until these criteria and the remaining cross-file inventory have been reviewed.
