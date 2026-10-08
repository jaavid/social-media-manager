"""Scoped engagement delivery shared by HTTP and approved operations."""
from django.utils import timezone
from social_stats.authorization import evaluate
from social_stats.models import Conversation, Message, PlatformCredential
from .base import ProviderError
from .contracts import DestinationContext, ReplyRequest
from .execution import ProviderExecution
from .registry import get_provider


def deliver_reply(target, text, actor):
    account = target.social_account
    if account is None or account.client_id != target.client_id or account.platform != target.platform:
        raise ProviderError('Original account is required', code='scope_denied')
    conversation = isinstance(target, Conversation)
    kind = {'dm': 'inbox', 'comment': 'comments', 'review': 'reviews'}.get(target.type) if conversation else 'reviews'
    action = {'inbox': 'reply_messages', 'comments': 'reply_comments', 'reviews': 'reply_reviews'}.get(kind)
    if action is None or not evaluate(actor, target.client, action, account=account).allowed:
        raise ProviderError('Reply permission denied', code='permission_denied')
    if conversation and target.is_resolved:
        raise ProviderError('Conversation is resolved', code='unsupported')
    credential = PlatformCredential.objects.filter(social_account=account, client=target.client,
                                                    platform=target.platform, is_active=True).first()
    if credential is None:
        raise ProviderError('Account is disconnected', code='not_connected')
    provider = get_provider(target.platform)
    last_inbound = target.messages.filter(direction='inbound').order_by('-created_at').first() if conversation else None
    remote_id = (target.platform_thread_id if kind == 'inbox' else getattr(last_inbound, 'platform_message_id', '')) if conversation else target.platform_review_id
    result = ProviderExecution(provider, credential, DestinationContext(account.pk, target.client_id,
        kind=account.metadata.get('destination_type', provider.manifest.destination_types[0]))).call(
            'reply', ReplyRequest(remote_id, text, kind=kind,
                recipient_id=(last_inbound.author_handle if last_inbound else target.contact_handle) if conversation else ''))
    message_id = result.data.get('message_id', '')
    if not isinstance(message_id, str) or any(secret and secret in message_id for secret in (credential.access_token, credential.refresh_token)):
        raise ProviderError('Invalid reply identifier', code='invalid_response')
    if conversation:
        message = Message.objects.create(conversation=target, platform_message_id=message_id,
            direction='outbound', author_name=actor.get_full_name() or actor.email or 'Ravinta',
            author_handle=actor.email or '', content=text, sent_at=timezone.now(), replied_at=timezone.now(),
            sentiment=last_inbound.sentiment if last_inbound else 'unknown', sent_by=actor)
        target.last_message_preview = text[:500]
        target.last_message_at = message.sent_at
        target.save(update_fields=['last_message_preview', 'last_message_at'])
        return message
    target.reply_text = text
    target.replied_at = timezone.now()
    target.replied_by = actor
    target.status = 'replied'
    target.save(update_fields=['reply_text', 'replied_at', 'replied_by', 'status'])
    return target
