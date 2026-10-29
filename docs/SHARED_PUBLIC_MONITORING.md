# Shared Instagram public monitoring

Implemented locally on 2026-10-29. This is not a production rollout or a verified paid collection.

For example, twenty workspaces tracking `@example` now share one public profile and one collection of recent posts per freshness window. Opening a page performs database reads. Manual refresh and enrollment also use the same central reservation path and reuse fresh results.

## Collection and cost controls

- Identity: `(platform, normalized username)`. Usernames and Instagram profile URLs normalize to the same lower-case handle. Workspace-owned credentials, permissions and publishing identities remain separate.
- The hourly Beat sweep refreshes each profile and post sample only when its successful collection is at least 48 hours old. Failed collections also have a 48-hour submission cooldown. An outstanding batch is resumed instead of replaced. The existing Beat entry name is retained for deployment compatibility.
- Two official datasets are called through the existing mandatory Cloudflare gateway and the pinned Bright Data SDK: profile URLs use `gd_l1vikfch901nx3by4`; post discovery by profile URL uses `gd_lk5ns7kz21pck8jpis`. Both send multiple distinct inputs in one asynchronous job. These are complementary collections, rather than switching between a profile sample and full post records.
- Defaults: `BRIGHTDATA_BATCH_SIZE=25` (maximum 100), `BRIGHTDATA_CALENDAR_POST_LIMIT=5` (maximum 50), `BRIGHTDATA_DAILY_RECORD_LIMIT=2000` (0 disables new submissions). Existing explicit post limits still apply: review deployment configuration before enabling.
- A singleton database lock serializes reservations. Each profile reserves one record; each posts input reserves the configured post limit. Reservations include failed jobs and are counted per UTC calendar day. This is a conservative record allowance, not a guaranteed currency cap or control over calls outside this application.
- At defaults, 100 distinct accounts reserve up to 600 records per 48-hour refresh, regardless of subscriber count. This is not a cost quotation. Account-specific prices and actual delivered records determine billing.
- A batch has a database lease, a persisted snapshot ID, and durable GET polling. Duplicate deliveries cannot repeat the paid POST. A crash while submitting without a saved snapshot is reported as `brightdata_submission_unknown`; it is not automatically reposted in the same window. A transient download failure retains its snapshot. Collections time out after two hours.
- Profiles with no active subscriber in an active, unpaused workspace are not collected. Legacy in-flight source snapshots complete before the identity becomes eligible for a new shared job.

## Storage and presentation

| Stored data | Product placement |
| --- | --- |
| Name, public ID, bio, avatar, verified/business flags, category, website, follower/following/post counts | Account watchlist on Connections; calendar channel list; selected competitor |
| Actual profile/post observation timestamps, partial/error state, next freshness deadline | Shared profile summary in all three locations |
| Followers over time | Existing competitor snapshot API and follower timeline |
| Recent sample averages and engagement rate | Profile summary; competitor snapshot metrics. Sample size is explicit; engagement uses likes plus comments divided by public followers for records where both counts are known |
| Caption, post type/date, thumbnail, likes/comments/views | Existing calendar and competitor post APIs |
| Hashtags, tagged users, location, original photos/video links, content type | Calendar post drawer and competitor post cards |
| Complete provider rows and historical post versions | Internal `PublicObservation` history, with batch identity; never serialized as raw provider payloads to workspace APIs |
| Every collected post's latest public data | `PublicPostRecord`, shared with later subscribers; workspace read models retain old posts when they leave the recent sample |

Unknown metrics are absent or null and display as `—`, including unknown engagement. Public observations never populate private reach, impressions, saves, or publishing credentials. Individual target failures retain prior data and do not discard other successful accounts in the batch. Raw history preserves additional provider fields for subsequent supported product mappings; internal diagnostics and arbitrary provider fields are not dumped into the interface.

Workspace APIs expose public data only through the workspace's authorized source/account/competitor. Account-level denial also hides Instagram competitor snapshots and follower history. Provider snapshot IDs, raw responses and other workspaces' subscriptions are not returned. Removing a subscription leaves other workspaces' subscriptions intact. Instagram renames are not automatically merged based only on names.

## Rollout

1. Deploy code, apply Django migrations 0095 and 0096, and restart all Celery workers and Beat. There are no provider calls in migrations. Existing sources are linked by enrollment or the next sweep.
2. Keep `INSTAGRAM_CALENDAR_PROVIDER=brightdata`, `BRIGHTDATA_API_KEY`, and the existing gateway configuration. Review the post limit, batch size and record allowance. `BRIGHTDATA_CALENDAR_DISCOVERY` now affects only legacy/probe paths.
3. Confirm both new `social_stats.public_monitoring` tasks are registered. With a zero daily record allowance, links and cached projections can be checked without new paid submissions.
4. Verify a small real collection after configuring the intended allowance, then verify both workspace views for a shared handle. Local tests use provider fixtures and the real SDK request builder; they do not verify provider delivery, production configuration, pricing or worker availability.

References: [official profile API and batch example](https://brightdata.com/products/web-scraper/instagram/profiles), [official posts API](https://brightdata.com/products/web-scraper/instagram/posts).

## Local validation evidence

- Python 3.12: 109 targeted Django tests passed, covering shared collection, existing calendar/recovery, watchlist, competitors, connected accounts and task registration. Migration drift check passed. Provider-dependent tests use mocked responses; legacy Instagram tests explicitly select their provider.
- Frontend: 106 Jest suites / 589 tests passed; production build, TypeScript and i18n checks passed. Local Node is 22.21.1; CI's Node 20 was not available in this environment.
- One pre-existing exact-label assertion in the scheduling drawer was adjusted to accept the required-field marker; the scheduling component itself was unchanged.
- Browser: actual production Next build with synthetic API responses, Persian/English at 360px and 1440px. All four account profile summaries rendered without horizontal overflow or JavaScript errors. Zero product mutations were sent. Analytics were intercepted. Images are in `docs/screenshots/shared-public-monitoring/accounts-{fa,en}-{360,1440}.png`.
- Browser verification covers the account watchlist; calendar metadata and shared profile rendering also have component tests. These checks do not establish production or paid provider success.
