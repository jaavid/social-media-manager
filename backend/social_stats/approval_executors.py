# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""
When an end-user approves an ApprovalRequest, the original action
needs to actually run. This module is the dispatch layer.

A handler takes the approval (which carries `payload`, `target_object_type`,
`target_object_id`, plus `edited_payload` if the user tweaked the post body
before approving) and performs the action. It returns
`(success: bool, message: str, result: dict)` — the caller writes that to
ApprovalRequest.execution_result and updates status.

NEW action_types must register a handler here. Until they do, approving
returns `success=False, message='no executor for action_type=<x>'` so the
approval is recorded as approved-but-not-executed and the agency can be told
to re-run from their UI.
"""
from __future__ import annotations

import logging
from typing import Callable

from django.utils import timezone

from .models import (
    Conversation, Message, PlatformCredential,
    UnifiedPost, WhatsAppCampaign,
)


logger = logging.getLogger(__name__)


def _payload(approval) -> dict:
    """Return effective payload — edited_payload overrides the original
    proposal key-by-key."""
    base = dict(approval.payload or {})
    base.update(approval.edited_payload or {})
    return base


# ─────────────────────────────────────────────────────────────────────────────
# publish_post
# ─────────────────────────────────────────────────────────────────────────────
def _exec_publish_post(approval) -> tuple[bool, str, dict]:
    from .orchestrator import publish_unified_post

    payload = _payload(approval)
    post_id = payload.get('post_id') or approval.target_object_id
    try:
        post = UnifiedPost.objects.get(pk=post_id, client=approval.client)
    except UnifiedPost.DoesNotExist:
        return (False, 'post no longer exists', {})

    if payload.get('revision') and payload['revision'] != post.updated_at.isoformat():
        return False, 'post changed since review was requested', {}

    # If the user edited the body before approving, persist that
    body = payload.get('body') or payload.get('content')
    if body and body != post.content:
        post.content = body
        # Validate the reviewed content before changing the stored post.


    if post.status not in ('draft', 'scheduled', 'failed', 'partial', 'pending_approval'):
        return (False, f'post is in status {post.status}; cannot publish', {'post_id': post.id})

    from .publishing_contract import validate_intent, post_payload
    validate_intent(post_payload(post), post.client, approval.requested_by, action='publish_posts', ready=True)
    post.publish_action = 'publish_posts'
    post.publish_requested_by = approval.requested_by
    post.approved_by = approval.decided_by
    post.approved_at = timezone.now()
    post.status = 'queued'
    post.scheduled_at = timezone.now()
    post.save(update_fields=['content', 'status', 'scheduled_at', 'approved_by', 'approved_at', 'publish_requested_by', 'publish_action'])
    publish_unified_post.delay(post.id)
    return (True, 'queued for publishing', {'post_id': post.id})


# ─────────────────────────────────────────────────────────────────────────────
# send_campaign
# ─────────────────────────────────────────────────────────────────────────────
def _exec_send_campaign(approval) -> tuple[bool, str, dict]:
    from .whatsapp_tasks import run_whatsapp_campaign

    payload = _payload(approval)
    campaign_id = payload.get('campaign_id') or approval.target_object_id
    try:
        campaign = WhatsAppCampaign.objects.get(pk=campaign_id, client=approval.client)
    except WhatsAppCampaign.DoesNotExist:
        return (False, 'campaign no longer exists', {})
    if campaign.status not in ('draft', 'scheduled'):
        return (False, f'campaign is in status {campaign.status}', {'campaign_id': campaign.id})

    campaign.status = 'scheduled'
    campaign.scheduled_at = campaign.scheduled_at or timezone.now()
    campaign.save(update_fields=['status', 'scheduled_at'])
    run_whatsapp_campaign.delay(campaign.id)
    return (True, 'campaign queued', {'campaign_id': campaign.id})


# ─────────────────────────────────────────────────────────────────────────────
# Replies (DM / comment / review)
# ─────────────────────────────────────────────────────────────────────────────
def _exec_reply(approval) -> tuple[bool, str, dict]:
    from .publishers import (
        get_publisher, PublishError, TokenExpiredError, RateLimitError,
    )

    payload = _payload(approval)
    conv_id = payload.get('conversation_id')
    text = (payload.get('text') or '').strip()
    if not conv_id or not text:
        return (False, 'missing conversation_id or text', {})

    try:
        conv = Conversation.objects.get(pk=conv_id, client=approval.client)
    except Conversation.DoesNotExist:
        return (False, 'conversation no longer exists', {})

    cred = PlatformCredential.objects.filter(
        client_id=conv.client_id, platform=conv.platform, social_account_id=conv.social_account_id, is_active=True,
    ).first()
    if not cred:
        return (False, f'no active {conv.platform} credential', {})

    publisher = get_publisher(conv.platform)
    last_inbound = (Message.objects
                    .filter(conversation=conv, direction='inbound')
                    .order_by('-created_at').first())

    try:
        if conv.type == 'comment':
            if not last_inbound or not last_inbound.platform_message_id:
                return (False, 'no inbound comment to reply to', {})
            result = publisher.reply_to_comment(cred, last_inbound.platform_message_id, text)
        elif conv.type == 'dm':
            psid = (last_inbound.author_handle if last_inbound else conv.contact_handle)
            if not psid:
                return (False, 'no recipient ID on this thread', {})
            result = publisher.reply_to_dm(cred, conv.platform_thread_id, text, psid=psid, recipient_id=psid)
        elif conv.type == 'review':
            if not last_inbound or not last_inbound.platform_message_id:
                return (False, 'no review to reply to', {})
            result = publisher.reply_to_review(cred, last_inbound.platform_message_id, text)
        else:
            return (False, f'reply not supported for type={conv.type}', {})
    except TokenExpiredError as e:
        cred.mark_auth_failure('token_expired')
        return (False, str(e), {'code': 'token_expired'})
    except RateLimitError as e:
        return (False, str(e), {'code': 'rate_limited'})
    except PublishError as e:
        return (False, str(e), {'code': e.code or 'publish_error'})

    msg = Message.objects.create(
        conversation=conv,
        platform_message_id=getattr(result, 'platform_post_id', '') or '',
        direction='outbound',
        author_name=approval.requested_by.get_full_name() or approval.requested_by.email or 'Social Stats',
        author_handle=approval.requested_by.email or '',
        content=text,
        sent_at=timezone.now(),
        replied_at=timezone.now(),
        sentiment=last_inbound.sentiment if last_inbound else 'unknown',
        sent_by=approval.requested_by,
    )
    conv.last_message_preview = text[:500]
    conv.last_message_at = msg.sent_at
    conv.save(update_fields=['last_message_preview', 'last_message_at'])

    return (True, f'replied via {conv.platform}', {'message_id': msg.id, 'conversation_id': conv.id})


# ─────────────────────────────────────────────────────────────────────────────
# disconnect_platform
# ─────────────────────────────────────────────────────────────────────────────
def _exec_disconnect_platform(approval) -> tuple[bool, str, dict]:
    payload = _payload(approval)
    platform = payload.get('platform')
    if not platform:
        return (False, 'no platform in payload', {})
    credentials = PlatformCredential.objects.filter(client=approval.client, platform=platform)
    if payload.get('social_account_id'):
        credentials = credentials.filter(social_account_id=payload['social_account_id'])
    credentials.update(access_token='', refresh_token='', is_active=False)
    return (True, f'{platform} disconnected', {'platform': platform})


# ─────────────────────────────────────────────────────────────────────────────
def _exec_draft_post(approval) -> tuple[bool, str, dict]:
    """draft_post — agency wanted to create a new draft, owner approved.

    payload contract (best-effort):
      content: str — body
      target_platforms: list[str]
      title: str (optional)
      media_urls: list[str] (optional)
      platform_overrides: dict (optional)
    """
    payload = _payload(approval)
    content = payload.get('content') or payload.get('body') or ''
    if not content and not payload.get('media_urls') and payload.get('media_type') not in ('album', 'rich', 'poll'):
        return (False, 'no content or media in payload — cannot create draft', {})

    from .publishing_contract import validate_intent
    validate_intent(payload, approval.client, approval.requested_by)
    post = UnifiedPost.objects.create(
        client=approval.client,
        created_by=approval.requested_by,
        intent_key=payload.get('intent_key'),
        title=(payload.get('title') or '')[:200],
        content=content,
        target_platforms=list(payload.get('target_platforms') or []),
        media_urls=list(payload.get('media_urls') or []),
        media_type=payload.get('media_type') or 'text',
        platform_overrides=dict(payload.get('platform_overrides') or {}),
        status='draft',
    )
    return (True, 'draft created', {'post_id': post.id})


def _exec_delete_post(approval) -> tuple[bool, str, dict]:
    """delete_post — agency requested deletion of an existing post."""
    payload = _payload(approval)
    post_id = payload.get('post_id') or approval.target_object_id
    if not post_id:
        return (False, 'no post_id in payload', {})

    target_type = approval.target_object_type or 'UnifiedPost'
    if target_type == 'CalendarPost':
        from .models import CalendarPost
        try:
            post = CalendarPost.objects.get(pk=post_id, client=approval.client)
        except CalendarPost.DoesNotExist:
            return (False, 'calendar post no longer exists', {'post_id': post_id})
        if getattr(post, 'status', None) == 'published':
            return (False, 'cannot delete a published post', {'post_id': post.id})
        post.delete()
        return (True, 'calendar post deleted', {'post_id': post_id})

    try:
        post = UnifiedPost.objects.get(pk=post_id, client=approval.client)
    except UnifiedPost.DoesNotExist:
        return (False, 'post no longer exists', {'post_id': post_id})
    post.delete()
    return (True, 'post deleted', {'post_id': post_id})


def _exec_publish_bot(approval) -> tuple[bool, str, dict]:
    """publish_bot — agency wanted to activate a bot flow on the workspace."""
    from social_stats.models.bot import BotFlow
    payload = _payload(approval)
    flow_id = payload.get('flow_id') or approval.target_object_id
    if not flow_id:
        return (False, 'no flow_id in payload', {})
    try:
        flow = BotFlow.objects.get(pk=flow_id, client=approval.client)
    except BotFlow.DoesNotExist:
        return (False, 'bot flow no longer exists', {'flow_id': flow_id})
    flow.is_active = True
    flow.published_version = flow.version
    flow.last_published_at = timezone.now()
    flow.save(update_fields=['is_active', 'published_version', 'last_published_at'])
    return (True, 'bot flow published', {'flow_id': flow.id})


def _exec_unpublish_bot(approval) -> tuple[bool, str, dict]:
    """unpublish_bot — agency wanted to deactivate a live bot flow."""
    from social_stats.models.bot import BotFlow
    payload = _payload(approval)
    flow_id = payload.get('flow_id') or approval.target_object_id
    if not flow_id:
        return (False, 'no flow_id in payload', {})
    try:
        flow = BotFlow.objects.get(pk=flow_id, client=approval.client)
    except BotFlow.DoesNotExist:
        return (False, 'bot flow no longer exists', {'flow_id': flow_id})
    flow.is_active = False
    flow.save(update_fields=['is_active'])
    return (True, 'bot flow unpublished', {'flow_id': flow.id})


def _exec_edit_post(approval):
    payload = _payload(approval)
    post = UnifiedPost.objects.filter(pk=payload.get('post_id'), client=approval.client).first()
    if not post:
        return False, 'post no longer exists', {}
    from social_stats.serializers.composer import UnifiedPostSerializer
    serializer = UnifiedPostSerializer(post, data=payload, partial=True)
    serializer.is_valid(raise_exception=True)
    from .publishing_contract import validate_intent, post_payload
    validate_intent({**post_payload(post), **serializer.validated_data}, post.client, approval.requested_by, action='draft_posts')
    extra = {'approved_by': None, 'approved_at': None, 'publish_requested_by': None}
    if post.status in ('scheduled', 'queued', 'pending_approval'):
        extra['status'] = 'draft'
    serializer.save(**extra)
    return True, 'post edited', {'post_id': post.pk}


def _exec_schedule_post(approval):
    from django.utils.dateparse import parse_datetime
    payload = _payload(approval)
    post = UnifiedPost.objects.filter(pk=payload.get('post_id'), client=approval.client).first()
    when = parse_datetime(payload.get('scheduled_at', ''))
    if not post or not when or timezone.is_naive(when) or when <= timezone.now():
        return False, 'post missing or schedule is no longer in the future', {}
    if payload.get('revision') and payload['revision'] != post.updated_at.isoformat():
        return False, 'post changed since review was requested', {}
    from .publishing_contract import validate_intent, post_payload
    validate_intent(post_payload(post), post.client, approval.requested_by, action='schedule_posts', ready=True)
    post.status = 'scheduled'
    post.scheduled_at = when
    post.publish_action = 'schedule_posts'
    post.publish_requested_by = approval.requested_by
    post.approved_by = approval.decided_by
    post.approved_at = timezone.now()
    post.save(update_fields=['status', 'scheduled_at', 'approved_by', 'approved_at', 'publish_requested_by', 'publish_action'])
    return True, 'scheduled', {'post_id': post.pk}


def _exec_telegram_suggestion(approval):
    from types import SimpleNamespace
    from .models import TelegramSuggestion
    from social_stats.views.telegram import apply_suggestion_decision
    from .authorization import evaluate
    payload = _payload(approval)
    suggestion = TelegramSuggestion.objects.filter(pk=payload.get('suggestion_id'), client=approval.client).first()
    if not suggestion:
        return False, 'suggestion no longer exists', {}
    decision = payload.get('decision')
    if decision not in ('under_review', 'accept_as_draft', 'approve', 'decline'):
        return False, 'invalid suggestion decision', {}
    permission = 'publish_posts' if decision == 'approve' else 'draft_posts'
    if not evaluate(approval.requested_by, approval.client, permission, account=suggestion.account).allowed:
        return False, 'permission revoked for Telegram account', {}
    # The existing approval dispatcher verified the approving actor. Execute
    # the recorded action without recursively creating another approval.
    data = {key: value for key, value in payload.items() if value is not None}
    response = apply_suggestion_decision(suggestion, decision, SimpleNamespace(user=approval.decided_by, data=data))
    return response.status_code < 400, 'Telegram suggestion decision', dict(response.data)


# ─────────────────────────────────────────────────────────────────────────────
# Dispatch table
# ─────────────────────────────────────────────────────────────────────────────
EXECUTORS: dict[str, Callable] = {
    'telegram_suggestion': _exec_telegram_suggestion,
    'publish_post':        _exec_publish_post,
    'schedule_post':       _exec_schedule_post,
    'edit_post':           _exec_edit_post,
    'send_campaign':       _exec_send_campaign,
    'reply_comment':       _exec_reply,
    'reply_dm':            _exec_reply,
    'reply_review':        _exec_reply,
    'disconnect_platform': _exec_disconnect_platform,
    'draft_post':          _exec_draft_post,
    'delete_post':         _exec_delete_post,
    'publish_bot':         _exec_publish_bot,
    'unpublish_bot':       _exec_unpublish_bot,
}


def execute_approval(approval) -> tuple[bool, str, dict]:
    """Dispatch by action_type. Failures are recoverable — the approval is
    still marked approved, but execution_result records the error and the
    UI shows it so the agency can resubmit / fix the underlying issue."""
    from .authorization import evaluate
    from .models import SocialAccount
    payload = _payload(approval)
    action = (approval.payload or {}).get('_permission_action')
    if action:
        account = None
        if payload.get('social_account_id'):
            account = SocialAccount.objects.filter(pk=payload['social_account_id'], client=approval.client).first()
            if account is None:
                return False, 'account is outside this workspace', {}
        decision = evaluate(approval.requested_by, approval.client, action, account=account)
        if not decision.allowed:
            return False, decision.reason, {}
        post_id = payload.get('post_id')
        if post_id and approval.target_object_type == 'UnifiedPost':
            from .authorization import post_decision
            post = UnifiedPost.objects.filter(pk=post_id, client=approval.client).first()
            if not post:
                return False, 'post is outside this workspace', {}
            decision = post_decision(post, approval.requested_by, action)
            if not decision.allowed:
                return False, decision.reason, {}
    handler = EXECUTORS.get(approval.action_type)
    if not handler:
        return (False, f'no executor for action_type={approval.action_type}', {})
    try:
        return handler(approval)
    except Exception as e:  # noqa: BLE001
        if approval.action_type in {'draft_post', 'edit_post', 'publish_post', 'schedule_post'}:
            logger.error('composer approval execution rejected action_type=%s', approval.action_type)
            return False, 'Composer approval execution rejected; review the intent and current permissions', {}
        logger.exception('approval executor crashed for action_type=%s', approval.action_type)
        return (False, f'executor error: {e}', {})
