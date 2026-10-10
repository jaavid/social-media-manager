"""Telegram Cloud device linking and strictly read-only approval queue.

The one-time code is a 192-bit bearer challenge initiated by a Django-authenticated
user. No bot-wide secret is deployed to Telegram Cloud. Never use these session
tokens to authorize publishing, approval, or any other mutation.
"""
import hashlib
import re
import secrets
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from social_stats.authorization import accessible_workspaces, evaluate
from social_stats.models import ApprovalRequest, UnifiedPost
from social_stats.models.telegram_cloud import TelegramCloudLinkCode, TelegramCloudSession


def _digest(value):
    return hashlib.sha256(value.encode("ascii")).hexdigest()


def _nocache(data, status=200):
    response = Response(data, status=status)
    response["Cache-Control"] = "no-store"
    return response


@api_view(["GET", "POST", "DELETE"])
@permission_classes([IsAuthenticated])
def link_code(request):
    """Browser-authenticated link setup, state lookup, and revocation."""
    if not request.user.is_active:
        return _nocache({"error": "inactive account"}, 403)
    if request.method == "GET":
        link = TelegramCloudSession.objects.filter(user=request.user).first()
        return _nocache({
            "linked": bool(link and link.expires_at > timezone.now()),
            "telegram_user_id": link.telegram_user_id if link and link.expires_at > timezone.now() else None,
            "expires_at": link.expires_at.isoformat() if link and link.expires_at > timezone.now() else None,
        })
    if request.method == "DELETE":
        TelegramCloudLinkCode.objects.filter(user=request.user).delete()
        TelegramCloudSession.objects.filter(user=request.user).delete()
        return _nocache({"linked": False})
    code = secrets.token_urlsafe(24)
    expires_at = timezone.now() + timedelta(minutes=10)
    TelegramCloudLinkCode.objects.update_or_create(
        user=request.user,
        defaults={"code_hash": _digest(code), "expires_at": expires_at},
    )
    return _nocache({"code": code, "expires_at": expires_at.isoformat()}, 201)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def claim_link(request):
    """Exchange a single-use challenge for a per-user read-only bearer token."""
    code = request.data.get("code")
    telegram_id = request.data.get("telegram_user_id")
    if not isinstance(code, str) or not re.fullmatch(r"[A-Za-z0-9_-]{32}", code):
        return _nocache({"error": "invalid or expired code"}, 400)
    if type(telegram_id) is not int or not (0 < telegram_id < 2**63):
        return _nocache({"error": "invalid Telegram identity"}, 400)

    with transaction.atomic():
        challenge = TelegramCloudLinkCode.objects.select_for_update().select_related("user").filter(
            code_hash=_digest(code),
        ).first()
        if not challenge or challenge.expires_at <= timezone.now() or not challenge.user.is_active:
            return _nocache({"error": "invalid or expired code"}, 400)
        # A Telegram identity may not be silently reassigned between accounts.
        if TelegramCloudSession.objects.filter(telegram_user_id=telegram_id).exclude(user=challenge.user).exists():
            return _nocache({"error": "Telegram identity is already linked"}, 409)
        token = secrets.token_urlsafe(32)
        expiry = timezone.now() + timedelta(days=30)
        TelegramCloudSession.objects.filter(user=challenge.user).delete()
        TelegramCloudSession.objects.create(
            user=challenge.user,
            telegram_user_id=telegram_id,
            token_hash=_digest(token),
            expires_at=expiry,
        )
        challenge.delete()
    return _nocache({"token": token, "expires_at": expiry.isoformat()}, 201)


def _authorized_user(request):
    authorization = request.headers.get("Authorization", "")
    match = re.fullmatch(r"Bearer ([A-Za-z0-9_-]{43})", authorization)
    if not match:
        return None
    session = TelegramCloudSession.objects.select_related("user").filter(
        token_hash=_digest(match.group(1)),
        expires_at__gt=timezone.now(),
        user__is_active=True,
    ).first()
    return session.user if session else None


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def readonly_reviews(request):
    """Return only posts the linked user can *currently* approve, without actions."""
    user = _authorized_user(request)
    if user is None:
        return _nocache({"error": "link required or expired"}, 401)

    rows = []
    qs = UnifiedPost.objects.filter(
        status="pending_approval",
        client__in=accessible_workspaces(user),
    ).select_related("client").order_by("-created_at")[:200]
    for post in qs:
        decision = evaluate(user, post.client, "approve_posts")
        if not decision.allowed:
            continue
        privileged = decision.role in ("owner", "superadmin")
        if not privileged and user.pk in (post.created_by_id, post.publish_requested_by_id):
            continue
        if not privileged and ApprovalRequest.objects.filter(
            client=post.client,
            target_object_type="UnifiedPost",
            target_object_id=post.pk,
            relation__isnull=False,
            status="pending",
        ).exists():
            continue
        rows.append({
            "id": post.pk,
            "workspace": post.client.company,
            "title": post.title or "بدون عنوان",
            "excerpt": post.content[:220],
            "platforms": post.target_platforms or [],
        })
        if len(rows) == 10:
            break
    return _nocache({"count": len(rows), "rows": rows})
