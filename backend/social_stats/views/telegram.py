"""Account-scoped Telegram setup, webhook ingestion and editorial proposals."""

import secrets
import re
import json
import time

from django.http import HttpResponse
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import F
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, viewsets
from rest_framework.decorators import (
    action,
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from social_stats.models import (
    SocialAccount,
    TelegramIntegration,
    TelegramUpdate,
    TelegramSuggestion,
    TelegramAssistantLink,
    UnifiedPost,
    PlatformCredential,
)
from social_stats.authorization import accessible_workspaces, evaluate
from social_stats.publishers.base import PublishError
from social_stats.platforms.bot_features import BotDestinationContext
from social_stats.telegram_service import bot_client
from social_stats.audit import log_action


def require(user, account, action):
    if not evaluate(user, account.client, action, account=account).allowed:
        raise PermissionDenied("Permission denied for this Telegram account")


class TelegramAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = SocialAccount
        fields = ("id", "client", "display_name", "external_id")


class TelegramAccountViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TelegramAccountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = SocialAccount.objects.filter(
            platform="telegram",
            client__in=accessible_workspaces(self.request.user),
            is_active=True,
        )
        return qs.filter(
            pk__in=[
                a.pk
                for a in qs
                if evaluate(
                    self.request.user, a.client, "view_posts", account=a
                ).allowed
            ]
        )

    @action(detail=True, methods=["get", "post"], url_path="settings")
    def configuration(self, request, pk=None):
        account = self.get_object()
        require(request.user, account, "manage_bots")
        config, _ = TelegramIntegration.objects.get_or_create(account=account)
        if request.method == "POST":
            allowed = {
                "destination_context",
                "assistant_enabled",
                "rich_enabled",
                "assistant_rich",
            }
            if set(request.data) - allowed:
                raise ValidationError("Unknown Telegram settings")
            if "destination_context" in request.data:
                try:
                    context = BotDestinationContext.from_dict(
                        request.data["destination_context"]
                    )
                    context.validated_options("telegram")
                    chat = bot_client(account).get_chat(
                        account.credential.platform_user_id
                    )
                    # Verify actual destination kind. Private threaded mode is explicit BotFather setup.
                    actual = (
                        "forum_supergroup"
                        if chat.get("is_forum") and chat.get("type") == "supergroup"
                        else chat.get("type")
                    )
                    allowed_kinds = {actual}
                    if actual == "private":
                        allowed_kinds.add("private_forum")
                    if chat.get("is_direct_messages"):
                        allowed_kinds = {"channel_direct_messages"}
                    if context.destination_type not in allowed_kinds:
                        raise ValidationError(
                            "Destination type does not match the Telegram chat"
                        )
                    config.destination_context = request.data["destination_context"]
                except PublishError as exc:
                    raise ValidationError(str(exc)) from None
            for key in ("assistant_enabled", "rich_enabled", "assistant_rich"):
                if key in request.data:
                    if type(request.data[key]) is not bool:
                        raise ValidationError(f"{key} must be boolean")
                    setattr(config, key, request.data[key])
            config.save()
            log_action(
                request.user,
                account.client,
                "telegram.settings",
                object_type="SocialAccount",
                object_id=account.pk,
            )
        return Response(
            {
                "destination_context": config.destination_context,
                "assistant_enabled": config.assistant_enabled,
                "assistant_rich": config.assistant_rich,
                "rich_enabled": config.rich_enabled,
                "webhook_enabled": config.webhook_enabled,
                "webhook_managed": account.credential.auth_method == "managed_bot",
                "last_update_at": config.last_update_at,
            }
        )

    @action(detail=True, methods=["post"])
    def webhook(self, request, pk=None):
        account = self.get_object()
        require(request.user, account, "manage_bots")
        if account.credential.auth_method == 'managed_bot':
            raise ValidationError('Project bot webhooks are managed centrally')
        url = request.build_absolute_uri(f"/api/webhooks/telegram/{account.pk}/")
        if not url.startswith("https://"):
            raise ValidationError("Webhook requires a public HTTPS application URL")
        # Telegram gives one webhook to a bot. Sharing that identity between
        # independent workspaces would let one setup steal another's updates.
        for credential in PlatformCredential.objects.filter(
            platform="telegram", is_active=True
        ).exclude(client=account.client):
            if credential.access_token == account.credential.access_token:
                raise ValidationError("Use a separate Telegram bot for each workspace")
        config, _ = TelegramIntegration.objects.get_or_create(account=account)
        secret = secrets.token_urlsafe(32)
        # Save receiving secret first; on remote ambiguity operators can reconcile safely.
        config.webhook_secret = secret
        config.webhook_enabled = True
        config.save(update_fields=["webhook_secret", "webhook_enabled"])
        try:
            bot_client(account).call(
                "setWebhook",
                data={
                    "url": url,
                    "secret_token": secret,
                    "allowed_updates": '["message","edited_message","callback_query","stopped_message_generation"]',
                },
            )
        except PublishError as exc:
            config.webhook_enabled = False
            config.save(update_fields=["webhook_enabled"])
            return Response({"detail": str(exc), "code": exc.code}, status=400)
        log_action(
            request.user,
            account.client,
            "telegram.webhook",
            object_type="SocialAccount",
            object_id=account.pk,
        )
        return Response({"enabled": True, "url": url})

    @action(detail=True, methods=["post"], url_path="assistant-link")
    def assistant_link(self, request, pk=None):
        account = self.get_object()
        require(request.user, account, "manage_bots")
        uid = request.data.get("telegram_user_id")
        if type(uid) is not int or uid <= 0:
            raise ValidationError("telegram_user_id must be a positive integer")
        user = get_object_or_404(User, pk=request.data.get("user_id"), is_active=True)
        require(user, account, "draft_posts")
        TelegramAssistantLink.objects.update_or_create(
            account=account,
            telegram_user_id=uid,
            defaults={"user": user, "created_by": request.user},
        )
        log_action(
            request.user,
            account.client,
            "telegram.assistant_link",
            object_type="SocialAccount",
            object_id=account.pk,
            details={"user_id": user.pk},
        )
        return Response({"linked": True})


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def telegram_webhook(request, account_id):
    config = get_object_or_404(
        TelegramIntegration,
        account_id=account_id,
        webhook_enabled=True,
        account__is_active=True,
        account__credential__is_active=True,
    )
    supplied = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
    if not config.webhook_secret or not secrets.compare_digest(
        supplied, config.webhook_secret
    ):
        return Response({"detail": "Invalid webhook credentials"}, status=403)
    payload = request.data
    if (
        not isinstance(payload, dict)
        or type(payload.get("update_id")) is not int
        or payload["update_id"] < 0
    ):
        return Response({"detail": "Invalid update_id"}, status=400)
    if len(json.dumps(payload).encode()) > 1024 * 1024:
        return Response({"detail": "Update too large"}, status=413)
    with transaction.atomic():
        config = TelegramIntegration.objects.select_for_update().get(pk=config.pk)
        # Telegram resets update IDs after a week of silence.
        if (
            config.last_update_at
            and config.last_update_at < timezone.now() - timezone.timedelta(days=7)
        ):
            config.replay_floor = -1
            config.save(update_fields=["replay_floor"])
        if payload["update_id"] <= config.replay_floor:
            return Response({"ok": True})
        update, created = TelegramUpdate.objects.get_or_create(
            account=config.account,
            update_id=payload["update_id"],
            defaults={"payload": payload},
        )
        if update.status == "pending":
            from social_stats.telegram_tasks import ingest_update

            transaction.on_commit(lambda: ingest_update.delay(update.pk))
    return Response({"ok": True})


class TelegramSuggestionSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(
        source="conversation.contact_name", read_only=True
    )
    account_name = serializers.CharField(source="account.display_name", read_only=True)

    class Meta:
        model = TelegramSuggestion
        fields = (
            "id",
            "client",
            "account",
            "account_name",
            "sender_name",
            "conversation",
            "message_id",
            "content",
            "media",
            "proposal",
            "provider_state",
            "state",
            "draft",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class TelegramSuggestionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TelegramSuggestionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = TelegramSuggestion.objects.filter(
            client__in=accessible_workspaces(self.request.user),
            account__client_id=F('client_id'),
        ).select_related("account__client", "conversation")
        if self.request.query_params.get("account"):
            qs = qs.filter(account_id=self.request.query_params["account"])
        accounts = SocialAccount.objects.filter(
            pk__in=qs.values('account_id')
        ).select_related('client')
        return qs.filter(
            account_id__in=[
                account.pk
                for account in accounts
                if evaluate(
                    self.request.user, account.client, "view_inbox", account=account
                ).allowed
            ]
        ).order_by("-created_at")

    @action(detail=True, methods=["get"])
    def media(self, request, pk=None):
        suggestion = self.get_object()
        kind = request.query_params.get("kind")
        if kind not in ("photo", "video", "document"):
            raise ValidationError("Unsupported preview type")
        item = suggestion.media.get(kind)
        if kind == "photo" and isinstance(item, list):
            item = item[-1] if item else None
        if not isinstance(item, dict) or not item.get("file_id"):
            raise ValidationError("Media is unavailable")
        from social_stats.egress import outbound_request

        try:
            client = bot_client(suggestion.account)
            result = (
                client.call("getFile", data={"file_id": item["file_id"]}).get("result")
                or {}
            )
            path = result.get("file_path", "")
            if (
                not isinstance(path, str)
                or not re.fullmatch(r"[A-Za-z0-9_./-]+", path)
                or ".." in path
                or path.startswith("/")
            ):
                raise PublishError(
                    "Invalid Telegram file path", code="invalid_response"
                )
            if result.get("file_size", 0) > 20 * 1024 * 1024:
                raise PublishError(
                    "Media exceeds the 20 MB preview limit", code="media_invalid"
                )
            upstream = outbound_request(
                "telegram",
                "GET",
                f"{client.base_url}/file/bot{client.token}/{path}",
                gateway_path=f"/file/{path}",
                gateway_headers={"X-Upstream-Bot-Token": client.token},
                timeout=30,
                stream=True,
                allow_redirects=False,
            )
            try:
                if upstream.status_code != 200:
                    raise PublishError(
                        "Telegram media preview unavailable; check file egress routing",
                        code="media_unavailable",
                    )
                chunks, size = [], 0
                for chunk in upstream.iter_content(chunk_size=65536):
                    size += len(chunk)
                    if size > 20 * 1024 * 1024:
                        raise PublishError(
                            "Media exceeds the 20 MB preview limit",
                            code="media_invalid",
                        )
                    chunks.append(chunk)
            finally:
                upstream.close()
        except Exception:
            # Provider URL contains a secret; never chain or expose exceptions.
            return Response(
                {"detail": "Telegram media preview unavailable"}, status=502
            )
        mime = {
            "photo": "image/jpeg",
            "video": "video/mp4",
            "document": "application/octet-stream",
        }[kind]
        response = HttpResponse(b"".join(chunks), content_type=mime)
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        if kind == "document":
            response["Content-Disposition"] = 'attachment; filename="telegram-document"'
        return response

    @action(detail=True, methods=["post"])
    def decide(self, request, pk=None):
        suggestion = self.get_object()
        decision = request.data.get("decision")
        if decision not in ("under_review", "accept_as_draft", "approve", "decline"):
            raise ValidationError("Unknown suggestion decision")
        from social_stats.marketplace_permissions import (
            check_action,
            deny_response,
            approval_pending_response,
        )

        require(
            request.user,
            suggestion.account,
            "publish_posts" if decision == "approve" else "draft_posts",
        )
        verdict, ctx = check_action(
            request,
            suggestion.client,
            "publish_posts" if decision == "approve" else "draft_posts",
            action_type="telegram_suggestion",
            payload={
                "suggestion_id": suggestion.pk,
                "decision": decision,
                "social_account_id": suggestion.account_id,
                "send_date": request.data.get("send_date"),
                "comment": request.data.get("comment", ""),
            },
            target_object_type="TelegramSuggestion",
            target_object_id=suggestion.pk,
        )
        if verdict == "denied":
            return deny_response(ctx["reason"])
        if verdict == "approval_required":
            return approval_pending_response(ctx["approval"])
        return apply_suggestion_decision(suggestion, decision, request)


def apply_suggestion_decision(suggestion, decision, request):
    with transaction.atomic():
        suggestion = TelegramSuggestion.objects.select_for_update().get(
            pk=suggestion.pk
        )
        if (
            suggestion.state not in ("received", "under_review")
            or suggestion.provider_state != "pending"
        ):
            return Response(
                {"detail": "Suggestion already handled or stale"}, status=409
            )
        if decision == "approve" and suggestion.proposal.get("price"):
            return Response(
                {
                    "detail": "Paid suggestions require a financial decision in Telegram; approval is disabled here"
                },
                status=400,
            )
        if decision in ("approve", "decline"):
            data = {
                "chat_id": int(
                    suggestion.conversation.platform_thread_id.split(":")[1]
                ),
                "message_id": suggestion.message_id,
            }
            if decision == "approve" and "send_date" in request.data:
                n = request.data["send_date"]
                if (
                    type(n) is not int
                    or not int(time.time()) <= n <= int(time.time()) + 2678400
                ):
                    raise ValidationError("Send date must be within the next 30 days")
                data["send_date"] = n
            if decision == "decline":
                comment = request.data.get("comment", "")
                if not isinstance(comment, str) or len(comment) > 128:
                    raise ValidationError(
                        "Decline comment must be at most 128 characters"
                    )
                data["comment"] = comment
            try:
                bot_client(suggestion.account).call(
                    "approveSuggestedPost"
                    if decision == "approve"
                    else "declineSuggestedPost",
                    data=data,
                )
            except PublishError as exc:
                if exc.code in ("timeout", "network_error", "invalid_response"):
                    suggestion.state = "needs_reconciliation"
                    suggestion.save(update_fields=["state"])
                return Response({"detail": str(exc), "code": exc.code}, status=400)
            suggestion.provider_state = (
                "approved" if decision == "approve" else "declined"
            )
            suggestion.state = suggestion.provider_state
        elif decision == "accept_as_draft":
            media_urls, kind = [], "text"
            photo = suggestion.media.get("photo")
            if isinstance(photo, list) and photo:
                media_urls, kind = [photo[-1]["file_id"]], "image"
            elif suggestion.media.get("video"):
                media_urls, kind = [suggestion.media["video"]["file_id"]], "video"
            suggestion.draft = UnifiedPost.objects.create(
                client=suggestion.client,
                content=suggestion.content,
                media_urls=media_urls,
                media_type=kind,
                target_platforms=["telegram"],
                platform_overrides={
                    "telegram": {
                        "social_account_id": suggestion.account_id,
                        "source_suggestion_id": suggestion.pk,
                        "source_media": suggestion.media,
                    }
                },
                created_by=request.user,
            )
            suggestion.state = "accepted_as_draft"
        else:
            suggestion.state = "under_review"
        suggestion.decided_by = request.user
        suggestion.save()
        log_action(
            request.user,
            suggestion.client,
            "telegram.suggestion." + decision,
            object_type="TelegramSuggestion",
            object_id=suggestion.pk,
        )
    return Response(TelegramSuggestionSerializer(suggestion).data)
