# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""
Unified publishing orchestrator.

Two Celery tasks:
  - publish_unified_post(unified_post_id):
      Fan-out task: looks at the UnifiedPost's target_platforms, creates one
      PlatformPublishLog per platform, and dispatches publish_to_platform
      for each. Sets the parent post status to 'publishing'.

  - publish_to_platform(unified_post_id, platform):
      Per-platform task. Picks the right publisher method based on
      media_type, applies platform_overrides, persists the result on the
      log row, handles typed exceptions (token expired → deactivate +
      Alert; rate-limited → Celery retry; everything else → mark failed).

A small helper update_unified_post_status() recomputes the parent's status
from the children's statuses after each child task finishes.
"""
from __future__ import annotations

import logging

from celery import shared_task
from django.utils import timezone

from .models import (
    UnifiedPost, PlatformPublishLog, PlatformCredential, Alert,
    MediaAsset,
)
from .publishers import (
    PublishError, TokenExpiredError, RateLimitError,
    PermissionDeniedError, MediaTooLargeError,
)
from .publishers.base import PublishResult
from .platforms.registry import get_provider
from . import media_service
from .realtime import push_event
from .audit import log_action

logger = logging.getLogger(__name__)


# ── Public entry points ───────────────────────────────────────────────────────
@shared_task(bind=True)
def publish_unified_post(self, unified_post_id: int):
    """Fan-out a UnifiedPost across all of its target platforms."""
    try:
        post = UnifiedPost.objects.get(id=unified_post_id)
    except UnifiedPost.DoesNotExist:
        logger.warning('publish_unified_post: post %s not found', unified_post_id)
        return

    if post.status not in ('scheduled', 'queued', 'pending_approval', 'partial', 'failed'):
        logger.info('publish_unified_post: post %s already in status %s — skipping',
                    unified_post_id, post.status)
        return

    if post.status == 'scheduled' and post.scheduled_at and post.scheduled_at > timezone.now():
        return

    from .authorization import post_decision
    decision = post_decision(post)
    if not decision.allowed:
        post.status = 'failed'
        post.save(update_fields=['status'])
        log_action(post.created_by, post.client, 'composer.publish', result='denied', error=decision.reason)
        return
    if decision.requires_approval and not post.approved_by_id:
        post.status = 'pending_approval'
        post.save(update_fields=['status'])
        from .notification_watchers import notify_approver_for_post
        notify_approver_for_post.delay(post.id)
        return

    targets = list(post.target_platforms or [])
    if not targets:
        post.status = 'failed'
        post.save(update_fields=['status'])
        logger.warning('publish_unified_post: no target_platforms on post %s', unified_post_id)
        return

    # Compare-and-set prevents a queued task from reviving an edited/cancelled intent.
    if not UnifiedPost.objects.filter(pk=post.pk, status=post.status, updated_at=post.updated_at).update(status='publishing'):
        return
    post.status = 'publishing'

    from .publishing_contract import delivery_options, post_payload
    deliveries = [(platform, options.get('social_account_id', 0) if 'account_targets' in options else 0) for platform in targets
                  for options in delivery_options(post_payload(post), platform)]
    for platform, account_id in deliveries:
        if account_id and not PlatformPublishLog.objects.filter(unified_post=post, platform=platform, account_target_id=account_id).exists():
            # Preserve a completed legacy single-account delivery when its target
            # becomes explicit; it must not be sent again under a new key.
            PlatformPublishLog.objects.filter(unified_post=post, platform=platform, account_target_id=0, social_account_id=account_id).update(account_target_id=account_id)
        log, created = PlatformPublishLog.objects.get_or_create(
            unified_post=post, platform=platform, account_target_id=account_id,
            defaults={'status': 'pending', 'attempted_at': None,
                      'error_code': '', 'error_message': ''},
        )
        # Preserve completed deliveries during a partial-post retry. A worker
        # that crashed after sending remains ambiguous and needs reconciliation.
        if not created and (log.status in ('success', 'publishing') or
                            log.error_code in ('timeout', 'network_error', 'invalid_response')):
            continue
        if not created:
            PlatformPublishLog.objects.filter(pk=log.pk, status='failed').update(
                status='pending', error_code='', error_message='',
            )
        publish_to_platform.delay(post.id, platform, account_id)
    update_unified_post_status(post.id)


@shared_task(bind=True, max_retries=3, default_retry_delay=120, acks_late=True)
def publish_to_platform(self, unified_post_id: int, platform: str, account_id: int = 0):
    """Publish one UnifiedPost to one platform. Retries on transient errors."""
    try:
        post = UnifiedPost.objects.select_related('client').get(id=unified_post_id)
    except UnifiedPost.DoesNotExist:
        return

    if post.status in ('draft', 'scheduled', 'queued', 'pending_approval', 'cancelled', 'published'):
        if post.status != 'published':
            stale_log = PlatformPublishLog.objects.filter(unified_post=post, platform=platform, account_target_id=account_id, status__in=['pending', 'publishing']).first()
            if stale_log:
                _mark_failed(stale_log, code='publication_invalidated', message='Publication intent is no longer active')
        return

    log, _ = PlatformPublishLog.objects.get_or_create(unified_post=post, platform=platform, account_target_id=account_id, defaults={'status': 'pending'})
    if log.status != 'pending':
        return
    from .authorization import post_decision
    decision = post_decision(post)
    if not decision.allowed or (decision.requires_approval and not post.approved_by_id):
        _mark_failed(log, code='approval_required' if decision.allowed else 'permission_denied',
                     message='Current policy requires review' if decision.allowed else decision.reason)
        update_unified_post_status(post.id)
        if decision.allowed and not post.publish_logs.filter(status='success').exists():
            post.status = 'pending_approval'
            post.save(update_fields=['status'])
        return

    # Atomic claim: concurrent/re-delivered tasks cannot both send this row.
    if not PlatformPublishLog.objects.filter(pk=log.pk, status='pending').update(
        status='publishing', attempted_at=timezone.now(),
    ):
        return
    log.refresh_from_db()

    from .publishing_contract import delivery_options, post_payload
    options = delivery_options(post_payload(post), platform)
    overrides = next((item for item in options if (item.get('social_account_id', 0) if 'account_targets' in item else 0) == account_id), None)
    if overrides is None:
        _mark_failed(log, code='publication_invalidated', message='Account target was removed')
        update_unified_post_status(post.id)
        return
    credential_query = PlatformCredential.objects.filter(
        client=post.client, platform=platform, is_active=True,
    )
    social_account_id = overrides.get('social_account_id')
    if social_account_id:
        credential_query = credential_query.filter(social_account_id=social_account_id)
    candidates = list(credential_query[:2])
    cred = candidates[0] if len(candidates) == 1 else None
    if not cred:
        _mark_failed(log, code='no_credential',
                     message=f'No active {platform} credential — connect first')
        update_unified_post_status(post.id)
        return

    if log.social_account_id != cred.social_account_id:
        log.social_account = cred.social_account
        log.save(update_fields=['social_account'])

    content = overrides.get('content', post.content) or ''
    media_urls = overrides.get('media_urls', post.media_urls) or []
    media_type = overrides.get('media_type', post.media_type) or 'text'
    destination_id = (overrides.get('destination_id') or '').strip()

    media_urls = _resolve_media_urls(post, media_urls)
    try:
        provider = get_provider(platform)
    except NotImplementedError:
        _mark_failed(log, code='unsupported', message=f'Publishing is disabled for {platform}')
        update_unified_post_status(post.id)
        return

    try:
        from .publishing_contract import validate_intent
        validate_intent({**post_payload(post), 'target_platforms': [platform],
                         'platform_overrides': {platform: {k: v for k, v in overrides.items() if k != 'account_targets'}}},
                        post.client, post.publish_requested_by or post.created_by, ready=True)
        from copy import copy
        delivery_post = copy(post)
        delivery_post.platform_overrides = {**(post.platform_overrides or {}), platform: overrides}
        result = _dispatch_publish(
            provider,
            cred,
            content,
            media_urls,
            media_type,
            post=delivery_post,
            destination_id=destination_id,
        )
    except TokenExpiredError:
        _mark_failed(log, code='token_expired', message='Reconnect the expired account')
        cred.mark_auth_failure('token_expired')
        Alert.objects.create(
            client=post.client, platform=platform, alert_type='token_expired',
            message=f'{platform} token expired — please reconnect to keep publishing.',
            dedup_key=f'token_expired:{platform}:{cred.id}:{timezone.now().date()}',
        )
        push_event('credential.token_expired', post.client_id, {
            'platform': platform, 'credential_id': cred.id,
        })
        log_action(post.created_by, post.client, 'credential.deactivated',
                   platform=platform, object_type='PlatformCredential', object_id=cred.id,
                   result='failed', error='Token expired during publish')
        update_unified_post_status(post.id)
        return

    except RateLimitError as e:
        policy = provider.manifest.resilience
        retry_budget = self.max_retries if provider.manifest.legacy_adapter else min(self.max_retries, policy.max_attempts - 1)
        if not provider.manifest.legacy_adapter and policy.mutation_retry == 'never':
            retry_budget = 0
        wait = max(int((getattr(e, 'retry_after', None) if policy.retry_after else None) or 60), 30)
        if self.request.retries >= retry_budget:
            _mark_failed(log, code='rate_limited', message='Rate limit retry budget exhausted')
            update_unified_post_status(post.id)
            return
        log.status = 'pending'
        log.error_code = 'rate_limited'
        log.error_message = 'Provider rate limit reached'
        log.save(update_fields=['status', 'error_code', 'error_message'])
        try:
            raise self.retry(exc=RateLimitError('Provider rate limit reached', retry_after=wait), countdown=wait)
        except self.MaxRetriesExceededError:
            _mark_failed(log, code='rate_limited',
                         message=f'Rate limit exceeded after {self.max_retries} retries')
            update_unified_post_status(post.id)
        return

    except (PermissionDeniedError, MediaTooLargeError, PublishError) as e:
        _mark_failed(log, code=getattr(e, 'code', 'publish_error') or 'publish_error',
                     message='Provider rejected the operation')
        update_unified_post_status(post.id)
        return

    except Exception:
        logger.error('publish_to_platform unexpected error post=%s platform=%s', post.id, platform)
        _mark_failed(log, code='invalid_response', message='Provider outcome requires review')
        update_unified_post_status(post.id)
        return

    if (not isinstance(result, PublishResult) or type(result.success) is not bool
        or not result.success or not isinstance(result.platform_post_id, str) or not result.platform_post_id):
        _mark_failed(log, code='invalid_response', message='Provider outcome requires review')
        update_unified_post_status(post.id)
        return
    log.status = 'success'
    from .platforms.base import public_provider_data
    secrets = (cred.access_token, cred.refresh_token)
    log.platform_post_id = public_provider_data(result.platform_post_id or '', secrets)
    log.platform_url = public_provider_data(result.platform_url or '', secrets)
    log.completed_at = timezone.now()
    log.error_code = ''
    log.error_message = ''
    log.raw_response = result.raw_response or {}
    if result.platform_post_ids:
        log.raw_response = {**log.raw_response, 'platform_post_ids': result.platform_post_ids}
    log.save(update_fields=[
        'status', 'platform_post_id', 'platform_url',
        'completed_at', 'error_code', 'error_message', 'raw_response',
    ])

    MediaAsset.objects.filter(used_in_posts=post, is_used=False).update(is_used=True)
    update_unified_post_status(post.id)


# ── Helpers ───────────────────────────────────────────────────────────────────
def _dispatch_publish(
    publisher,
    credential,
    content,
    media_urls,
    media_type,
    *,
    post,
    destination_id: str = '',
):
    """Publish through a capability-aware provider/publisher entry point."""
    media_type = (media_type or 'text').lower()
    options = (getattr(post, 'platform_overrides', None) or {}).get(getattr(publisher, 'key', None) or getattr(publisher, 'platform', None), {})
    publish_kwargs = dict(options.get('extensions') or {})
    if destination_id:
        publish_kwargs['destination_id'] = destination_id
    from .platforms.base import BasePlatformProvider
    platform = getattr(publisher, 'key', None) or getattr(publisher, 'platform', None)
    try:
        extension_provider = publisher if isinstance(publisher, BasePlatformProvider) else (
            get_provider(platform) if isinstance(platform, str) else None)
        if extension_provider:
            publish_kwargs.update(extension_provider.prepare_publish(post, _resolve_media_urls))
    except NotImplementedError:
        pass
    # Accept a raw legacy publisher for callers/tests during the registry
    # transition; production passes a provider.
    if not isinstance(publisher, BasePlatformProvider) and getattr(publisher, 'provider_entrypoint', False) is not True:
        from .publishers.base import BasePublisher
        return BasePublisher.publish(
            publisher, credential, media_type=media_type, content=content,
            media_urls=media_urls, **publish_kwargs,
        )
    if isinstance(publisher, BasePlatformProvider) and not publisher.manifest.legacy_adapter:
        from .platforms.contracts import DestinationContext, PublishRequest
        from .platforms.execution import ProviderExecution
        account = credential.social_account
        destination = DestinationContext(
            account_id=account.pk if account else 0, workspace_id=post.client_id,
            kind=(getattr(account, 'metadata', None) or {}).get('destination_type', 'profile'),
            remote_id=destination_id or (account.external_id if account else ''),
        )
        return ProviderExecution(publisher, credential, destination).call(
            'publish', PublishRequest(media_type=media_type, content=content,
                                      media_urls=tuple(media_urls), idempotency_key=f'post:{post.pk}:account:{account.pk}',
                                      extensions={k: v for k, v in publish_kwargs.items() if k != 'destination_id'}),
        )
    return publisher.publish(
        credential, media_type=media_type, content=content,
        media_urls=media_urls, **publish_kwargs,
    )


def _resolve_media_urls(post: UnifiedPost, media_urls: list) -> list:
    """
    Translate a mix of bare URLs and `asset:<id>` placeholders into final URLs.
    Real apps will store everything as `asset:<id>` so the orchestrator can
    swap to S3 presigned URLs at publish time. Bare URLs pass through unchanged.
    """
    out = []
    for u in media_urls or []:
        if isinstance(u, str) and u.startswith('asset:'):
            try:
                asset_id = int(u.split(':', 1)[1])
                asset = MediaAsset.objects.filter(
                    id=asset_id, client=post.client,
                ).first()
                if asset:
                    out.append(media_service.presigned_url(asset) or '')
                    continue
            except (ValueError, IndexError):
                pass
        out.append(u)
    return [u for u in out if u]


def _mark_failed(log: PlatformPublishLog, *, code: str, message: str):
    log.status = 'failed'
    log.error_code = (code or 'failed')[:80]
    log.error_message = (message or '')[:500]
    log.completed_at = timezone.now()
    log.save(update_fields=['status', 'error_code', 'error_message', 'completed_at'])


def update_unified_post_status(unified_post_id: int):
    """Recompute the parent UnifiedPost.status from its child publish_logs."""
    try:
        post = UnifiedPost.objects.get(id=unified_post_id)
    except UnifiedPost.DoesNotExist:
        return

    from .publishing_contract import delivery_options, post_payload
    deliveries = [(platform, options.get('social_account_id', 0) if 'account_targets' in options else 0) for platform in post.target_platforms or []
                  for options in delivery_options(post_payload(post), platform)]
    logs = {(item.platform, item.account_target_id): item.status for item in post.publish_logs.all()}
    statuses = [logs.get(key, 'pending') for key in deliveries]
    targets = deliveries
    if not statuses or len(statuses) < len(targets):
        if post.status not in ('publishing',):
            return
        return

    if all(s == 'success' for s in statuses):
        post.status = 'published'
        if not post.published_at:
            post.published_at = timezone.now()
        post.save(update_fields=['status', 'published_at'])
        push_event('composer.post_published', post.client_id, {
            'unified_post_id': post.id,
            'title': post.title,
            'platforms': post.target_platforms or [],
        })
        log_action(post.created_by, post.client, 'composer.published',
                   object_type='UnifiedPost', object_id=post.id,
                   result='success',
                   details={'platforms': post.target_platforms,
                            'post_id': post.pk})
        try:
            from .events.publisher import EventPublisher
            EventPublisher.publish(
                'post.published',
                client=post.client,
                actor=post.created_by,
                payload={
                    'post_id': post.id,
                    'platforms': list(post.target_platforms or []),
                },
            )
        except Exception:
            pass
        return

    if all(s == 'failed' for s in statuses):
        post.status = 'failed'
        post.save(update_fields=['status'])
        push_event('composer.post_failed', post.client_id, {
            'unified_post_id': post.id,
            'title': post.title,
        })
        log_action(post.created_by, post.client, 'composer.published',
                   object_type='UnifiedPost', object_id=post.id,
                   result='failed',
                   details={'platforms': post.target_platforms,
                            'post_id': post.pk})
        try:
            from .events.publisher import EventPublisher
            failed_log = post.publish_logs.filter(status='failed').first()
            reason = (
                failed_log.error_message
                if failed_log and failed_log.error_message
                else 'all platforms failed'
            )
            EventPublisher.publish(
                'post.failed',
                client=post.client,
                actor=post.created_by,
                payload={
                    'post_id': post.id,
                    'reason': reason[:300],
                },
            )
        except Exception:
            pass
        return

    if any(s == 'success' for s in statuses) and any(s == 'failed' for s in statuses):
        post.status = 'partial'
        if not post.published_at:
            post.published_at = timezone.now()
        post.save(update_fields=['status', 'published_at'])
        push_event('composer.post_partial', post.client_id, {
            'unified_post_id': post.id,
            'title': post.title or post.content[:60],
            'success_count': sum(1 for s in statuses if s == 'success'),
            'failed_count': sum(1 for s in statuses if s == 'failed'),
        })
        log_action(post.created_by, post.client, 'composer.published',
                   object_type='UnifiedPost', object_id=post.id,
                   result='partial',
                   details={'platforms': post.target_platforms,
                            'success_count': sum(1 for s in statuses if s == 'success'),
                            'failed_count': sum(1 for s in statuses if s == 'failed')})
