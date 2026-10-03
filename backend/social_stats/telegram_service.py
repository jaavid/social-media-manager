"""Telegram inbound protocol and safe server-resolved interactions."""

import secrets
from datetime import datetime, timedelta, timezone as dt_timezone

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from .models import (
    SocialAccount,
    TelegramIntegration,
    Conversation,
    Message,
    TelegramUpdate,
    TelegramSuggestion,
    TelegramCallback,
    TelegramAssistantLink,
    TelegramAssistantRun,
)
from .publishers.base import PublishError


def render_buttons(credential, buttons, chat_id, *, rich=False):
    out = []
    for button in buttons:
        row = {"text": button["text"]}
        if "url" in button:
            row["url"] = button["url"]
        else:
            account = getattr(credential, "social_account", None)
            if not account:
                raise PublishError(
                    "Callbacks require a connected account",
                    code="account_identity_required",
                )
            token = secrets.token_urlsafe(24)
            TelegramCallback.objects.create(
                token=token,
                account=account,
                chat_id=str(chat_id),
                expires_at=timezone.now() + timedelta(days=7),
            )
            row["callback_data"] = token
        out.append(row)
    return out


def bot_client(account):
    from .publishers.telegram import TelegramPublisher

    credential = account.credential
    if (
        not account.is_active
        or not credential.is_active
        or credential.client_id != account.client_id
    ):
        raise PublishError("Telegram account is disconnected", code="account_inactive")
    return TelegramPublisher()._client(credential)


def _callback(account, query):
    token = query.get("data")
    message = query.get("message") or {}
    with transaction.atomic():
        row = (
            # Lock only the callback; credential is a nullable joined relation.
            TelegramCallback.objects.select_for_update(of=("self",))
            .select_related("account__credential")
            .filter(
                token=token, account__client=account.client, account__is_active=True
            )
            .first()
        )
        valid = (
            row
            and row.account.credential.is_active
            and row.account.credential.access_token == account.credential.access_token
            and row.action == "acknowledge"
            and row.expires_at > timezone.now()
            and row.chat_id == str((message.get("chat") or {}).get("id"))
            and type((query.get("from") or {}).get("id")) is int
        )
        if valid and row.consumed_at is None:
            row.consumed_at = timezone.now()
            row.telegram_user_id = query["from"]["id"]
            row.save(update_fields=["consumed_at", "telegram_user_id"])
    # This public acknowledgement carries no application privilege.
    bot_client(account).call(
        "answerCallbackQuery",
        data={
            "callback_query_id": query["id"],
            "text": "Acknowledged" if valid else "This action is unavailable",
        },
    )


def process_update(update_pk):
    """DB lock serializes a single update; failures roll back and can be retried."""
    with transaction.atomic():
        update = (
            TelegramUpdate.objects.select_for_update()
            .select_related("account__client")
            .get(pk=update_pk)
        )
        if update.status != "pending" or (update.retry_at and update.retry_at > timezone.now()):
            return
        account = update.account
        payload = update.payload
        if payload.get("callback_query"):
            _callback(account, payload["callback_query"])
        stopped = payload.get("stopped_message_generation")
        if stopped:
            chat = stopped.get("chat") or {}
            topic = stopped.get("message_thread_id") or 0
            TelegramAssistantRun.objects.filter(
                conversation__social_account=account,
                conversation__platform_thread_id=f"private:{chat.get('id')}:{topic}",
                draft_id=stopped.get("draft_id"),
                state__in=["pending", "generating"],
            ).update(cancelled=True)
        message = payload.get("message") or payload.get("edited_message")
        if message:
            _message(account, update, message)
        update.status = "processed"
        update.payload = {}  # Private payload is not retained after successful ingestion.
        update.error_code = ""
        update.retry_at = None
        update.save(update_fields=["status", "payload", "error_code", "retry_at"])
        account.telegram_config.last_update_at = timezone.now()
        account.telegram_config.save(update_fields=["last_update_at"])


def _message(account, update, message):
    chat = message.get("chat") or {}
    is_dm = chat.get("is_direct_messages") is True
    is_private = chat.get("type") == "private"
    if not is_dm and not is_private:
        return
    if is_dm:
        parent_id = str((chat.get("parent_chat") or {}).get("id", ""))
        if parent_id not in (
            str(account.credential.platform_user_id),
            account.external_id,
        ):
            # One Telegram bot owns one webhook. Route only to a verified account
            # in this workspace using the same bot; never infer another tenant.
            candidates = SocialAccount.objects.filter(
                client=account.client,
                platform="telegram",
                is_active=True,
                credential__is_active=True,
            ).select_related("credential")
            account = next(
                (
                    a
                    for a in candidates
                    if parent_id in (a.external_id, a.credential.platform_user_id)
                    and a.credential.is_active
                    and a.credential.access_token == account.credential.access_token
                ),
                None,
            )
            if not account:
                return
            TelegramIntegration.objects.get_or_create(account=account)
        topic = (message.get("direct_messages_topic") or {}).get("topic_id")
        if type(topic) is not int or topic <= 0:
            return
    else:
        topic = message.get("message_thread_id") or 0
    if (
        type(chat.get("id")) is not int
        or type(message.get("message_id")) is not int
        or type(topic) is not int
    ):
        raise PublishError("Invalid Telegram message routing", code="invalid_update")
    sender = (
        message.get("from")
        or (message.get("direct_messages_topic") or {}).get("user")
        or {}
    )
    thread = f"{'dm' if is_dm else 'private'}:{chat['id']}:{topic}"
    conv, _ = Conversation.objects.get_or_create(
        client=account.client,
        platform="telegram",
        social_account=account,
        platform_thread_id=thread,
        defaults={
            "type": "dm",
            "contact_handle": str(sender.get("id") or ""),
            "contact_name": str(sender.get("first_name") or "")[:200],
        },
    )
    # Lock thread to avoid lost unread counters and out-of-order preview regressions.
    conv = Conversation.objects.select_for_update().get(pk=conv.pk)
    content = message.get("text") or message.get("caption") or ""
    media = {
        key: message[key]
        for key in (
            "photo",
            "video",
            "document",
            "audio",
            "voice",
            "poll",
            "rich_message",
        )
        if key in message
    }
    if not content and not media:
        content = "[Unsupported Telegram message]"
    try:
        sent_at = datetime.fromtimestamp(message.get("date") or 0, tz=dt_timezone.utc)
    except (TypeError, ValueError, OverflowError, OSError):
        raise PublishError("Invalid Telegram date", code="invalid_update") from None
    msg, created = Message.objects.get_or_create(
        conversation=conv,
        platform_message_id=str(message["message_id"]),
        direction="inbound",
        defaults={
            "content": content,
            "author_handle": str(sender.get("id") or ""),
            "author_name": str(sender.get("first_name") or "")[:200],
            "sent_at": sent_at,
            "media_urls": [{"telegram": media}] if media else [],
        },
    )
    if not created and update.payload.get("edited_message"):
        msg.content = content
        msg.media_urls = [{"telegram": media}] if media else []
        msg.save(update_fields=["content", "media_urls"])
    if created:
        Conversation.objects.filter(pk=conv.pk).update(
            unread_count=F("unread_count") + 1
        )
    if conv.last_message_at is None or sent_at >= conv.last_message_at:
        conv.last_message_preview = content[:500]
        conv.last_message_at = sent_at
        conv.save(update_fields=["last_message_preview", "last_message_at"])
    info = message.get("suggested_post_info")
    if info and is_dm:
        suggestion, fresh = TelegramSuggestion.objects.get_or_create(
            client=account.client,
            account=account,
            conversation=conv,
            message_id=message["message_id"],
            defaults={
                "content": content,
                "media": media,
                "proposal": info,
                "provider_state": info.get("state", "pending"),
                "provider_update_id": update.update_id,
            },
        )
        if not fresh and update.update_id > suggestion.provider_update_id:
            suggestion.provider_update_id = update.update_id
            suggestion.proposal = info
            suggestion.provider_state = info.get("state", "pending")
            if suggestion.provider_state in ("approved", "declined"):
                suggestion.state = suggestion.provider_state
            suggestion.save()
    for event, state in (
        ("suggested_post_approved", "approved"),
        ("suggested_post_declined", "declined"),
        ("suggested_post_approval_failed", "expired_or_invalid"),
        ("suggested_post_paid", "paid"),
        ("suggested_post_refunded", "refunded"),
    ):
        details = message.get(event)
        if details:
            source = details.get("suggested_post_message") or {}
            TelegramSuggestion.objects.filter(
                account=account,
                conversation=conv,
                message_id=source.get("message_id"),
                provider_update_id__lt=update.update_id,
            ).update(
                provider_update_id=update.update_id,
                provider_state=state,
                state=state,
            )
    if (
        is_private
        and created
        and account.telegram_config.assistant_enabled
        and message.get("text")
    ):
        link = TelegramAssistantLink.objects.filter(
            account=account, telegram_user_id=sender.get("id")
        ).first()
        if not link:
            return  # Telegram identity alone never grants workspace access.
        from .authorization import evaluate

        if not evaluate(
            link.user, account.client, "draft_posts", account=account
        ).allowed:
            return
        TelegramAssistantRun.objects.filter(
            conversation=conv, state__in=["pending", "generating"]
        ).update(cancelled=True)
        run = TelegramAssistantRun.objects.create(
            conversation=conv,
            source_update=update,
            user=link.user,
            prompt=content[:4096],
            draft_id=secrets.randbelow(2147483646) + 1,
        )
        from .telegram_tasks import run_assistant

        transaction.on_commit(lambda: run_assistant.delay(run.pk))
