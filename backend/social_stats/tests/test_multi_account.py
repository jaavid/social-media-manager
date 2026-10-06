from datetime import date
from unittest.mock import patch

from django.test import TestCase

from social_stats.models import Client, DailyMetric, PlatformCredential, SocialAccount
from social_stats.views.oauth import _save_credential
from social_stats.tasks import sync_all


class MultiAccountCredentialTests(TestCase):
    def setUp(self):
        self.workspace = Client.objects.create(
            name='Workspace', company='Workspace', email='workspace@example.com',
        )

    def test_oauth_upserts_by_workspace_platform_and_external_id(self):
        _save_credential(self.workspace.pk, 'youtube', {
            'channel_id': 'channel-a', 'channel_name': 'First', 'access_token': 'token-a',
        })
        _save_credential(self.workspace.pk, 'youtube', {
            'channel_id': 'channel-b', 'channel_name': 'Second', 'access_token': 'token-b',
        })

        self.assertEqual(SocialAccount.objects.count(), 2)
        self.assertEqual(PlatformCredential.objects.count(), 2)
        self.assertSetEqual(
            set(SocialAccount.objects.values_list('external_id', flat=True)),
            {'channel-a', 'channel-b'},
        )

    def test_reconnect_updates_only_matching_account(self):
        for token in ('old-a', 'old-b'):
            suffix = token[-1]
            _save_credential(self.workspace.pk, 'youtube', {
                'channel_id': f'channel-{suffix}', 'access_token': token,
            })
        _save_credential(self.workspace.pk, 'youtube', {
            'channel_id': 'channel-a', 'channel_name': 'Renamed', 'access_token': 'new-a',
        })

        first = PlatformCredential.objects.get(social_account__external_id='channel-a')
        second = PlatformCredential.objects.get(social_account__external_id='channel-b')
        self.assertEqual(first.access_token, 'new-a')
        self.assertEqual(first.social_account.display_name, 'Renamed')
        self.assertEqual(second.access_token, 'old-b')

    def test_public_identity_never_contains_tokens(self):
        fields = {field.name for field in SocialAccount._meta.fields}
        self.assertNotIn('access_token', fields)
        self.assertNotIn('refresh_token', fields)

    def test_metrics_for_two_accounts_do_not_overwrite_each_other(self):
        first = SocialAccount.objects.create(
            client=self.workspace, platform='youtube', external_id='channel-a',
        )
        second = SocialAccount.objects.create(
            client=self.workspace, platform='youtube', external_id='channel-b',
        )

        DailyMetric.objects.create(
            client=self.workspace, platform='youtube', social_account=first,
            date=date(2026, 10, 1), video_views=10,
        )
        DailyMetric.objects.create(
            client=self.workspace, platform='youtube', social_account=second,
            date=date(2026, 10, 1), video_views=20,
        )

        self.assertEqual(DailyMetric.objects.count(), 2)

    @patch('social_stats.tasks.sync_youtube.delay')
    def test_batch_sync_targets_every_credential(self, delay):
        for suffix in ('a', 'b'):
            account = SocialAccount.objects.create(
                client=self.workspace, platform='youtube', external_id=f'channel-{suffix}',
            )
            PlatformCredential.objects.create(
                client=self.workspace, platform='youtube', social_account=account,
                access_token=f'token-{suffix}',
            )

        sync_all('youtube')

        calls = {
            (call.args[0], call.kwargs['credential_id'])
            for call in delay.call_args_list
        }
        self.assertEqual(
            calls,
            {(self.workspace.id, credential.id) for credential in PlatformCredential.objects.all()},
        )


class LegacyAccountIdentityTests(TestCase):
    def setUp(self):
        from django.contrib.auth.models import User
        from rest_framework.test import APIClient

        self.workspace = Client.objects.create(
            name="Legacy", company="Legacy", email="legacy@example.com"
        )
        self.account = SocialAccount.objects.create(
            client=self.workspace, platform="facebook", external_id="page-a"
        )
        self.credential = PlatformCredential.objects.create(
            client=self.workspace,
            platform="facebook",
            social_account=self.account,
            page_id="page-a",
            access_token="test-token",
        )
        self.api = APIClient()
        from social_stats.models import UserProfile

        user = User.objects.create_superuser("admin", password="test")
        UserProfile.objects.create(user=user, role="client", client=self.workspace)
        self.api.force_authenticate(user)

    def test_migration_does_not_infer_historical_owner_from_remaining_credential(self):
        from importlib import import_module
        from django.apps import apps

        historical = DailyMetric.objects.create(
            client=self.workspace, platform="facebook", date=date(2026, 10, 1)
        )
        SocialAccount.objects.create(
            client=self.workspace,
            platform="facebook",
            external_id="removed-page",
            is_active=False,
        )
        migration = import_module(
            "social_stats.migrations.0068_alter_conversation_unique_together_and_more"
        )
        migration.populate_social_accounts(apps, None)
        historical.refresh_from_db()
        self.assertIsNone(historical.social_account_id)

    def test_rollback_requires_reconciliation(self):
        from importlib import import_module
        from django.db.migrations.exceptions import IrreversibleError

        migration = import_module(
            "social_stats.migrations.0068_alter_conversation_unique_together_and_more"
        )
        with self.assertRaises(IrreversibleError):
            migration.prevent_unsafe_reverse(None, None)

    def test_summary_and_timeseries_keep_unassigned_history_separate(self):
        DailyMetric.objects.create(
            client=self.workspace, platform="facebook", date=date(2026, 10, 1), likes=90
        )
        DailyMetric.objects.create(
            client=self.workspace,
            platform="facebook",
            social_account=self.account,
            date=date(2026, 10, 1),
            likes=12,
        )
        DailyMetric.objects.create(
            client=self.workspace, platform="facebook", date=date(2026, 9, 30), likes=3
        )
        DailyMetric.objects.create(
            client=self.workspace, platform="youtube", date=date(2026, 10, 1), likes=4
        )
        params = {"since": "2026-09-30", "until": "2026-10-01"}
        base = f"/api/clients/{self.workspace.pk}"
        summary = self.api.get(f"{base}/summary/", params)
        self.assertEqual(summary.status_code, 200, summary.content)
        self.assertEqual(summary.data["totals"]["total_likes"], 12)
        series = self.api.get(f"{base}/timeseries/", params)
        self.assertEqual(series.status_code, 200, series.content)
        self.assertEqual(len(series.data), 1)
        self.assertEqual(len(summary.data["unassigned_history"]), 3)
        legacy = self.api.get(
            f"{base}/timeseries/", {**params, "attribution": "unassigned"}
        )
        self.assertEqual(len(legacy.data), 3)
        scoped = self.api.get(
            f"{base}/summary/", {**params, "social_account": self.account.pk}
        )
        self.assertEqual(scoped.data["totals"]["total_likes"], 12)

    @patch("social_stats.inbox_tasks.dispatch_event")
    @patch("social_stats.inbox_tasks.push_event")
    def test_legacy_comments_are_not_recreated_or_replayed(self, push, dispatch):
        from social_stats.inbox_tasks import _upsert_fb_ig_comment, _upsert_yt_comment
        from social_stats.models import Conversation, Message

        for platform in ("facebook", "instagram", "youtube"):
            with self.subTest(platform=platform):
                account = (
                    self.account
                    if platform == "facebook"
                    else SocialAccount.objects.create(
                        client=self.workspace,
                        platform=platform,
                        external_id=f"{platform}-a",
                    )
                )
                legacy = Conversation.objects.create(
                    client=self.workspace,
                    platform=platform,
                    platform_thread_id="thread-a",
                )
                Message.objects.create(
                    conversation=legacy, platform_message_id="comment-a", content="old"
                )
                if platform == "youtube":
                    created = _upsert_yt_comment(
                        self.workspace.pk,
                        "thread-a",
                        "comment-a",
                        {"textOriginal": "old"},
                        is_top=True,
                        social_account_id=account.pk,
                    )
                else:
                    created = _upsert_fb_ig_comment(
                        self.workspace.pk,
                        platform,
                        "thread-a",
                        {"id": "comment-a"},
                        social_account_id=account.pk,
                    )
                self.assertFalse(created)
                self.assertEqual(
                    Conversation.objects.filter(platform=platform).count(), 1
                )
                legacy.refresh_from_db()
                self.assertIsNone(legacy.social_account_id)
        self.assertEqual(Message.objects.count(), 3)
        dispatch.assert_not_called()
        push.assert_not_called()

    def test_null_account_replies_cannot_use_remaining_credential(self):
        from social_stats.models import Conversation, UnifiedReview

        objects = (
            (
                "conversations",
                Conversation.objects.create(
                    client=self.workspace,
                    platform="facebook",
                    platform_thread_id="unknown",
                ),
            ),
            (
                "reviews",
                UnifiedReview.objects.create(
                    client=self.workspace,
                    platform="facebook",
                    platform_review_id="unknown",
                ),
            ),
        )
        for endpoint, record in objects:
            with (
                self.subTest(endpoint=endpoint),
                patch("social_stats.platforms.engagement.get_provider") as publisher,
            ):
                response = self.api.post(
                    f"/api/inbox/{endpoint}/{record.pk}/reply/",
                    {"text": "hello"},
                    format="json",
                )
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.data["code"], "account_identity_required")
                publisher.assert_not_called()

    def test_legacy_dispatch_rejects_multiple_accounts(self):
        from social_stats.inbox_tasks import _active_cred
        from social_stats.tasks import _active_credential

        second = SocialAccount.objects.create(
            client=self.workspace, platform="facebook", external_id="page-b"
        )
        PlatformCredential.objects.create(
            client=self.workspace,
            platform="facebook",
            social_account=second,
            access_token="b",
        )
        self.assertIsNone(_active_cred(self.workspace.pk, "facebook"))
        with self.assertRaises(PlatformCredential.DoesNotExist):
            _active_credential(self.workspace.pk, "facebook")
        self.assertEqual(
            _active_cred(self.workspace.pk, "facebook", self.credential.pk),
            self.credential,
        )

    def test_meta_webhook_dispatches_once_per_account_for_same_workspace(self):
        import hashlib
        import hmac
        import json
        from django.test import override_settings

        for platform, obj, field in (
            ("facebook", "page", "page_id"),
            ("instagram", "instagram", "instagram_account_id"),
        ):
            with self.subTest(platform=platform):
                credentials = []
                for suffix in ("b", "c"):
                    account = SocialAccount.objects.create(
                        client=self.workspace,
                        platform=platform,
                        external_id=f"{platform}-{suffix}",
                    )
                    credentials.append(
                        PlatformCredential.objects.create(
                            client=self.workspace,
                            platform=platform,
                            social_account=account,
                            access_token="test",
                            **{field: account.external_id},
                        )
                    )
                body = json.dumps(
                    {
                        "object": obj,
                        "entry": [
                            {"id": c.social_account.external_id}
                            for c in credentials + credentials
                        ],
                    }
                ).encode()
                signature = (
                    "sha256=" + hmac.new(b"secret", body, hashlib.sha256).hexdigest()
                )
                with (
                    override_settings(META_WEBHOOK_SECRET="secret"),
                    patch(
                        f"social_stats.inbox_tasks.sync_{platform}_inbox.delay"
                    ) as delay,
                ):
                    response = self.api.post(
                        "/api/webhooks/meta/",
                        body,
                        content_type="application/json",
                        HTTP_X_HUB_SIGNATURE_256=signature,
                    )
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.data["fired_clients"], 1)
                self.assertEqual(delay.call_count, 2)
                self.assertEqual(
                    {call.kwargs["credential_id"] for call in delay.call_args_list},
                    {c.pk for c in credentials},
                )

    @patch("social_stats.tasks.requests.get")
    def test_metric_sync_preserves_unassigned_history_and_is_repeatable(self, get):
        from social_stats.tasks import sync_youtube

        account = SocialAccount.objects.create(
            client=self.workspace,
            platform="youtube",
            external_id="channel-a",
        )
        credential = PlatformCredential.objects.create(
            client=self.workspace,
            platform="youtube",
            social_account=account,
            access_token="test",
            channel_id="channel-a",
        )
        legacy = DailyMetric.objects.create(
            client=self.workspace,
            platform="youtube",
            date=date(2026, 10, 1),
            video_views=90,
        )
        get.return_value.json.return_value = {
            "columnHeaders": [{"name": "day"}, {"name": "views"}],
            "rows": [["2026-10-01", 12]],
        }
        for _ in range(2):
            sync_youtube(self.workspace.pk, credential_id=credential.pk)
        legacy.refresh_from_db()
        self.assertIsNone(legacy.social_account_id)
        self.assertEqual(legacy.video_views, 90)
        self.assertEqual(DailyMetric.objects.count(), 2)
        summary = self.api.get(
            f"/api/clients/{self.workspace.pk}/summary/",
            {"since": "2026-10-01", "until": "2026-10-01"},
        )
        self.assertEqual(summary.data["totals"]["total_video_views"], 12)

    @patch("social_stats.inbox_tasks.requests.get")
    @patch(
        "social_stats.publishers._google_client.GoogleClient.access_token",
        return_value="test",
    )
    def test_legacy_gmb_review_is_not_recreated(self, token, get):
        from social_stats.inbox_tasks import sync_gmb_reviews_unified
        from social_stats.models import UnifiedReview

        account = SocialAccount.objects.create(
            client=self.workspace,
            platform="google_my_business",
            external_id="location-a",
        )
        credential = PlatformCredential.objects.create(
            client=self.workspace,
            platform="google_my_business",
            social_account=account,
            access_token="test",
            gmb_account_id="owner-a",
            gmb_location_id="location-a",
        )
        legacy = UnifiedReview.objects.create(
            client=self.workspace,
            platform="google_my_business",
            platform_review_id="review-a",
        )
        get.return_value.status_code = 200
        get.return_value.json.return_value = {
            "reviews": [{"reviewId": "review-a", "starRating": "FIVE"}]
        }
        self.assertEqual(
            sync_gmb_reviews_unified(self.workspace.pk, credential_id=credential.pk), 0
        )
        self.assertEqual(UnifiedReview.objects.count(), 1)
        legacy.refresh_from_db()
        self.assertIsNone(legacy.social_account_id)

    def test_accountless_credentials_cannot_write_sync_or_inbox_records(self):
        from social_stats.tasks import _active_credential, sync_youtube
        from social_stats.inbox_tasks import _active_cred, sync_youtube_inbox
        from social_stats.models import SyncLog, Conversation

        credential = PlatformCredential.objects.create(
            client=self.workspace,
            platform="youtube",
            access_token="legacy",
        )
        self.assertIsNone(_active_cred(self.workspace.pk, "youtube", credential.pk))
        with self.assertRaises(PlatformCredential.DoesNotExist):
            _active_credential(self.workspace.pk, "youtube", credential.pk)
        with (
            patch("social_stats.tasks.requests.get") as metrics,
            patch("social_stats.inbox_tasks.requests.get") as inbox,
        ):
            sync_youtube(self.workspace.pk, credential_id=credential.pk)
            sync_youtube_inbox(self.workspace.pk, credential_id=credential.pk)
        metrics.assert_not_called()
        inbox.assert_not_called()
        self.assertEqual(SyncLog.objects.count(), 0)
        self.assertEqual(Conversation.objects.count(), 0)

    @patch("social_stats.tasks.requests.post")
    @patch("social_stats.tasks.requests.get")
    def test_multi_location_gmb_sync_does_not_overwrite_legacy_business_details(
        self, get, post
    ):
        from social_stats.tasks import sync_gmb
        from social_stats.models import GMBBusinessInfo, GMBReview
        from django.utils import timezone
        from datetime import timedelta

        legacy = GMBBusinessInfo.objects.create(
            client=self.workspace, business_name="Unresolved", avg_rating=3
        )
        credentials = []
        for suffix in ("a", "b"):
            account = SocialAccount.objects.create(
                client=self.workspace,
                platform="google_my_business",
                external_id=f"location-{suffix}",
            )
            credentials.append(
                PlatformCredential.objects.create(
                    client=self.workspace,
                    platform="google_my_business",
                    social_account=account,
                    access_token="test",
                    gmb_location_id=account.external_id,
                    expires_at=timezone.now() + timedelta(hours=1),
                )
            )
        get.return_value.json.return_value = {'multiDailyMetricTimeSeries': []}
        for credential in credentials:
            sync_gmb(self.workspace.pk, credential_id=credential.pk)
        post.assert_not_called()
        self.assertEqual(get.call_count, 2)
        for call in get.call_args_list:
            self.assertIn('businessprofileperformance.googleapis.com', call.args[0])
            self.assertIn('dailyRange.startDate.year', call.kwargs['params'])
        legacy.refresh_from_db()
        self.assertEqual(legacy.business_name, "Unresolved")
        self.assertEqual(legacy.avg_rating, 3)
        self.assertEqual(GMBReview.objects.count(), 0)
        for endpoint in ('info', 'reviews'):
            response = self.api.get(f'/api/gmb/{endpoint}/{self.workspace.pk}/')
            self.assertEqual(response.status_code, 409)
            history = self.api.get(
                f'/api/gmb/{endpoint}/{self.workspace.pk}/', {'attribution': 'unassigned'},
            )
            self.assertEqual(history.status_code, 200)
