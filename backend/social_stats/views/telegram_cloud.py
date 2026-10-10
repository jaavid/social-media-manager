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


def _authorized_session(request, *, require_active=True):
    """Resolve a nonexpired bearer; reads additionally require an active account.

    Self-revocation must still work when the linked Django user is inactive,
    otherwise an old bearer could regain access after account reactivation.
    """
    authorization = request.headers.get("Authorization", "")
    match = re.fullmatch(r"Bearer ([A-Za-z0-9_-]{43})", authorization)
    if not match:
        return None
    sessions = TelegramCloudSession.objects.select_related("user").filter(
        token_hash=_digest(match.group(1)),
        expires_at__gt=timezone.now(),
    )
    if require_active:
        sessions = sessions.filter(user__is_active=True)
    return sessions.first()


def _can_review_post(user, post):
    """Same action-specific authorization guards used by Composer approval."""
    decision = evaluate(user, post.client, "approve_posts")
    if not decision.allowed:
        return False
    privileged = decision.role in ("owner", "superadmin")
    if not privileged and user.pk in (post.created_by_id, post.publish_requested_by_id):
        return False
    if not privileged and ApprovalRequest.objects.filter(
        client=post.client,
        target_object_type="UnifiedPost",
        target_object_id=post.pk,
        relation__isnull=False,
        status="pending",
    ).exists():
        return False
    return True


def _scoped_posts(user):
    """Constrain pending posts to the user's currently accessible workspaces."""
    return UnifiedPost.objects.filter(
        status="pending_approval",
        client__in=accessible_workspaces(user),
    ).select_related("client")


def _summary(post):
    """Return only fields safe for Telegram's read-only review interface."""
    return {
        "id": post.pk,
        "workspace": post.client.company,
        "title": post.title or "بدون عنوان",
        "excerpt": post.content[:220],
        "platforms": post.target_platforms or [],
    }


@api_view(["GET", "DELETE"])
@authentication_classes([])
@permission_classes([AllowAny])
def bot_session(request):
    """Introspect/revoke the *own* read-only bearer session (never mutate posts)."""
    session = _authorized_session(request, require_active=request.method != "DELETE")
    if session is None:
        return _nocache({"error": "link required or expired"}, 401)
    if request.method == "DELETE":
        session.delete()
        return _nocache({"unlinked": True})
    name = session.user.get_full_name().strip() or session.user.username
    return _nocache({
        "linked": True,
        "name": name[:120],
        "expires_at": session.expires_at.isoformat(),
    })


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def readonly_reviews(request):
    """Paginated list of posts this linked user can approve, with no write actions.

    Cursor tracks the last *examined* post ID, not necessarily a visible post.
    Always re-evaluate RBAC. Each request examines at most 100 candidates, so
    a page may be empty while next_cursor is present (only hidden posts seen).
    """
    session = _authorized_session(request)
    if session is None:
        return _nocache({"error": "link required or expired"}, 401)
    before = request.query_params.get("before")
    if before is not None and (
        not re.fullmatch(r"[1-9][0-9]{0,18}", before) or int(before) >= 2**63
    ):
        return _nocache({"error": "invalid cursor"}, 400)
    qs = _scoped_posts(session.user)
    if before is not None:
        qs = qs.filter(pk__lt=int(before))
    # Authorization can issue several DB queries per post. Bound BOTH the
    # candidate queryset and the number of per-post policy evaluations.
    # A page may have zero visible rows with a cursor when a batch contains
    # only ineligible posts; the next request continues past the last scanned
    # post without skipping any candidate.
    page_size = 5
    scan_limit = 100
    candidates = list(qs.order_by("-pk")[:scan_limit + 1])
    rows = []
    last_scanned_id = None
    scanned = 0
    for post in candidates[:scan_limit]:
        last_scanned_id = post.pk
        scanned += 1
        if _can_review_post(session.user, post):
            rows.append(_summary(post))
            if len(rows) == page_size:
                break

    return _nocache({
        "count": len(rows),
        "rows": rows,
        "next_cursor": str(last_scanned_id) if len(candidates) > scanned else None,
    })


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def readonly_review_detail(request, post_id):
    """A fresh, independently authorized read of one pending post."""
    session = _authorized_session(request)
    if session is None:
        return _nocache({"error": "link required or expired"}, 401)
    post = _scoped_posts(session.user).filter(pk=post_id).first()
    if post is None or not _can_review_post(session.user, post):
        return _nocache({"error": "post unavailable"}, 404)
    data = _summary(post)
    # Bound Telegram message length and avoid returning private media URLs
    # or platform-specific overrides/credentials.
    data.update({
        "content": post.content[:3000],
        "media_type": post.media_type,
        "scheduled_at": post.scheduled_at.isoformat() if post.scheduled_at else None,
    })
    return _nocache(data)
