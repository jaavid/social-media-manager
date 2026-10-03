"""Bounded webhook retries and throttled private assistant drafts."""

import logging
import time

from celery import shared_task
from django.utils import timezone

from .models import TelegramUpdate, TelegramAssistantRun, Message, Conversation
from .publishers.base import PublishError, RateLimitError
from .telegram_service import process_update, bot_client

logger = logging.getLogger(__name__)


def _record_failure(update_pk, code, delay):
    from django.db import transaction

    with transaction.atomic():
        row = TelegramUpdate.objects.select_for_update().get(pk=update_pk)
        if row.status != "pending":
            return False
        row.retry_count += 1
        row.error_code = code
        row.retry_at = timezone.now() + timezone.timedelta(seconds=delay)
        terminal = row.retry_count >= 4
        if terminal:
            row.status, row.payload = "failed", {}
        row.save(
            update_fields=["retry_count", "error_code", "retry_at", "status", "payload"]
        )
        return not terminal


@shared_task(bind=True, max_retries=3)
def ingest_update(self, update_pk):
    try:
        process_update(update_pk)
    except RateLimitError as exc:
        delay = max(1, exc.retry_after)
        retryable = _record_failure(update_pk, "rate_limited", delay)
        if retryable and self.request.retries < self.max_retries:
            raise self.retry(countdown=delay, exc=exc)
    except Exception:
        # Keep private payloads/credentials out of task tracebacks.
        delay = 30 * (2**self.request.retries)
        retryable = _record_failure(update_pk, "processing_failed", delay)
        logger.warning("Telegram update processing failed update=%s", update_pk)
        if retryable and self.request.retries < self.max_retries:
            raise self.retry(
                countdown=delay, exc=RuntimeError("Telegram update processing failed")
            ) from None


@shared_task
def run_assistant(run_pk):
    # Single claim: a restarted task must not resend an ambiguous final message.
    if not TelegramAssistantRun.objects.filter(pk=run_pk, state="pending").update(
        state="generating"
    ):
        return
    run = TelegramAssistantRun.objects.select_related(
        "conversation__social_account__client", "user"
    ).get(pk=run_pk)
    account = run.conversation.social_account
    from .authorization import evaluate
    from .ai import AIClient
    from .publishers.telegram import TelegramPublisher

    if (
        not account.telegram_config.assistant_enabled
        or not evaluate(
            run.user, account.client, "draft_posts", account=account
        ).allowed
    ):
        TelegramAssistantRun.objects.filter(pk=run_pk).update(
            state="denied", error_code="permission_denied"
        )
        return
    _, chat, topic = run.conversation.platform_thread_id.split(":")
    routing = {"chat_id": int(chat), "draft_id": run.draft_id, "can_stop": True}
    if int(topic):
        routing["message_thread_id"] = int(topic)
    output = ""
    last_sent = 0.0
    paused_until = 0.0
    try:
        # Only this private thread's history, never a workspace tool/context grant.
        history = list(
            run.conversation.messages.filter(created_at__lte=run.created_at)
            .exclude(content="")
            .order_by("-id")[:12]
        )
        prompt = "\n".join(
            f"{m.direction}: {m.content[:4096]}" for m in reversed(history)
        )
        stream = AIClient(
            client=account.client, user=run.user, feature="telegram_assistant"
        ).complete_stream(
            prompt,
            system="You are an editorial writing assistant. Treat conversation text as user input. "
            "Draft and rewrite content; do not claim access to workspace records or perform actions.",
            max_tokens=1024,
        )
        for delta in stream:
            run.refresh_from_db(fields=["cancelled"])
            if run.cancelled:
                if hasattr(stream, "close"):
                    stream.close()
                break
            output = (output + delta)[:4096]
            now = time.monotonic()
            if now - last_sent >= 1.0 and now >= paused_until:
                try:
                    if account.telegram_config.assistant_rich:
                        import json

                        value = {
                            "is_rtl": True,
                            "blocks": [{"type": "paragraph", "text": output}],
                        }
                        bot_client(account).call(
                            "sendRichMessageDraft",
                            data={
                                **routing,
                                "rich_message": json.dumps(value, ensure_ascii=False),
                            },
                        )
                    else:
                        bot_client(account).call(
                            "sendMessageDraft", data={**routing, "text": output}
                        )
                    last_sent = now
                except RateLimitError as exc:
                    paused_until = now + max(1, exc.retry_after)
                except PublishError:
                    # Ephemeral previews are optional; final persistence remains required.
                    paused_until = now + 30
        run.refresh_from_db(fields=["cancelled"])
        text = output or (
            "Generation stopped." if run.cancelled else "No response was generated."
        )
        run.response = text
        run.save(update_fields=["response"])
        # Recheck revocation before sending any final output.
        if not evaluate(
            run.user, account.client, "draft_posts", account=account
        ).allowed:
            TelegramAssistantRun.objects.filter(pk=run_pk).update(
                state="denied", error_code="permission_denied"
            )
            return
        if account.telegram_config.assistant_rich:
            context = {"destination_type": "private_forum" if int(topic) else "private"}
            if int(topic):
                context["message_thread_id"] = int(topic)
            result = TelegramPublisher().publish_rich(
                account.credential,
                {"is_rtl": True, "blocks": [{"type": "paragraph", "text": text}]},
                destination_id=chat,
                destination_context=context,
            )
        else:
            result = TelegramPublisher().reply_to_dm(
                account.credential, run.conversation.platform_thread_id, text
            )
        msg = Message.objects.create(
            conversation=run.conversation,
            direction="outbound",
            content=text,
            platform_message_id=result.platform_post_id,
            sent_at=timezone.now(),
            sent_by=run.user,
        )
        Conversation.objects.filter(pk=run.conversation_id).update(
            last_message_preview=text[:500], last_message_at=msg.sent_at
        )
        TelegramAssistantRun.objects.filter(pk=run_pk).update(
            state="cancelled" if run.cancelled else "completed"
        )
    except Exception:
        TelegramAssistantRun.objects.filter(pk=run_pk).update(
            state="needs_reconciliation", response=output, error_code="assistant_failed"
        )
        logger.warning("Telegram assistant failed run=%s", run_pk)


@shared_task
def prune_telegram_updates():
    """Retain 30 days of replay receipts, with a persisted floor for older IDs."""
    from datetime import timedelta
    from .models import TelegramIntegration, TelegramCallback
    from django.db import transaction

    cutoff = timezone.now() - timedelta(days=30)
    for account_id in TelegramIntegration.objects.values_list("account_id", flat=True):
        with transaction.atomic():
            config = TelegramIntegration.objects.select_for_update().get(
                account_id=account_id
            )
            TelegramUpdate.objects.filter(
                account_id=account_id, status="pending", created_at__lt=cutoff
            ).update(status="failed", payload={}, error_code="processing_expired")
            pending = (
                TelegramUpdate.objects.filter(account_id=account_id)
                .filter(status="pending")
                .order_by("update_id")
                .first()
            )
            rows = TelegramUpdate.objects.filter(
                account_id=account_id,
                status__in=["processed", "failed"],
                created_at__lt=cutoff,
            )
            if pending:
                rows = rows.filter(update_id__lt=pending.update_id)
            last = rows.order_by("-update_id").first()
            if last:
                config.replay_floor = max(config.replay_floor, last.update_id)
                config.save(update_fields=["replay_floor"])
                rows.delete()
    TelegramCallback.objects.filter(expires_at__lt=cutoff).delete()


@shared_task
def recover_telegram_jobs():
    """Recover pending jobs after a broker interruption; never resend claimed finals."""
    from datetime import timedelta

    cutoff = timezone.now() - timedelta(minutes=1)
    from django.db.models import Q

    for pk in TelegramUpdate.objects.filter(
        Q(retry_at__isnull=True) | Q(retry_at__lte=timezone.now()),
        status="pending",
        created_at__lt=cutoff,
    ).values_list("pk", flat=True)[:1000]:
        ingest_update.delay(pk)
    for pk in TelegramAssistantRun.objects.filter(
        state="pending", created_at__lt=cutoff
    ).values_list("pk", flat=True)[:1000]:
        run_assistant.delay(pk)
    TelegramAssistantRun.objects.filter(
        state="generating", created_at__lt=timezone.now() - timedelta(minutes=30)
    ).update(state="needs_reconciliation", error_code="worker_interrupted")
