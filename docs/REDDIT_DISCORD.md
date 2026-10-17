# Reddit and Discord integrations

Both integrations are **beta**. Local contract/transport tests do not certify live
API access. Deploy migration `0089`, backend, frontend and workers together.

## Discord

Create a Discord application and bot in the Developer Portal. Install the bot
in the intended server; enable the **Message Content** privileged intent
(approval may be necessary for verified applications). Grant **View Channel**,
**Read Message History**, **Send Messages**, **Attach Files** and, for threads,
**Send Messages in Threads**. Connect with the bot token and a guild text,
announcement or thread channel ID in Connected Accounts. Bot credentials are
encrypted at rest. Personal user tokens and personal-account DMs are unsupported.

- Publish text (2,000 characters), one image or one video (10 MiB ceiling).
  Media is downloaded through the public-HTTPS SSRF boundary and uploaded as an
  attachment. Mentions, including `@everyone`, are suppressed by default.
- Scheduling, queueing, per-account authorization and publish-result handling
  use the existing publishing pipeline. Ambiguous mutations are never retried
  automatically; inspect the remote channel before retrying manually.
- Inbox polling imports human messages and replies in this connected channel.
  Replies are sent by the bot in that same channel. Bot messages and webhook
  messages are excluded. Reading arbitrary server channels or user DMs is not
  implied by connecting one channel.
- Analytics are explicitly labelled snapshots of the latest **up to 100
  messages** and their reaction counts. They are not reach, impressions,
  unique audience, or lifetime channel totals.
- Disconnect removes only the local connection. It does not kick a shared bot
  out of the server or rotate its token.

Without Message Content access, Discord can return empty content/attachments;
connection and polling check the application flags and fail before importing
such an incomplete Inbox. Enable this in the Developer Portal. Polling does not
provide Gateway event delivery or discover every server thread automatically.
Connect a thread explicitly when it is a separate publishing destination.

## Reddit

Obtain Reddit approval for the intended Data API use. Configure the backend:

```dotenv
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_REDIRECT_URI=https://YOUR_API_HOST/api/oauth/reddit/callback/
REDDIT_USER_AGENT=web:ravinta:v1.0 (by /u/YOUR_REDDIT_USERNAME)
```

Register the exact callback URL in the Reddit web application. In Connected
Accounts, choose Reddit, enter a subreddit, then approve OAuth consent. Consent
is bound to the signed-in user, workspace and optional reconnect account, expires
after ten minutes, and is single-use. Permission is checked again on callback.
The scopes are `identity read submit privatemessages`; access tokens refresh
using the encrypted refresh token when a scoped operation needs them.

- A destination is a specific **Reddit identity + subreddit** pair. Reconnecting
  cannot silently replace it with another user's account or another subreddit.
- The Composer extension accepts a title (up to 300 characters), optional HTTPS
  link, flair template ID, NSFW and spoiler flags. Without a link, it creates a
  self post (up to 40,000 characters); with a link, a link post. If no separate
  title is entered, the first content line is the title. Subreddit restrictions
  and flair rules still apply and Reddit can reject publication.
- Native Reddit image, gallery and video upload are **not implemented or
  advertised as supported**. Hosted media can be shared as an explicit link
  post. The documented public submit contract does not establish a native
  media-upload workflow; that needs a separately validated API contract and
  real application access before it can be enabled.
- Inbox includes account mail and comment replies, filtered to the selected
  subreddit for comments. Account mail is account-wide and may appear under
  more than one connected subreddit for that same authorized identity.
- The comment stream imports comments on the connected user's posts in the
  selected subreddit. Replies are bound to stored inbound threads for that
  account. Reddit Chat is a separate service and is not exposed by this Data
  API integration.
- Account analytics contain subreddit subscribers and account link/comment
  karma as snapshots. A remote-post stats adapter returns score, comment count
  and upvote ratio; there is no claim of impressions or a post-metrics UI.
- Disconnect removes this local destination without revoking sibling
  destinations' shared OAuth grant. Revoke the application in Reddit to revoke
  its account-wide grant remotely.

## Inbox operations and egress

The existing five-minute Inbox beat fan-out queues these account-scoped polling
tasks. Each run reads at most three pages per stream; pagination survives across
runs, and inserts and cursors commit together. Initial import is bounded to the
last seven days and the history that each API makes available. Polling cannot
recover content already removed or beyond the API's listing/history limits.

Connected Accounts also provides **Sync Inbox**, an authorized queue operation.
Its success means queued, not imported. Workers and beat must be running. Failed
API requests do not advance the cursor; token rejection marks the connection as
requiring reconnection. Other errors are logged with a safe code and retried by
the next scheduled poll. No raw remote error or credential is included in logs.

Egress allowlists include `discord` (`discord.com`), `reddit`
(`oauth.reddit.com`) and `reddit_oauth` (`www.reddit.com`). In gateway mode, add
the corresponding `discord`, `reddit` and `reddit-oauth` routes to the external
gateway. Existing gateway credentials must remain server-side.

## Live acceptance still required

Use dedicated test accounts to verify OAuth/reconnect, a real scheduled post,
media attachments on Discord, human inbound messages/comments, replies, token
refresh, disconnection and metrics readback. Automated tests mock the network
and make no real posts or account changes.

Official references:

- [Discord messages](https://docs.discord.com/developers/resources/message)
- [Discord channels](https://docs.discord.com/developers/resources/channel)
- [Reddit Data API](https://www.reddit.com/dev/api/)
- [Reddit access approval](https://support.reddithelp.com/hc/en-us/articles/14945211791892-Developer-Platform-Accessing-Reddit-Data)
