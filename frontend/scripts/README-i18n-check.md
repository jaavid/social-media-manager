# User-facing string inventory

Run `npm run i18n:inventory` to list direct JSX text nodes and user-facing attributes under `src`, or append `-- --json` for machine-readable output.

`npm run i18n:check` is intentionally incremental. It exits non-zero only for surfaces already migrated to semantic translation keys (`ConnectedAccounts` and `PlatformConnectModal`). This keeps the guard enforceable while the rest of the application is migrated progressively instead of introducing a permanently failing global check.

The inline allowlist in `check-user-facing-strings.js` is deliberately narrow: protocol/metric identifiers, punctuation, currency markers, and registered brand names are technical content and must not be translated. URLs and account, token, destination, and other identifiers should be rendered with `dir="ltr"`; they are not a reason to exempt surrounding prose.
