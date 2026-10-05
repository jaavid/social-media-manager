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
