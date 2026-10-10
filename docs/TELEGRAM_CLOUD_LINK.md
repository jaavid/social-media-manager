# RAVINTA Telegram Cloud: read-only review navigation

This integration is separate from publishing bots, channel Webhooks and the older
`TelegramIntegration` / `TelegramAssistantLink` models. It operates on an
individually linked, **read-only** user session.

## HTTP contracts (prefix `/api/tgcloud/`)

| Method | Route | Authentication and purpose |
|---|---|---|
| GET | `link-code/` | Browser session: linked status |
| POST | `link-code/` | Browser session: create 192-bit, 10-minute single-use device code |
| DELETE | `link-code/` | Browser session: revoke the code and linked session |
| POST | `claim/` | Single-use code: exchange for random 30-day bearer token |
| GET | `session/` | Bearer: limited account summary and expiration |
| DELETE | `session/` | Bearer: revoke **this** linked session |
| GET | `reviews/` | Bearer: first 5 currently authorized pending posts |
| GET | `reviews/?before=<id>` | Bearer: next 5 authorized posts by descending post ID |
| GET | `reviews/<id>/` | Bearer: authorized detail of a single pending post |

### Response examples

```json
{"count": 1, "rows": [{"id": 100, "workspace": "Example", "title": "Review", "excerpt": "text", "platforms": ["telegram"]}], "next_cursor": null}
```

The server examines at most 100 pending-post candidates per request and
returns up to five authorized posts. `next_cursor` is the ID of the last
**examined** candidate when unexamined candidates remain, not an offset or
necessarily the last visible post. Some batches can return `count: 0` with
a non-null cursor when none of the scanned posts are authorized; the bot can
then request the next batch. A `null` cursor means the scan is exhausted.
The server filters scope and RBAC **before** selecting 5 visible posts. If
an item becomes published or the user loses access, fetching its detail returns
404. Invalid cursors return 400. Unauthenticated/expired/revoked bearer tokens
return 401. No endpoint accepts approvals, rejection, scheduling or publishing.

The detail response includes bounded `content`, `media_type`, `scheduled_at`
and the listed fields, but never media URLs, provider overrides or credentials.

## Security model

- Link codes are single-use and only their SHA-256 digests are stored in
  PostgreSQL. The bot tries to delete `/connect CODE` messages after receiving.
- Django stores only the SHA-256 digest of each read-only bearer token. The
  token is kept in private Telegram Cloud SQLite, never in source or chat output.
- **Trust limitation:** Django cannot cryptographically verify the Telegram
  sender claimed by `claim/`. Anyone who obtains an unused link code could
  claim a different Telegram ID. Do not expose codes outside the authenticated
  browser and the private bot chat. This flow must be redesigned before allowing
  any content mutations from Telegram.
- Django rechecks `accessible_workspaces`, `approve_posts`, self-approval,
  pending agency approvals, account activity and pending post status on every
  page and every detail fetch.
- A browser disconnect or `DELETE session/` invalidates the bearer token
  immediately; it is never silently renewed.
- All routes return `Cache-Control: no-store`.

## Deployment order

1. Merge and deploy the Django PR; these additions do not require database migrations.
2. Verify that `/api/tgcloud/` is routed publicly to Django.
3. Merge the bot PR: it uses the existing SQLite `django_links` table, with no
   database schema change.
4. In RAVINTA Settings generate a link code; privately `/connect CODE`.
5. Test `/status`, `/review`, a post detail, pagination, `/disconnect`,
   and browser-side disconnect. Verify the bot cannot read other workspaces.

The `TGCLOUD_TOKEN` secret on GitHub is only a deployment credential.
There is no new serverless runtime secret for the read-only implementation.
