# Platform capability support

This document is a human-readable view of the canonical registry in
`backend/social_stats/platform_registry.py`. Deployments must run
`python manage.py check_platform_config`; that command also verifies this table and the
frontend metadata have not drifted.

Statuses: **supported** (generally available), **beta** (usable with limitations),
**planned** (not exposed as working UI), and **not_available** (intentionally absent).

<!-- platform-matrix:start -->
| Platform | Connection | Disconnect | Text | Image | Video | Scheduling | Analytics | Inbox | Comments | Reviews | Webhooks |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Facebook | supported | supported | supported | supported | supported | supported | supported | supported | supported | not_available | supported |
| Instagram | supported | supported | not_available | supported | supported | supported | supported | supported | supported | not_available | supported |
| YouTube | supported | supported | not_available | not_available | supported | supported | supported | not_available | supported | not_available | beta |
| LinkedIn | supported | supported | supported | supported | supported | supported | beta | not_available | beta | not_available | not_available |
| Google My Business | supported | supported | supported | supported | not_available | supported | supported | not_available | not_available | supported | not_available |
| Telegram | supported | supported | supported | supported | supported | supported | not_available | planned | not_available | not_available | planned |
| Bale | supported | supported | supported | supported | supported | supported | not_available | planned | not_available | not_available | planned |
| Eitaa | planned | planned | planned | planned | planned | planned | not_available | planned | not_available | not_available | planned |
| Aparat | planned | planned | not_available | not_available | planned | planned | planned | not_available | planned | not_available | planned |
<!-- platform-matrix:end -->

## End-to-end acceptance criteria for Iranian and bot channels

The following scenario is required **independently for Telegram, Bale, Eitaa, and
Aparat** before changing any relevant registry status to `beta` or `supported`:

1. A valid provider credential and destination/account identifier are verified with
   the real provider; invalid credentials are rejected without being persisted.
2. The saved secret uses `PlatformCredential.access_token` (the encrypted model
   field), and neither API responses nor application logs contain the plaintext.
3. Text, image, and video publishing declared by the platform completes against a
   test account (Aparat only needs its declared video flow).
4. Every attempt creates one `PlatformPublishLog`; success records status,
   completion time, provider output ID and, when supplied by the provider, its URL.
5. The composer/history UI displays the returned provider ID and clickable URL.
6. Authentication, permission, rate-limit, media-validation, and provider failures
   produce actionable localized-safe messages, never raw credentials or tracebacks.
7. Disconnect removes/deactivates the credential, subsequent status reports it as
   disconnected, and publishing fails clearly with `no_credential`.
8. A contract test covers connect → encrypted persistence → publish → log/output →
   understandable failure → disconnect, with provider HTTP calls stubbed in CI and a
   separately recorded sandbox smoke test before release.

## UI rule

Only `supported` and `beta` capabilities are interactive. `planned` capabilities
may be rendered disabled with a **Coming soon** badge; `not_available` capabilities
are hidden. Connection state alone must never enable analytics, inbox, comments, or
reviews.
