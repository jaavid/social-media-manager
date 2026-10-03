"""Tenant-safe persistence service for provider connections."""
from __future__ import annotations

from social_stats.models import PlatformCredential
from .registry import get_provider


class ConnectionService:
    def connect(self, client, platform: str, credentials: dict):
        provider = get_provider(platform)
        result = provider.connect(credentials)
        if platform == 'telegram':
            from django.db import transaction
            from social_stats.models import SocialAccount, TelegramIntegration
            with transaction.atomic():
                account, _ = SocialAccount.objects.update_or_create(
                    client=client, platform=platform, external_id=str(result.data['destination'].get('chat_id') or result.destination_id),
                    defaults={'display_name': result.data['destination']['name'], 'is_active': True,
                              'metadata': {'bot_id': result.account_id}},
                )
                defaults = {'client': client, 'platform': platform, 'access_token': result.access_token,
                            'platform_user_id': result.destination_id, 'page_name': result.account_name,
                            'scope': result.scope, 'is_active': True, 'auth_method': 'manual_token'}
                legacy = PlatformCredential.objects.filter(client=client, platform=platform, social_account__isnull=True).first()
                if legacy and not PlatformCredential.objects.filter(social_account=account).exists():
                    legacy.social_account = account
                    for key, value in defaults.items():
                        setattr(legacy, key, value)
                    legacy.save()
                    credential = legacy
                else:
                    credential, _ = PlatformCredential.objects.update_or_create(social_account=account, defaults=defaults)
                TelegramIntegration.objects.get_or_create(account=account,
                    defaults={'destination_context': {'destination_type': result.data['destination'].get('type') or 'channel'}})
                return credential, result
        credential, _ = PlatformCredential.objects.update_or_create(
            client=client, platform=provider.key,
            defaults={
                'access_token': result.access_token,
                'refresh_token': result.refresh_token,
                'platform_user_id': result.destination_id or result.account_id,
                'page_name': result.account_name,
                'scope': result.scope,
                'is_active': True,
                'auth_method': 'manual_token',
                'expires_at': result.expires_at,
            },
        )
        return credential, result

    def disconnect(self, client, platform: str, *, social_account_id=None) -> bool:
        provider = get_provider(platform)
        credentials = PlatformCredential.objects.filter(client=client, platform=provider.key)
        if social_account_id is not None:
            credentials = credentials.filter(social_account_id=social_account_id)
        credential = credentials.first()
        if not credential:
            return False
        if provider.capabilities.revoke:
            provider.revoke(credential)
        if platform == 'telegram':
            from social_stats.models import SocialAccount, TelegramIntegration
            accounts = [credential.social_account_id]
            TelegramIntegration.objects.filter(account_id__in=accounts).update(webhook_enabled=False, assistant_enabled=False)
            SocialAccount.objects.filter(pk__in=accounts).update(is_active=False)
            credential.delete()
        else:
            credential.delete()
        return True

    def statuses(self, client) -> dict:
        from .registry import iter_providers
        connectable = {p.key for p in iter_providers(capability='connect')}
        rows = PlatformCredential.objects.filter(client=client, platform__in=connectable)
        return {
            credential.platform: {
                'status': credential.status if credential.is_active else 'not_connected',
                'credential_id': credential.id,
                'destination_id': credential.platform_user_id,
                'account_name': credential.page_name or '',
                'connected_at': credential.connected_at,
            }
            for credential in rows
        }
