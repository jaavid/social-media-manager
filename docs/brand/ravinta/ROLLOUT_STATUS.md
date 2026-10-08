# Ravinta rollout status

This records repository evidence, not legal clearance. BRAND.md specifies Ravinta / راوینتا and the Latin fallback RAVINTA; README and palette.json still describe the name as proposed. The approved geometric master is `assets/app-icon.svg` and its 96-unit mark geometry. No approved outlined Persian or Latin wordmark is present. BrandLogo labels its existing text fallback as provisional; no generated concept image or invented final lockup replaces it. Domain, handle and trademark availability have not been verified.

## Independent implementation

Visible product/auth/navigation/marketing/AI descriptions, metadata and notification/email product names use Ravinta. Backend subjects/default display sender names change while existing mail addresses and action links remain compatible. Logo variants share the master geometry, canonical brand/signal tokens and clearance; they have one accessible name, retain direction in RTL and hide the fallback wordmark below minimum lockup sizes.

`frontend/scripts/generate-brand-assets.cjs` deterministically exports the approved app master through existing Sharp (no added dependency). Any/maskable 192/512 exports are distinct; foreground stays in the central 80% safe circle. Apple 180, PNG favicon 32, ICO 16/32/48 and a mark-only 1200×630 OG export are supplied. No unapproved wordmark is rasterized. Manifest identity is `/`; native browser/OS installation is not certified by checking manifest and file dimensions. ClientRuntime's previously retired service worker remains retired; no offline capability is invented.

Root title/template, approved tagline, manifest, favicon/Apple/OG and canvas theme-color are consistent. Explicit light/dark cookies work before JavaScript; system uses OS media queries. After switching, theme-color reads the existing canonical CSS canvas rather than a parallel runtime palette. Canonical URLs use the existing configured site origin where available, not an invented Ravinta domain.

## Compatibility exceptions

Copyright/author notices, repository/package names, Python app/DB/schema/API identifiers, `socialstats.*` cookies/storage and migration cache prefixes retain their technical names. Existing external links/handles, example mail domains, export compatibility filenames and legacy service-worker cleanup names remain unchanged unless real authorized replacements are provided. A visible external URL containing socialstats is not evidence that a Ravinta domain/handle is available. Legacy dictionary lookup keys remain only when a consumer needs compatibility; current visible text is translated under semantic keys.

## Remaining acceptance work

- Deliver and approve final outlined Persian/Latin wordmarks; settle proposed name and provide authoritative domain/handle/trademark decisions.
- #112 owns provider-driven presentation/capability provenance. `services/platforms.js`, `useLookups`' PLATFORM_LIST filter and the named Settings/Onboarding/PostIdeas/MyPosts consumers retain compatibility catalogues; this batch does not certify exclusive backend-driven provider presentation.
- The canonical contrast matrix checks primary/secondary/tertiary/link text across five surfaces, semantic state text over each composited state background, focus across surfaces, and primary normal/hover/active text in light/dark. RAW_COLOR_INVENTORY.json records all 1,660 active literal occurrences across 142 files, including canonical definitions, fallback/provider metadata and legacy colors; it is evidence, not a second runtime palette. They do not certify every legacy raw-color page. RAW_COLOR_INVENTORY.json completes the literal inventory; classification/remediation and computed contrast for every legacy raw-color page, plus an actual browser/OS install exercise, remain unverified.

Therefore #116 remains open. Safe synthetic fa/en, RTL/LTR, light/dark 360/768/1440 evidence and asset tests are attached to its rollout PR. No legal availability or final-wordmark approval is claimed.

The existing semantic-contract browser test additionally verifies 162 canonical pairs across light/dark/system-dark, including essential control borders, focus, destructive foreground and primary hover/active states. Actual ratios are recorded in frontend/e2e/evidence/brand/semantic-contrast.json. These checks do not claim certification of every legacy page or native installation.

Final rendered-contrast regression: the module-rail mark previously filled its primary-colored button with the same primary color (ratio 1:1). ModuleRail now uses the existing monochrome variant with canonical `--text-on-brand`; approved geometry, accessible name and routing stay unchanged. The brand matrix checks the actual SVG fill against its button background at ≥3:1 in light/dark, alongside the existing token checks. Updated synthetic captures show the visible mark.

## Notification migration correction (2026-10-08)

The display-label change in `8a37acd` left migration state behind the model on
post-merge main `6ac39d0`. Migration 0083 records only the `client_joined` choice
label. Its event key, field length, notification preferences and dispatch behavior
are preserved; forward and reverse schema SQL are no-ops. Upgrade with ordinary
`manage.py migrate`. A rollback to 0082 restores the historical display label in
migration state without rewriting preference rows. This correction does not
complete the remaining #116 acceptance work above.
