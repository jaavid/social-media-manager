"""Durable, account-scoped polling into the existing unified Inbox."""
from datetime import datetime, timedelta

from django.db import transaction
from django.utils import timezone

from social_stats.models import Conversation, Message, PlatformCredential, SocialAccount
from .base import ProviderError
from .contracts import DestinationContext, PollRequest
from .execution import ProviderExecution
from .registry import get_provider


def poll_account(workspace_id, credential_id):
    """At most three pages per stream/run; retain pagination on busy accounts.

    Lock the account for the run so overlapping beat/manual jobs cannot lose a
    cursor, duplicate messages, or restore a disconnected account's state.
    A failed run rolls back messages and cursor together.
    """
    created = 0
    with transaction.atomic():
        credential = PlatformCredential.objects.select_for_update(of=('self',)).select_related('social_account__client').filter(
            pk=credential_id, client_id=workspace_id, is_active=True,
            client__is_active=True, client__is_processing_paused=False,
            social_account__is_active=True, social_account__client_id=workspace_id).first()
        if not credential:
            return 0
        account = SocialAccount.objects.select_for_update().get(pk=credential.social_account_id, client_id=workspace_id)
        provider = get_provider(credential.platform)
        if provider.manifest.inbound != 'polling':
            return 0
        metadata = dict(account.metadata or {})
        if metadata.get('community_poll_after') and datetime.fromisoformat(metadata['community_poll_after']) > timezone.now():
            return 0
        state = dict(metadata.get('community_poll', {}))
        execution = ProviderExecution(provider, credential, DestinationContext(account.pk, workspace_id,
            kind=metadata['destination_type']))
        for operation in ('poll_inbox', 'poll_comments'):
            if not provider.manifest.capability('inbox' if operation == 'poll_inbox' else 'comments').enabled:
                continue
            progress = state.get(operation, {})
            cutoff = datetime.fromisoformat(progress['since']) if progress.get('since') else timezone.now() - timedelta(days=7)
            newest = datetime.fromisoformat(progress.get('newest', cutoff.isoformat()))
            cursor = progress.get('cursor', '')
            for _ in range(3):
                result = execution.call(operation, PollRequest(cursor=cursor))
                reached_cutoff = False
                for item in result.items:
                    sent_at = item.get('sent_at')
                    if not isinstance(sent_at, datetime) or timezone.is_naive(sent_at):
                        raise ProviderError('Invalid inbox timestamp', code='invalid_response')
                    newest = max(newest, sent_at)
                    if sent_at < cutoff:
                        reached_cutoff = True
                        continue
                    created += persist_item(account, item)
                next_cursor = result.cursor
                if not next_cursor or next_cursor == cursor or reached_cutoff:
                    cursor = ''
                    cutoff = newest
                    break
                cursor = next_cursor
            state[operation] = {'since': cutoff.isoformat(), 'newest': newest.isoformat(), 'cursor': cursor}
        metadata['community_poll'] = state
        metadata['community_last_poll_at'] = timezone.now().isoformat()
        account.metadata = metadata
        account.save(update_fields=['metadata', 'updated_at'])
        if created:
            from social_stats.realtime import push_event
            transaction.on_commit(lambda: push_event('inbox.updated', workspace_id, {'social_account_id': account.pk}))
    return created


def persist_item(account, item):
    for key in ('id', 'thread_id', 'author', 'author_name', 'content'):
        if not isinstance(item.get(key), str):
            raise ProviderError('Invalid inbox item', code='invalid_response')
    if (not item['id'] or not item['thread_id'] or len(item['id']) > 300
            or len(item['thread_id']) > 300 or item.get('type') not in {'dm', 'comment'}):
        raise ProviderError('Invalid inbox identity', code='invalid_response')
    # Same comment can appear in Reddit's inbox and subreddit stream.
    if Message.objects.filter(conversation__client_id=account.client_id,
        conversation__social_account=account, conversation__platform=account.platform,
        platform_message_id=item['id']).exists():
        return 0
    conversation, _ = Conversation.objects.get_or_create(client_id=account.client_id,
        social_account=account, platform=account.platform, platform_thread_id=item['thread_id'],
        defaults={'type': item['type'], 'contact_name': item['author_name'][:200],
                  'contact_handle': item['author'][:200]})
    Message.objects.create(conversation=conversation, platform_message_id=item['id'],
        direction='inbound', author_name=item['author_name'][:200], author_handle=item['author'][:200],
        content=item['content'], media_urls=item.get('media_urls', []), sent_at=item['sent_at'])
    if conversation.last_message_at is None or item['sent_at'] >= conversation.last_message_at:
        conversation.last_message_at = item['sent_at']
        conversation.last_message_preview = item['content'][:500]
    conversation.unread_count += 1
    conversation.save(update_fields=['last_message_at', 'last_message_preview', 'unread_count'])
    return 1
