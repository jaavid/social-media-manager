# Changelog

## [Unreleased]

### Added — Telegram and Bale publishing

- Telegram and Bale bot-channel connections in **Connected Accounts**.
- Live bot token + destination verification before encrypted credential storage.
- Composer targets for Telegram and Bale with optional per-post destination overrides.
- Text, photo, video, and media-group publishing through the common publisher/orchestrator pipeline.
- Typed bot API handling for revoked tokens, permission errors, and rate limits.
- Publisher tests for destination routing, token redaction, API error mapping, text/caption limits, and media-group limits.

### Changed — independent maintenance line

- Repository documentation, security reporting, conduct contact, GHCR images, and badges now point to `jaavid/social-media-manager`.
- Self-hosting no longer pulls container images from the upstream maintainer namespace by default.
- Django upgraded from 4.2.9 to **5.2.17 LTS**; Django REST Framework and django-axes were aligned with Django 5.2 support.
- Original MIT copyright and attribution notices remain preserved.

> GitHub's fork-network metadata is not controlled by repository content. The repository
> can be detached from the fork network separately after this change is merged.

### Changed — Social Stats is now free & open source (MIT)

Payments and paid plans were removed; the product is free and self-hostable
under the MIT License (Copyright © 2026 Chandrabhan Shekhawat — Gigai Kripa
Services).

**Removed**
- Razorpay billing integration: checkout/confirm/cancel/invoice/webhook
  endpoints (`billing_views.py`) and their routes; the Razorpay healthcheck.
- Frontend Pricing page, Agency/End-user billing pages, Refund Policy page, the
  billing API client, pricing teasers, and the Razorpay integration card.
- "Billing"/"Agency billing" navigation entries and the billing notification
  event.

**Changed**
- All plan quotas are now unlimited for both account types (`end_user` and
  `agency_member`); `usage_limits` checks always allow. Role separation
  (end-user vs agency vs superadmin) is unchanged.
- Legal pages drop the payment processor (Razorpay) from sub-processor/cookie
  lists; the operator is now "Gigai Kripa Services".

**Database (legacy / unused)**
- The billing models (`Subscription`, `Invoice`) and **all historical
  migrations are kept as-is** — no tables were dropped. These tables are now
  **unused/legacy** inert storage; the app still `migrate`s cleanly from an
  empty database. Migration `0064_rename_gateway_fields` renames the former
  `razorpay_*` columns to neutral `gateway_*` names (a pure column rename — no
  data loss). They may be removed in a future migration if desired.
