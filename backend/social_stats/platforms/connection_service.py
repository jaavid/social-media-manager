"""Tenant-safe persistence service for provider connections."""
from __future__ import annotations

from social_stats.models import PlatformCredential
from .registry import get_provider


class ConnectionService:
    def connect(self, client, platform: str, credentials: dict):
        provider = get_provider(platform)
        result = provider.connect(credentials)
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

    def disconnect(self, client, platform: str) -> bool:
        provider = get_provider(platform)
        credential = PlatformCredential.objects.filter(
            client=client, platform=provider.key,
        ).first()
        if not credential:
            return False
        if provider.capabilities.revoke:
            provider.revoke(credential)
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
