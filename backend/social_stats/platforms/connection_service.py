"""Account-scoped persistence; provider extensions stay inside their adapter."""
from __future__ import annotations

from django.db import transaction
from social_stats.models import PlatformCredential, SocialAccount
from .base import ConnectionResult, ProviderError, public_provider_data, safe_provider_error
from .registry import get_provider
from social_stats.publishers.base import PublishError


class ConnectionService:
    def connect(self, client, platform: str, credentials: dict):
        if not client or not client.pk:
            raise ProviderError('Workspace is required', code='scope_denied')
        provider = get_provider(platform)
        try:
            result = provider.connect(credentials)
        except PublishError as exc:
            raise safe_provider_error(exc) from None
        except Exception:
            raise ProviderError('Provider connection failed', code='provider_error') from None
        if not isinstance(result, ConnectionResult) or not result.success:
            raise ProviderError('Invalid connection result', code='invalid_response')
        external_id, display_name, metadata = provider.connection_identity(result)
        if not provider.manifest.legacy_adapter:
            if result.destination_type not in provider.manifest.destination_types:
                raise ProviderError('Invalid destination type', code='invalid_response')
            metadata = {**metadata, 'destination_type': result.destination_type}
        if not external_id:
            raise ProviderError('Provider identity is missing', code='invalid_response')
        metadata = public_provider_data(metadata, (result.access_token, result.refresh_token))
        platform = provider.manifest.key
        with transaction.atomic():
            # Serialize reconnects and legacy credential attachment within a workspace.
            type(client).objects.select_for_update().get(pk=client.pk)
            account, _ = SocialAccount.objects.update_or_create(
                client=client, platform=platform, external_id=str(external_id),
                defaults={'display_name': display_name, 'is_active': True, 'metadata': metadata},
            )
            defaults = {
                'client': client, 'platform': platform, 'access_token': result.access_token,
                'refresh_token': result.refresh_token, 'platform_user_id': result.destination_id or result.account_id,
                'page_name': result.account_name, 'scope': result.scope, 'is_active': True,
                'auth_method': 'manual_token', 'expires_at': result.expires_at,
            }
            legacy = PlatformCredential.objects.filter(
                client=client, platform=platform, social_account__isnull=True,
            ).first()
            if legacy and not PlatformCredential.objects.filter(social_account=account).exists():
                legacy.social_account = account
                for key, value in defaults.items():
                    setattr(legacy, key, value)
                legacy.save()
                credential = legacy
            else:
                credential, _ = PlatformCredential.objects.update_or_create(social_account=account, defaults=defaults)
            provider.connected(account, result)
        return credential, result

    def disconnect(self, client, platform: str, *, social_account_id=None) -> bool:
        provider = get_provider(platform)
        credentials = PlatformCredential.objects.filter(client=client, platform=provider.manifest.key)
        if social_account_id is not None:
            credentials = credentials.filter(social_account_id=social_account_id)
        elif credentials.count() > 1:
            raise ProviderError('Select the account to disconnect', code='account_required')
        credential = credentials.first()
        if not credential:
            return False
        if provider.capabilities.revoke:
            try:
                provider.revoke(credential)
            except PublishError as exc:
                raise safe_provider_error(exc) from None
        with transaction.atomic():
            account = credential.social_account
            if account:
                if account.client_id != client.pk:
                    raise ProviderError('Account scope denied', code='scope_denied')
                provider.disconnected(account)
                account.is_active = False
                account.save(update_fields=['is_active', 'updated_at'])
            credential.delete()
        return True

    def statuses(self, client) -> dict:
        from .registry import iter_providers
        connectable = {p.manifest.key for p in iter_providers(capability='connect')}
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
