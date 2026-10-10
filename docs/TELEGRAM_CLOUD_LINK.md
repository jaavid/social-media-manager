# Telegram Cloud bot: read-only account link (RAVINTA)

This integration is distinct from the existing Telegram publishing/channel
`TelegramIntegration` and `TelegramAssistantLink` models. It does not affect
the publisher webhooks or any other social provider.

## Routes (prefix `/api/tgcloud/`)

| Method | Route | Authentication |
|---|---|---|
| GET | `link-code/` | Normal logged-in browser user; current link status |
| POST | `link-code/` | Logged-in browser user; create 192-bit, 10-minute, single-use challenge |
| DELETE | `link-code/` | Logged-in browser user; revoke link, pending code and token |
| POST | `claim/` | 192-bit link code (bearer authorization) + positive Telegram sender ID |
| GET | `reviews/` | Revocable 30-day read-only bearer session |

`claim/` returns a random 256-bit session credential once; only its SHA-256 digest
is stored in Django. The complete credential is saved by the bot on Telegram
Cloud's private SQLite storage, never embedded in source control, CLI Secrets,
API logs, or Telegram messages.

**Security boundary:** The one-time code conveys authorization from the logged-in
RAVINTA user; Django cannot independently prove the asserted Telegram sender's
identity without an additional Telegram-origin cryptographic attestation.
An attacker in possession of an unused code could claim an arbitrary Telegram ID.
Codes must remain in the authenticated UI and a private Telegram chat, are
single-use, expire within 10 minutes, and should not be copied into logs or tickets.
The backend session is restricted to **GET reviews only**; it does not authorize
approve/reject/publish. No workspace ID is trusted from the bot: every read
re-evaluates Django's current `accessible_workspaces` and `approve_posts`
permission including owner/agency and self-approval restrictions.

## Deployment order

1. Deploy this Django backend and run `python manage.py migrate` (migration `0085`).
2. Make sure the public `/api/tgcloud/` routes are exposed by the actual API
   reverse proxy. Telegram Cloud's `tgcloud/lib/django.js` points at the
   public URL `https://social.ahangeatiye.ir/api/tgcloud` by default;
   verify or adjust the host before deploying the bot.
3. Deploy `jaavid/ravinta-tgcloud` bot after backend tests and smoke checks pass.
4. From RAVINTA **Settings**, generate a code; use `/connect CODE` in the
   bot's private chat; then run `/review`.
5. Test unlinking and verify `/review` loses access; verify cross-workspace
   restrictions and a revoked `approve_posts` grant immediately affect results.

Both bot and backend PRs should be reviewed separately. Don't merge the bot
first because its additive tgcloud SQLite migration will be deployed automatically.

## Operational notes

- No new runtime environment secret is needed for Telegram Cloud. The existing
  `TGCLOUD_TOKEN` GitHub secret remains **deployment-only**.
- Re-link rotates a user's session, expiring the old bearer credential at once.
- If a user needs a new code, issuing another code invalidates the former.
- 30-day session expiry deliberately requires re-linking; sessions are not
  silently extended.
- The route does not use the older, broader approval-queue API because it
  lacks the same action-specific filtering for bot clients.
