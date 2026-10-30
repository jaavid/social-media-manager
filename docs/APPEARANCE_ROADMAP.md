# Appearance and offline style-asset contract (2026-10-30)

## Shipped in the first implementation batch
- `frontend/src/styles/tokens.css` remains the canonical fallback source.
- `frontend/src/lib/appearance.js` strictly validates browser-local overrides; only fixed properties and hex colors are accepted.
- Appearance settings cover light/dark palette, primary foreground, page/card/text colors, text/radius scale, spacing, density, and reduced motion.
- Values are stored in browser localStorage (`ravinta.appearance.v1`) and restored before first paint by a same-origin script. This **does not** synchronize across accounts or devices.
- `npm run check:local-styles` rejects remote stylesheets, CSS assets, and hosted font imports in frontend source. It does not block user-supplied images or third-party integration scripts.
- Self-hosted Arabic/Latin Noto variable fonts continue to be served by Next; no Google Fonts needed.
- Accessible color contrast is reported, not automatically altered. The review of saved/brand palettes against WCAG remains required.

## Remaining migration contract
See linked GitHub follow-up issues for token migration of legacy pages, account/workspace-scoped server persistence, expanded tokens/components, UI evidence, asset egress/browser policy and stronger CSP.
Do not introduce a second visual token registry or unrestricted custom CSS injection.
