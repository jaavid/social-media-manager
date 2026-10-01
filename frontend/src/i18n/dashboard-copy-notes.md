# Dashboard localization scope

The admin overview uses the existing `useLanguage()` i18n layer instead of a dashboard-specific translation system.

Persian presentation rules:

- Product copy is translated through `tr()` and `fa-extra.js`.
- User-visible dates use `formatDate()` so Persian mode uses the Persian calendar.
- User-visible counts and metrics use `formatNumber()` for Persian digits.
- Technical identifiers, URLs, percentages/currency where direction matters, and numeric form controls stay isolated from RTL flow where appropriate.
- Vazirmatn typography and weight hierarchy are inherited from the design-system defaults introduced before this change.

This note is intentionally small and exists to keep future dashboard additions on the same localization path.
