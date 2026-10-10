# Project-owned messenger bots

Telegram and Bale channel connections use the project's bot. Users enter a channel
username or numeric ID, add the displayed project bot as an administrator, enable
permission to post messages, temporarily put the verification code in the channel
description, and select **Verify permissions and connect**. They
never create a bot or supply its token. Custom user bots are not offered yet.

Operators configure `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`,
`BALE_BOT_TOKEN`, and `BALE_BOT_USERNAME` in the backend environment. Use the
username belonging to that token, without `@`. Tokens remain server-side;
the connection API exposes only the bot username and configuration status.
Restart application workers after changing these settings. Publishing resolves
managed tokens from current server configuration, so token rotation does not
require editing each channel connection.

Both the workspace connection endpoint and the legacy bot-channel endpoint accept
`destination_id` and the server-issued `verification_token` for these providers. User token/API-key submissions are
rejected. Before storing an active connection, the server calls `getMe`,
`getChat`, and `getChatMember`, requires a channel destination and an administrator
with `can_post_messages=true`, and stores its canonical numeric ID. The signed verification token is bound to the authenticated user, workspace and
provider and expires after 30 minutes. The server requires its random code in the
channel description, proving channel management access; knowing a public channel
username or seeing another workspace’s code is insufficient. The code can be
removed after connection. Verification does not send a test message. Connected-account health rechecks these permissions;
upstream failures never count as ready.

Existing manually provisioned bot credentials remain usable for publishing. An
explicit reconnect switches them to the project bot after verification; existing
account identity checks still apply. No automatic data migration changes old bots. Reconnecting a managed bot clears
old account webhook secrets and disables the previous account assistant, without
changing a remote bot webhook.

Telegram offers one webhook per bot. Workspace-level webhook registration is
blocked for managed bots so channel setup cannot replace the project's webhook.
Central inbound routing is a separate future feature. The Telegram Cloud account
link remains a separate read-only review feature.

Eitaa remains planned/experimental and its connection capability stays disabled.
Its Eitaayar API is not assumed to support Telegram's administrator-permission
protocol. Implement and verify its native channel flow before enabling it.

Protocol references: [Telegram Bot API](https://core.telegram.org/bots/api#getchatmember)
and [Bale Bot API](https://docs.bale.ai/#getchatmember). Live-provider verification
requires operator-configured bots and test channels; automated tests use simulated
provider responses.
