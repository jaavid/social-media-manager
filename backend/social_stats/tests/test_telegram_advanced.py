"""Bot API contracts and tenant isolation for the advanced Telegram surface."""

import json
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.contrib.auth.models import User
from django.test import SimpleTestCase, TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from social_stats.models import (
    Client,
    SocialAccount,
    PlatformCredential,
    UserProfile,
    Conversation,
    Message,
    TelegramIntegration,
    TelegramUpdate,
    TelegramSuggestion,
    TelegramCallback,
    TelegramAssistantLink,
    TelegramAssistantRun,
)
from social_stats.publishers.telegram import TelegramPublisher
from social_stats.publishers.bale import BalePublisher
from social_stats.publishers.base import PublishError, RateLimitError
from social_stats.publishers import telegram_content as dto
from social_stats.telegram_service import process_update, render_buttons


class ContentContracts(SimpleTestCase):
    def setUp(self):
        self.credential = SimpleNamespace(
            access_token="secret", platform_user_id="-100", social_account=None
        )
        self.publisher = TelegramPublisher()

    def items(self, count):
        return [
            {"type": "video" if i % 2 else "photo", "media": "A" * 24 + str(i)}
            for i in range(count)
        ]

    @patch("social_stats.publishers._bot_api_client.BotAPIClient.call")
    def test_mixed_album_limits_order_caption_ids(self, call):
        for count in (2, 10):
            call.return_value = {
                "ok": True,
                "result": [{"message_id": i + 1} for i in range(count)],
            }
            result = self.publisher.publish(
                self.credential,
                media_type="album",
                content="متن",
                media_items=self.items(count),
            )
            data = call.call_args.kwargs["data"]
            self.assertEqual(call.call_args.args[0], "sendMediaGroup")
            media = json.loads(data["media"])
            self.assertEqual(
                [x["media"] for x in media], [x["media"] for x in self.items(count)]
            )
            self.assertEqual(media[0]["caption"], "متن")
            self.assertNotIn("caption", media[1])
            self.assertEqual(len(result.platform_post_ids), count)
        before = call.call_count
        for count in (1, 11):
            with self.assertRaises(PublishError):
                self.publisher.publish(
                    self.credential, media_type="album", media_items=self.items(count)
                )
        self.assertEqual(call.call_count, before)

    @patch("social_stats.publishers._bot_api_client.BotAPIClient.call")
    def test_caption_and_media_validation_before_http(self, call):
        items = self.items(2)
        items[1]["caption"] = "second"
        self.assertEqual(dto.album(items, "first")[1]["caption"], "second")
        for value in (
            [{"type": "audio", "media": "A" * 24}] * 2,
            [{"type": "photo", "media": "http://127.0.0.1/private"}] * 2,
        ):
            with self.assertRaises(PublishError):
                self.publisher.publish(
                    self.credential, media_type="album", media_items=value
                )
        call.assert_not_called()

    @patch("social_stats.publishers._bot_api_client.BotAPIClient.call")
    def test_rich_rtl_slideshow_and_fallback(self, call):
        call.return_value = {"ok": True, "result": {"message_id": 7}}
        rich = {
            "is_rtl": True,
            "blocks": [
                {"type": "heading", "text": "عنوان", "size": 2},
                {"type": "paragraph", "text": "متن"},
                {"type": "pullquote", "text": "نقل قول"},
                {
                    "type": "slideshow",
                    "blocks": [
                        {"type": "photo", "photo": {"type": "photo", "media": "A" * 24}}
                    ]
                    * 2,
                },
                {
                    "type": "buttons",
                    "buttons": [{"text": "Read", "url": "https://example.com"}],
                },
            ],
        }
        self.publisher.publish(self.credential, media_type="rich", rich_message=rich)
        self.assertEqual(call.call_args.args[0], "sendRichMessage")
        payload = json.loads(call.call_args.kwargs["data"]["rich_message"])
        self.assertTrue(payload["is_rtl"])
        self.assertEqual(payload["blocks"][3]["type"], "slideshow")
        self.publisher.publish(
            self.credential, media_type="rich", rich_message=rich, rich_fallback=True
        )
        self.assertEqual(call.call_args.args[0], "sendMessage")
        self.assertIn("عنوان", call.call_args.kwargs["data"]["text"])
        with self.assertRaises(PublishError):
            self.publisher.publish(
                self.credential,
                media_type="rich",
                rich_message={"html": "<script>bad</script>"},
            )

    @patch("social_stats.publishers._bot_api_client.BotAPIClient.call")
    def test_topics_and_channel_rejection(self, call):
        call.return_value = {"ok": True, "result": {"message_id": 1}}
        for kind in ("forum_supergroup", "private_forum"):
            self.publisher.publish(
                self.credential,
                media_type="text",
                content="hi",
                destination_context={"destination_type": kind, "message_thread_id": 8},
            )
            self.assertEqual(call.call_args.kwargs["data"]["message_thread_id"], 8)
        with self.assertRaises(PublishError):
            self.publisher.publish(
                self.credential,
                media_type="text",
                destination_context={
                    "destination_type": "channel",
                    "message_thread_id": 8,
                },
            )
        call.side_effect = PublishError("Topic is invalid", code="400")
        with self.assertRaises(PublishError):
            self.publisher.publish(
                self.credential,
                media_type="text",
                content="hi",
                destination_context={
                    "destination_type": "private_forum",
                    "message_thread_id": 9,
                },
            )
        self.assertEqual(call.call_args.kwargs["data"]["message_thread_id"], 9)

    @patch("social_stats.publishers._bot_api_client.BotAPIClient.call")
    def test_poll_contract(self, call):
        call.return_value = {
            "ok": True,
            "result": {"message_id": 1, "poll": {"id": "p1"}},
        }
        self.publisher.publish(
            self.credential,
            media_type="poll",
            poll={
                "question": "Q",
                "options": ["A", "B"],
                "type": "quiz",
                "correct_option_ids": [0],
            },
        )
        self.assertEqual(call.call_args.args[0], "sendPoll")
        self.assertEqual(
            json.loads(call.call_args.kwargs["data"]["options"]),
            [{"text": "A"}, {"text": "B"}],
        )
        for value in (
            {"question": "", "options": ["a"]},
            {"question": "Q", "options": ["a"] * 13},
            {
                "question": "Q",
                "options": ["a"],
                "type": "quiz",
                "correct_option_ids": [5],
            },
        ):
            with self.assertRaises(PublishError):
                dto.poll(value)
        with self.assertRaises(PublishError):
            dto.poll({"question": "q", "options": ["a"]}, "channel_direct_messages")

    @patch("social_stats.publishers._bot_api_client.BotAPIClient.call")
    def test_bale_and_legacy_do_not_change(self, call):
        call.return_value = {"ok": True, "result": {"message_id": 1}}
        BalePublisher().publish_text(self.credential, "hello")
        self.assertEqual(call.call_args.args[0], "sendMessage")
        with self.assertRaises(PublishError):
            BalePublisher().publish(
                self.credential, media_type="rich", rich_message={"blocks": []}
            )
        self.publisher.publish_carousel(self.credential, "hello", ["file"])
        self.assertEqual(call.call_args.args[0], "sendPhoto")


@override_settings(CELERY_TASK_ALWAYS_EAGER=False)
class TelegramFixture(TestCase):
    def setUp(self):
        self.workspace = Client.objects.create(
            name="A", company="A", email="a@example.test"
        )
        self.user = User.objects.create_user("owner", password="password")
        UserProfile.objects.create(user=self.user, role="client", client=self.workspace)
        self.other = Client.objects.create(
            name="B", company="B", email="b@example.test"
        )
        self.account = SocialAccount.objects.create(
            client=self.workspace,
            platform="telegram",
            external_id="123:-100",
            display_name="Telegram",
        )
        self.credential = PlatformCredential.objects.create(
            client=self.workspace,
            platform="telegram",
            social_account=self.account,
            platform_user_id="-100",
            access_token="secret",
        )
        self.config = TelegramIntegration.objects.create(
            account=self.account, webhook_secret="webhook-secret", webhook_enabled=True
        )
        self.api = APIClient()
        self.api.force_authenticate(self.user)

    def payload(self, uid=1, topic=9, text="hello", **extra):
        return {
            "update_id": uid,
            "message": {
                "message_id": uid,
                "date": 1791000000 + uid,
                "text": text,
                "chat": {
                    "id": -200,
                    "type": "supergroup",
                    "is_direct_messages": True,
                    "parent_chat": {"id": -100},
                },
                "direct_messages_topic": {
                    "topic_id": topic,
                    "user": {"id": 80, "first_name": "Reader"},
                },
                **extra,
            },
        }

    def ingest(self, payload):
        row = TelegramUpdate.objects.create(
            account=self.account, update_id=payload["update_id"], payload=payload
        )
        process_update(row.pk)
        return row


class TelegramIntegrationTests(TelegramFixture):
    def test_nonobject_telegram_override_is_serializer_4xx_not_a_crash(self):
        from social_stats.serializers.composer import UnifiedPostSerializer

        for override in ('malformed', ['malformed'], 4, True):
            with self.subTest(override=override):
                serializer = UnifiedPostSerializer(data={
                    'client': self.workspace.pk, 'media_type': 'text',
                    'content': 'public fixture', 'target_platforms': ['telegram'],
                    'platform_overrides': {'telegram': override},
                })
                self.assertFalse(serializer.is_valid())
                self.assertEqual(str(serializer.errors['code'][0]), 'invalid_request')
                from rest_framework.exceptions import ValidationError
                with self.assertRaises(ValidationError) as caught:
                    serializer.is_valid(raise_exception=True)
                self.assertEqual(caught.exception.status_code, 400)

    @patch("social_stats.telegram_tasks.ingest_update.delay")
    def test_webhook_secret_replay_and_isolation(self, delay):
        api = APIClient()
        url = f"/api/webhooks/telegram/{self.account.pk}/"
        self.assertEqual(api.post(url, self.payload(), format="json").status_code, 403)
        for _ in range(2):
            self.assertEqual(
                api.post(
                    url,
                    self.payload(),
                    format="json",
                    HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN="webhook-secret",
                ).status_code,
                200,
            )
        self.assertEqual(TelegramUpdate.objects.count(), 1)
        process_update(TelegramUpdate.objects.get().pk)
        process_update(TelegramUpdate.objects.get().pk)
        self.assertEqual(Message.objects.count(), 1)
        self.ingest(self.payload(2, topic=10))
        self.assertEqual(Conversation.objects.count(), 2)
        payload = self.payload(3)
        payload["message"]["chat"]["parent_chat"]["id"] = -999
        self.ingest(payload)
        self.assertEqual(Message.objects.count(), 2)
        self.assertEqual(TelegramUpdate.objects.get(update_id=1).payload, {})

    @patch("social_stats.publishers._bot_api_client.BotAPIClient.call")
    def test_inbox_reply_targets_same_topic(self, call):
        self.ingest(self.payload())
        call.return_value = {"ok": True, "result": {"message_id": 5}}
        result = self.api.post(
            f"/api/inbox/conversations/{Conversation.objects.get().pk}/reply/",
            {"text": "reply"},
            format="json",
        )
        self.assertEqual(result.status_code, 201, result.data)
        self.assertEqual(call.call_args.kwargs["data"]["chat_id"], "-200")
        self.assertEqual(call.call_args.kwargs["data"]["direct_messages_topic_id"], 9)

    @patch("social_stats.publishers._bot_api_client.BotAPIClient.call")
    def test_suggestion_decisions_paid_terms_and_replay(self, call):
        self.ingest(self.payload(suggested_post_info={"state": "pending"}))
        self.assertEqual(TelegramSuggestion.objects.count(), 1)
        suggestion = TelegramSuggestion.objects.get()
        url = f"/api/telegram-suggestions/{suggestion.pk}/decide/"
        call.return_value = {"ok": True, "result": True}
        response = self.api.post(url, {"decision": "approve"}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(call.call_args.args[0], "approveSuggestedPost")
        self.assertEqual(
            call.call_args.kwargs["data"], {"chat_id": -200, "message_id": 1}
        )
        self.assertEqual(
            self.api.post(url, {"decision": "approve"}, format="json").status_code, 409
        )
        self.ingest(
            self.payload(
                2,
                suggested_post_info={
                    "state": "pending",
                    "price": {"amount": 10, "currency": "XTR"},
                },
            )
        )
        paid = TelegramSuggestion.objects.get(message_id=2)
        url = f"/api/telegram-suggestions/{paid.pk}/decide/"
        self.assertEqual(
            self.api.post(url, {"decision": "approve"}, format="json").status_code, 400
        )
        self.assertEqual(
            self.api.post(url, {"decision": "decline"}, format="json").status_code, 200
        )
        self.assertEqual(call.call_args.args[0], "declineSuggestedPost")

    def test_suggestion_copy_and_workspace_denial(self):
        self.ingest(self.payload(suggested_post_info={"state": "pending"}))
        suggestion = TelegramSuggestion.objects.get()
        response = self.api.post(
            f"/api/telegram-suggestions/{suggestion.pk}/decide/",
            {"decision": "accept_as_draft"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        suggestion.refresh_from_db()
        self.assertEqual(suggestion.draft.content, "hello")
        outsider = User.objects.create_user("outsider")
        UserProfile.objects.create(user=outsider, role="client", client=self.other)
        self.api.force_authenticate(outsider)
        self.assertEqual(
            self.api.get(f"/api/telegram-suggestions/{suggestion.pk}/").status_code, 404
        )
        self.assertEqual(
            self.api.get(
                f"/api/telegram-accounts/{self.account.pk}/settings/"
            ).status_code,
            404,
        )

    @patch("social_stats.publishers._bot_api_client.BotAPIClient.call")
    def test_callbacks_are_opaque_scoped_expiring_and_idempotent(self, call):
        call.return_value = {"ok": True, "result": True}
        button = render_buttons(
            self.credential, [{"text": "OK", "action": "acknowledge"}], -100
        )[0]
        token = button["callback_data"]
        self.assertLessEqual(len(token.encode()), 64)
        callback = TelegramCallback.objects.get(token=token)
        for uid, chat in ((1, -999), (2, -100), (3, -100)):
            self.ingest(
                {
                    "update_id": uid,
                    "callback_query": {
                        "id": str(uid),
                        "data": token,
                        "from": {"id": 80},
                        "message": {"chat": {"id": chat}},
                    },
                }
            )
        callback.refresh_from_db()
        self.assertEqual(callback.telegram_user_id, 80)
        first = callback.consumed_at
        callback.expires_at = timezone.now() - timedelta(seconds=1)
        callback.save()
        self.ingest(
            {
                "update_id": 4,
                "callback_query": {
                    "id": "4",
                    "data": token,
                    "from": {"id": 90},
                    "message": {"chat": {"id": -100}},
                },
            }
        )
        callback.refresh_from_db()
        self.assertEqual(callback.consumed_at, first)
        self.assertEqual(
            call.call_args.kwargs["data"]["text"], "This action is unavailable"
        )

    @patch("social_stats.telegram_tasks.run_assistant.delay")
    def test_assistant_explicit_identity_and_independent_topics(self, delay):
        self.config.assistant_enabled = True
        self.config.save()

        def private(uid, topic):
            p = self.payload(uid)
            p["message"].update(
                chat={"id": 80, "type": "private"},
                message_thread_id=topic,
                **{"from": {"id": 80}},
            )
            p["message"].pop("direct_messages_topic")
            return p

        self.ingest(private(1, 9))
        self.assertFalse(TelegramAssistantRun.objects.exists())
        TelegramAssistantLink.objects.create(
            account=self.account,
            telegram_user_id=80,
            user=self.user,
            created_by=self.user,
        )
        self.ingest(private(2, 9))
        self.ingest(private(3, 10))
        self.assertEqual(TelegramAssistantRun.objects.count(), 2)
        self.assertEqual(
            len(
                set(
                    TelegramAssistantRun.objects.values_list(
                        "conversation_id", flat=True
                    )
                )
            ),
            2,
        )
        run = TelegramAssistantRun.objects.first()
        self.ingest(
            {
                "update_id": 4,
                "stopped_message_generation": {
                    "chat": {"id": 80},
                    "message_thread_id": 9,
                    "draft_id": run.draft_id,
                },
            }
        )
        run.refresh_from_db()
        self.assertTrue(run.cancelled)


@override_settings(CELERY_TASK_ALWAYS_EAGER=False)
class TelegramAssistantExecutionTests(TelegramFixture):
    def make_run(self):
        self.config.assistant_enabled = True
        self.config.save()
        conv = Conversation.objects.create(
            client=self.workspace,
            platform="telegram",
            social_account=self.account,
            platform_thread_id="private:80:9",
            type="dm",
        )
        Message.objects.create(
            conversation=conv, direction="inbound", content="Draft a caption"
        )
        update = TelegramUpdate.objects.create(
            account=self.account, update_id=1, status="processed"
        )
        return TelegramAssistantRun.objects.create(
            conversation=conv,
            source_update=update,
            user=self.user,
            prompt="Draft a caption",
            draft_id=17,
        )

    @patch(
        "social_stats.telegram_tasks.time.monotonic", side_effect=[10, 10.1, 10.2, 11.5]
    )
    @patch(
        "social_stats.ai.AIClient.complete_stream",
        return_value=iter(["a", "b", "c", "d"]),
    )
    @patch("social_stats.publishers._bot_api_client.BotAPIClient.call")
    def test_stream_coalesces_and_final_message_is_persisted_once(
        self, call, stream, clock
    ):
        from social_stats.telegram_tasks import run_assistant

        call.return_value = {"ok": True, "result": {"message_id": 9}}
        run = self.make_run()
        run_assistant(run.pk)
        methods = [x.args[0] for x in call.call_args_list]
        self.assertEqual(
            methods, ["sendMessageDraft", "sendMessageDraft", "sendMessage"]
        )
        self.assertEqual(call.call_args.kwargs["data"]["text"], "abcd")
        run.refresh_from_db()
        self.assertEqual(run.state, "completed")
        self.assertEqual(Message.objects.filter(direction="outbound").count(), 1)
        run_assistant(run.pk)
        self.assertEqual(call.call_count, 3)

    @patch("social_stats.ai.AIClient.complete_stream", return_value=iter(["never"]))
    @patch("social_stats.publishers._bot_api_client.BotAPIClient.call")
    def test_stop_skips_drafts_and_leaves_final_state(self, call, stream):
        from social_stats.telegram_tasks import run_assistant

        call.return_value = {"ok": True, "result": {"message_id": 9}}
        run = self.make_run()
        run.cancelled = True
        run.save()
        run_assistant(run.pk)
        self.assertEqual([x.args[0] for x in call.call_args_list], ["sendMessage"])
        run.refresh_from_db()
        self.assertEqual(run.state, "cancelled")

    @patch("social_stats.telegram_tasks.time.monotonic", side_effect=[10, 10.1])
    @patch("social_stats.ai.AIClient.complete_stream", return_value=iter(["الف", "ب"]))
    @patch("social_stats.publishers._bot_api_client.BotAPIClient.call")
    def test_rich_drafts_finalize_as_rich_messages(self, call, stream, clock):
        from social_stats.telegram_tasks import run_assistant

        call.return_value = {"ok": True, "result": {"message_id": 9}}
        run = self.make_run()
        self.config.assistant_rich = True
        self.config.save()
        run_assistant(run.pk)
        self.assertEqual(
            [x.args[0] for x in call.call_args_list],
            ["sendRichMessageDraft", "sendRichMessage"],
        )
        self.assertEqual(
            json.loads(call.call_args.kwargs["data"]["rich_message"])["blocks"][0][
                "text"
            ],
            "الفب",
        )

    @patch("social_stats.ai.AIClient.complete_stream")
    def test_revoked_application_permission_cannot_generate(self, stream):
        from social_stats.telegram_tasks import run_assistant

        run = self.make_run()
        self.user.is_active = False
        self.user.save()
        run_assistant(run.pk)
        stream.assert_not_called()
        run.refresh_from_db()
        self.assertEqual(run.state, "denied")

    @patch("social_stats.publishers._bot_api_client.BotAPIClient.call")
    def test_ambiguous_suggestion_requires_reconciliation(self, call):
        self.ingest(self.payload(suggested_post_info={"state": "pending"}))
        call.side_effect = PublishError("Timeout", code="timeout")
        suggestion = TelegramSuggestion.objects.get()
        url = f"/api/telegram-suggestions/{suggestion.pk}/decide/"
        self.assertEqual(
            self.api.post(url, {"decision": "approve"}, format="json").status_code, 400
        )
        self.assertEqual(
            self.api.post(url, {"decision": "approve"}, format="json").status_code, 409
        )
        self.assertEqual(call.call_count, 1)

    @patch("social_stats.publishers._bot_api_client.BotAPIClient.call")
    def test_saved_topics_are_scoped_and_used_on_publication(self, call):
        call.return_value = {
            "ok": True,
            "result": {"id": -100, "type": "supergroup", "is_forum": True},
        }
        url = f"/api/telegram-accounts/{self.account.pk}/settings/"
        response = self.api.post(
            url,
            {
                "destination_context": {
                    "destination_type": "forum_supergroup",
                    "message_thread_id": 7,
                }
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.credential = PlatformCredential.objects.get(pk=self.credential.pk)
        call.return_value = {"ok": True, "result": {"message_id": 1}}
        TelegramPublisher().publish(self.credential, media_type="text", content="hello")
        self.assertEqual(call.call_args.kwargs["data"]["message_thread_id"], 7)

    def test_rich_draft_serializer_preserves_payload_and_blocks_other_platforms(self):
        from social_stats.serializers.composer import UnifiedPostSerializer

        rich = {"is_rtl": True, "blocks": [{"type": "paragraph", "text": "متن"}]}
        serializer = UnifiedPostSerializer(
            data={
                "client": self.workspace.pk,
                "media_type": "rich",
                "target_platforms": ["telegram"],
                "platform_overrides": {"telegram": {"rich_message": rich}},
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        post = serializer.save(created_by=self.user)
        self.assertEqual(post.platform_overrides["telegram"]["rich_message"], rich)
        serializer = UnifiedPostSerializer(
            data={
                "client": self.workspace.pk,
                "media_type": "rich",
                "target_platforms": ["bale"],
            }
        )
        self.assertFalse(serializer.is_valid())

    def test_out_of_order_updates_do_not_overwrite_latest_preview(self):
        self.ingest(self.payload(3, text="latest"))
        self.ingest(self.payload(2, text="earlier"))
        self.assertEqual(Conversation.objects.get().last_message_preview, "latest")
        self.assertEqual(Conversation.objects.get().unread_count, 2)

    @patch("social_stats.publishers._bot_api_client.BotAPIClient.call")
    def test_same_bot_multiple_channels_route_to_correct_account(self, call):
        second = SocialAccount.objects.create(
            client=self.workspace, platform="telegram", external_id="-101"
        )
        PlatformCredential.objects.create(
            client=self.workspace,
            platform="telegram",
            social_account=second,
            platform_user_id="-101",
            access_token="secret",
        )
        payload = self.payload()
        payload["message"]["chat"]["parent_chat"]["id"] = -101
        self.ingest(payload)
        self.assertEqual(Conversation.objects.get().social_account_id, second.pk)

    def test_retention_prunes_receipts_and_rejects_older_ids(self):
        from social_stats.telegram_tasks import prune_telegram_updates

        self.ingest(self.payload(1))
        TelegramUpdate.objects.update(created_at=timezone.now() - timedelta(days=31))
        prune_telegram_updates()
        self.assertFalse(TelegramUpdate.objects.exists())
        self.config.refresh_from_db()
        self.assertEqual(self.config.replay_floor, 1)
        api = APIClient()
        response = api.post(
            f"/api/webhooks/telegram/{self.account.pk}/",
            self.payload(1),
            format="json",
            HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN="webhook-secret",
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(TelegramUpdate.objects.exists())

    @patch("social_stats.egress.outbound_request")
    @patch("social_stats.publishers._bot_api_client.BotAPIClient.call")
    def test_media_preview_never_exposes_token_and_requires_workspace_access(
        self, call, outbound
    ):
        self.ingest(
            self.payload(
                suggested_post_info={"state": "pending"},
                photo=[{"file_id": "file1", "width": 10, "height": 10}],
            )
        )
        suggestion = TelegramSuggestion.objects.get()
        call.return_value = {
            "ok": True,
            "result": {"file_path": "photos/test.jpg", "file_size": 4},
        }
        response = MagicMock(status_code=200)
        response.iter_content.return_value = [b"jpeg"]
        outbound.return_value = response
        result = self.api.get(
            f"/api/telegram-suggestions/{suggestion.pk}/media/?kind=photo"
        )
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.content, b"jpeg")
        self.assertNotIn("secret", str(dict(result.items())))
        self.assertEqual(
            outbound.call_args.kwargs["gateway_path"], "/file/photos/test.jpg"
        )
        outsider = User.objects.create_user("preview-outsider")
        UserProfile.objects.create(user=outsider, role="client", client=self.other)
        self.api.force_authenticate(outsider)
        self.assertEqual(
            self.api.get(
                f"/api/telegram-suggestions/{suggestion.pk}/media/?kind=photo"
            ).status_code,
            404,
        )

    @patch("social_stats.scheduler.publish_unified_post.delay")
    def test_queue_preserves_advanced_payload(self, delay):
        from social_stats.models import UnifiedPost, PostQueue, QueuedItem
        from social_stats.scheduler import _dispatch_queued_item

        queue = PostQueue.objects.create(
            client=self.workspace, name="Telegram", platforms=["telegram"]
        )
        payload = {
            "telegram": {
                "social_account_id": self.account.pk,
                "poll": {"question": "q", "options": ["a", "b"]},
            }
        }
        post = UnifiedPost.objects.create(
            client=self.workspace,
            created_by=self.user,
            target_platforms=["telegram"],
            media_type="poll",
            platform_overrides=payload,
        )
        response = self.api.post(
            f"/api/composer/posts/{post.pk}/add_to_queue/",
            {"queue_id": queue.pk},
            format="json",
        )
        self.assertEqual(
            response.status_code, 201, getattr(response, "data", response.content)
        )
        item = QueuedItem.objects.get()
        _dispatch_queued_item(queue, item)
        item.refresh_from_db()
        self.assertEqual(item.unified_post.media_type, "poll")
        self.assertEqual(item.unified_post.platform_overrides, payload)

    @patch("social_stats.publishers._bot_api_client.BotAPIClient.call")
    def test_suggestion_approval_executor_uses_original_message(self, call):
        from social_stats.approval_executors import _exec_telegram_suggestion

        self.ingest(self.payload(suggested_post_info={"state": "pending"}))
        suggestion = TelegramSuggestion.objects.get()
        call.return_value = {"ok": True, "result": True}
        approval = SimpleNamespace(
            client=self.workspace,
            requested_by=self.user,
            decided_by=self.user,
            payload={"suggestion_id": suggestion.pk, "decision": "approve"},
            edited_payload={},
        )
        result, _, _ = _exec_telegram_suggestion(approval)
        self.assertTrue(result)
        self.assertEqual(call.call_args.args[0], "approveSuggestedPost")

    @patch(
        "social_stats.telegram_tasks.process_update",
        side_effect=RateLimitError("wait", retry_after=17),
    )
    def test_webhook_rate_limit_uses_celery_countdown(self, process):
        from celery.exceptions import Retry
        from social_stats.telegram_tasks import ingest_update

        row = TelegramUpdate.objects.create(account=self.account, update_id=1)
        with patch.object(ingest_update, "retry", side_effect=Retry) as retry:
            with self.assertRaises(Retry):
                ingest_update.run(row.pk)
        self.assertEqual(retry.call_args.kwargs["countdown"], 17)

    @patch("social_stats.telegram_tasks.ingest_update.delay")
    @patch("social_stats.telegram_tasks.run_assistant.delay")
    def test_recovery_does_not_bypass_rate_limit_delay(self, assistant, ingest):
        from social_stats.telegram_tasks import recover_telegram_jobs

        row = TelegramUpdate.objects.create(
            account=self.account,
            update_id=1,
            retry_at=timezone.now() + timedelta(minutes=10),
        )
        TelegramUpdate.objects.filter(pk=row.pk).update(
            created_at=timezone.now() - timedelta(minutes=2)
        )
        recover_telegram_jobs()
        ingest.assert_not_called()

    def test_persisted_retry_limit_survives_new_celery_task_ids(self):
        from social_stats.telegram_tasks import _record_failure

        row = TelegramUpdate.objects.create(
            account=self.account, update_id=1, payload={"private": "body"}
        )
        for i in range(4):
            self.assertEqual(_record_failure(row.pk, "processing_failed", 60), i < 3)
        row.refresh_from_db()
        self.assertEqual(row.status, "failed")
        self.assertEqual(row.retry_count, 4)
        self.assertEqual(row.payload, {})
