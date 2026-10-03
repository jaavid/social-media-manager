"""Telegram-specific publishing; shared Bale behavior stays in BotPublisher."""

import json

from ._bot_publisher import BotPublisher
from .base import PublishError, register_publisher
from . import telegram_content as dto


class TelegramPublisher(BotPublisher):
    platform = "telegram"
    API_BASE_URL = "https://api.telegram.org"
    SUPPORTED_TYPES = BotPublisher.SUPPORTED_TYPES | {"album", "rich", "poll"}

    def _routing_options(self, kwargs):
        for key in ("rich_message", "poll", "media_items", "suggested_post_parameters"):
            if key in kwargs:
                raise PublishError(
                    f"{key} requires its dedicated publishing mode",
                    code="unsupported_feature",
                )
        options = super()._routing_options(kwargs)
        if "reply_markup" in kwargs:
            raise PublishError(
                "Use validated buttons instead of raw reply markup",
                code="media_invalid",
            )
        return options

    @staticmethod
    def _result(payload):
        result = payload.get("result")
        rows = result if isinstance(result, list) else [result]
        if not rows or any(
            not isinstance(row, dict)
            or type(row.get("message_id")) is not int
            or row["message_id"] <= 0
            for row in rows
        ):
            raise PublishError(
                "Telegram returned no verifiable message IDs; reconcile before retrying",
                code="invalid_response",
            )
        return BotPublisher._result(payload)

    def _context(self, credential, kwargs):
        kwargs = dict(kwargs)
        account = getattr(credential, "social_account", None)
        if account and not kwargs.get("destination_id"):
            config = getattr(account, "telegram_config", None)
            if config and "destination_context" not in kwargs:
                kwargs["destination_context"] = config.destination_context
        return kwargs

    def _buttons(self, credential, rows, chat_id, *, rich=False):
        from social_stats.telegram_service import render_buttons

        return render_buttons(credential, dto.buttons(rows), chat_id, rich=rich)

    def publish(self, credential, *, media_type, content="", media_urls=None, **kwargs):
        kwargs = self._context(credential, kwargs)
        dto.validate_post(media_type, content, kwargs)
        if kwargs.get("buttons") and media_type not in ("text", "poll"):
            raise PublishError(
                "Use a Rich Message button block for this mode",
                code="unsupported_feature",
            )
        if media_type == "album" or (
            media_type == "carousel" and "media_items" in kwargs
        ):
            return self.publish_album(
                credential, content, kwargs.pop("media_items"), **kwargs
            )
        if media_type == "rich":
            return self.publish_rich(credential, kwargs.pop("rich_message"), **kwargs)
        if media_type == "poll":
            return self.publish_poll(credential, kwargs.pop("poll"), **kwargs)
        return super().publish(
            credential,
            media_type=media_type,
            content=content,
            media_urls=media_urls,
            **kwargs,
        )

    def publish_text(self, credential, content, **kwargs):
        kwargs = self._context(credential, kwargs)
        self._ensure_length(content, self.MAX_TEXT_LENGTH, "Text")
        options = self._routing_options(kwargs)
        chat = self._destination(credential, **kwargs)
        if kwargs.get("buttons"):
            options["reply_markup"] = json.dumps(
                {
                    "inline_keyboard": [
                        self._buttons(credential, kwargs["buttons"], chat)
                    ]
                }
            )
        return self._result(
            self._client(credential).call(
                "sendMessage",
                data={
                    "chat_id": chat,
                    "text": content,
                    **options,
                },
            )
        )

    def publish_image(self, credential, content, image_urls, **kwargs):
        return super().publish_image(
            credential, content, image_urls, **self._context(credential, kwargs)
        )

    def publish_video(
        self, credential, content, video_url, *, thumbnail=None, **kwargs
    ):
        return super().publish_video(
            credential,
            content,
            video_url,
            thumbnail=thumbnail,
            **self._context(credential, kwargs),
        )

    def publish_carousel(self, credential, content, image_urls, **kwargs):
        return super().publish_carousel(
            credential, content, image_urls, **self._context(credential, kwargs)
        )

    def publish_album(self, credential, content, media_items, **kwargs):
        kwargs = self._context(credential, kwargs)
        media = dto.album(media_items, content)
        return self._result(
            self._client(credential).call(
                "sendMediaGroup",
                data={
                    "chat_id": self._destination(credential, **kwargs),
                    "media": json.dumps(media, ensure_ascii=False),
                    **self._routing_options(kwargs),
                },
            )
        )

    def publish_rich(self, credential, rich_message, **kwargs):
        kwargs = self._context(credential, kwargs)
        value = dto.rich_message(rich_message)
        account = getattr(credential, "social_account", None)
        config = getattr(account, "telegram_config", None) if account else None
        if (
            config
            and not config.rich_enabled
            and kwargs.get("rich_fallback") is not True
        ):
            raise PublishError(
                "Rich Messages are disabled for this account; choose explicit fallback",
                code="unsupported_feature",
            )
        if kwargs.get("rich_fallback") is True:
            return self.publish_text(credential, dto.fallback(value), **kwargs)
        chat = self._destination(credential, **kwargs)

        def render(rows):
            for block in rows:
                if block["type"] == "buttons":
                    block["buttons"] = self._buttons(
                        credential, block["buttons"], chat, rich=True
                    )
                if "blocks" in block:
                    render(block["blocks"])
                for item in block.get("items", []):
                    render(item["blocks"])

        render(value["blocks"])
        return self._result(
            self._client(credential).call(
                "sendRichMessage",
                data={
                    "chat_id": chat,
                    "rich_message": json.dumps(value, ensure_ascii=False),
                    **self._routing_options(kwargs),
                },
            )
        )

    def publish_poll(self, credential, poll, **kwargs):
        kwargs = self._context(credential, kwargs)
        context = kwargs.get("destination_context") or {}
        data = dto.poll(poll, context.get("destination_type", "channel"))
        for key in ("options", "correct_option_ids", "country_codes"):
            if key in data:
                data[key] = json.dumps(data[key], ensure_ascii=False)
        chat = self._destination(credential, **kwargs)
        if kwargs.get("buttons"):
            data["reply_markup"] = json.dumps(
                {
                    "inline_keyboard": [
                        self._buttons(credential, kwargs["buttons"], chat)
                    ]
                }
            )
        return self._result(
            self._client(credential).call(
                "sendPoll",
                data={
                    **data,
                    "chat_id": chat,
                    **self._routing_options(kwargs),
                },
            )
        )

    def reply_to_dm(self, credential, conversation_id, text, **kwargs):
        # Thread ID is created by our ingestion pipeline, never supplied by users.
        parts = conversation_id.split(":")
        if len(parts) != 3 or parts[0] not in ("dm", "private"):
            raise PublishError(
                "Telegram thread requires a verified chat/topic mapping",
                code="invalid_destination",
            )
        kind, chat, topic = parts
        try:
            topic = int(topic)
            int(chat)
        except ValueError:
            raise PublishError(
                "Invalid Telegram thread", code="invalid_destination"
            ) from None
        context = {
            "destination_type": "channel_direct_messages"
            if kind == "dm"
            else ("private_forum" if topic else "private")
        }
        if topic:
            context[
                "direct_messages_topic_id" if kind == "dm" else "message_thread_id"
            ] = topic
        return self.publish_text(
            credential, text, destination_id=chat, destination_context=context
        )


register_publisher("telegram", TelegramPublisher)
