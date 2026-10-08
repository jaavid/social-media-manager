# Provider onboarding issue / PR template

Copy into a child issue of #113 and into its implementation PR. Link
[the integration contract](PLATFORM_INTEGRATION_CONTRACT.md). Keep the rollout
`discovery` / `planned` / `experimental` until evidence supports promotion.

## Identity and evidence

- [ ] Canonical key, Persian/English name, category, brand and destination kinds.
- [ ] Official API documentation URLs, access requirements, terms and quota evidence
      recorded in #113 or the linked child issue; no unsupported readiness claims.
- [ ] Auth strategy, permissions, expiry, refresh/revocation and operational setup.
- [ ] One validated manifest with complete statuses and concrete constraints.

## Required for every provider

- [ ] Deterministic registration, unique canonical/runtime key, public metadata parity.
- [ ] Unsupported operations rejected before HTTP; typed results/errors.
- [ ] Encrypted credentials separated from public identity; multiple accounts,
      reconnect and scoped disconnect tested.
- [ ] Cross-workspace and same-workspace cross-account access denied; authorization
      remains enforced at the entrypoint, not assumed from an account ID.
- [ ] Metadata, connection responses, repr, logs and user-facing exceptions contain
      no secrets or internal transport paths.
- [ ] Shared egress origin policy and file/media SSRF, redirect and byte limits.
- [ ] No provider-name branch added to generic Composer/Settings/Inbox/Analytics.
- [ ] `check_provider_conformance`, backend tests, frontend Jest/build and migration
      drift checks pass; failures identify the specific provider contract.

## Capability-selected behavior (mark unsupported rows N/A)

- [ ] Connect: valid/invalid auth, reconnect, expired/error readiness, refresh,
      remote revoke if supported, local disconnect and extension cleanup.
- [ ] Publish: media/content/scope/destination validation precedes HTTP; normalized
      IDs/results; scheduling/approval payload preserved.
- [ ] Publish: rate-limit/backoff budget, durable account-scoped idempotency and
      ambiguous mutation reconciliation; no replay after timeout without evidence.
- [ ] Inbound: signed webhook verification or polling cursor/checkpoint semantics;
      durable deduplication, authenticity failure, conversation/account isolation.
- [ ] Reply/comment/review: scopes and thread ownership validated before transport.
- [ ] Analytics/sync: normalized numeric metrics, freshness/cursor/error behavior,
      account scoping and internal raw response separation.
- [ ] Optional feature extension is declared and implemented in the provider layer.

## Promotion to beta / active

- [ ] Official API evidence is linked and current.
- [ ] Every enabled capability has transport-mocked and real sandbox end-to-end tests.
- [ ] Relevant conformance tests pass and public support claims match the evidence.
- [ ] Readiness/operations, rotation, rate limits and support/recovery documented.
- [ ] Generic product surfaces recognize the provider through metadata/capabilities.

PR validation should name commands, passed results and any genuine limitations.
Offline fixture tests alone cannot qualify a real provider as beta or active.
# Telegram/Bale review boundaries (2026-10-08)

The active Telegram provider resolves rich/album `asset:` media in
`platforms/providers/telegram.py:prepare_publish`; an unavailable, empty or
malformed resolver result must raise the stable `media_invalid` PublishError.
The composer serializer's active typed-intent/options boundary already rejects
non-object Telegram overrides with HTTP 400; regression coverage verifies that
existing behavior rather than restoring the historical serializer path.

Telegram poll options use the product's editorial minimum of two and the current
provider maximum of twelve. The official [sendPoll contract](https://core.telegram.org/bots/api#sendpoll)
currently permits **1–12**, so the product minimum is intentionally stricter and
must not be described as a Telegram API rejection. Question/answer and quiz bounds
remain unchanged. Telegram [sendMediaGroup](https://core.telegram.org/bots/api#sendmediagroup)
documents 2–10 items and media captions up to 1024 characters. The independently
checked [Bale documentation](https://docs.bale.ai) specifies 0–1024 for InputMedia
captions; its fetched sendMediaGroup table did not independently state the numeric
2–10 bound. Existing Bale product limits/photo-only supported capability remain
conservative product policy, not proof of an identical Telegram API.

Historical non-integer error-code and single-image carousel findings are already
handled by `_bot_api_client` and `_bot_publisher`; regression tests preserve the
safe error and sendPhoto behavior. This branch does not complete legacy reconnect,
suggestion UI/permissions or provider-specific criterion reconciliation in #186.
Checks on an unmerged branch do not constitute post-merge main verification.
