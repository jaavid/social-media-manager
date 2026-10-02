# Account-aware sync upgrade (PR #83 / ACC-005, issue #41)

## Historical identity

Migration 0068 adds account references but deliberately leaves all historical
metrics, conversations, reviews and logs unassigned. A currently unique
credential is not proof of historical ownership: credentials may have been
replaced or deleted. Never attach these records to the next account to sync.

New syncs write only to their selected account. Unfiltered summary and timeseries
prefer account-attributed metrics over unassigned rows for the same workspace,
platform and day. Legacy-only days remain visible; account filters exclude legacy
history. This preserves historical rows without counting overlapping data twice.

Existing unassigned Facebook, Instagram and YouTube threads, and Google Business
reviews, are quarantined when sync encounters the same external identifier.
They are not recreated and their automation/realtime events are not replayed.
New messages on those threads are deferred until identity is reconciled. Replies
return `account_identity_required` until the original account is verified.

To reconcile, independently verify the original external page/channel/location
using provider records or durable historical evidence, then explicitly attach the
matching historical records to that workspace's SocialAccount. Verify there are
no already-attributed records with the same unique key before making changes.
A sole remaining credential or the order of sync execution is never evidence.
Do not guess ownership of daily aggregate metrics or historical audit logs.

## Coordinated deployment

1. Back up the database and verify recovery before upgrading.
2. Pause beat, incoming webhook dispatch and other sync/publish producers.
3. Drain old Celery work and stop all old workers. New jobs include
   `credential_id`, which pre-upgrade workers cannot accept.
4. Apply migrations through 0068; deploy the matching API and worker code.
5. Start only upgraded workers, verify registered tasks, then resume producers.
6. Smoke-test two accounts of the same platform: account-specific sync/status,
   distinct metrics and threads, exact-account replies, and webhook dispatch.

Do not run mixed old/new worker versions during the transition. Old client-only
jobs refuse ambiguous scopes instead of silently selecting the first account.

Migration 0068 rejects direct reversal before changing the schema. The previous
platform-wide unique keys cannot represent multiple accounts. Prefer rolling
forward. Recovery to the previous application requires restoring the pre-upgrade
backup (new writes will need separate preservation and reconciliation), or a
reviewed data-preserving reconciliation plan before any schema downgrade.
