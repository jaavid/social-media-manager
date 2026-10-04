# Ravinta typography calibration (#115)

Active source only: `frontend/src/app`, `features`, `components`, and shared styles.
The historical archive and the local WOFF2 files/OFL licenses are unchanged.

- `next/font/local` still preloads both variable fonts, weights 100–900, with
  `display: swap` and the existing Arial/sans-serif fallback. No remote font request.
- Language boundaries select Arabic-first Noto for Persian/Arabic and Latin-first
  Noto for English. Both families remain available when changing locale. The primary face names
  precede the generated fallback stack so Arial cannot intercept mixed-script
  content before the second Noto face. The adjusted fallback is preserved.
- Body uses 400; controls/labels 500; section headings 600; page headings 700;
  brand display 800. Semantic heading/control rules override retained legacy
  inline weights. `font-synthesis: none` prevents artificial bold/italic.
- Body line-height is 1.8 Persian and 1.55 English; headings 1.45 and 1.2.
  Compact inline body line-height overrides in active features and shared UI now
  use the locale token. Icon geometry and decorative quote glyphs retain their
  own metrics. Technical code/monospace specimens retain their font family.
- Text buttons use minimum heights plus padding, badges use natural line boxes,
  and inputs/selects have vertical padding. Persian letter spacing is zero.
  Email/URL inputs and explicit LTR/bdi boundaries isolate technical values.
- `/design-system` offers language and theme controls plus both language samples,
  vowel marks, ZWNJ, digits, identifiers, email, URL, five weights, and real input,
  button, badge and table specimens.

Reproduce with `npm run build`, then
`npx playwright test e2e/typography.spec.js` from `frontend/`.
The browser suite saves the 2 languages × 2 themes × 3 widths × 2 zoom states
under `frontend/e2e/evidence/typography/`. Its 200% setting uses Chromium CSS zoom
for reflow; a manual browser zoom review is still useful on other engines.

Validation on the final implementation:

- Production build, typecheck, and i18n inventory check pass.
- All 13 catalog/font browser checks and both active settings locale checks pass
  with installed Chrome (`PLAYWRIGHT_CHANNEL=chrome`). The catalog matrix has
  24 screenshots, including 200% reflow. No hydration errors were observed.
- Full frontend lint reports zero errors but fails its baseline gate on two
  file/rule regressions: `IntegrationsPage.jsx` (unescaped quote) and
  `LanguageProvider.tsx` (state update in effect). Running ESLint on the original
  `HEAD` versions reproduces both; they are outside typography scope. The unused
  CreditCard warning on IntegrationsPage also predates this change.

The full issue acceptance remains gated on those existing lint findings. No
lint baseline was expanded to hide them.
