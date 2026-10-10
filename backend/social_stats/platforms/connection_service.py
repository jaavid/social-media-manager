"""Account-scoped persistence; provider extensions stay inside their adapter."""
from __future__ import annotations

from django.db import transaction
from social_stats.models import PlatformCredential, SocialAccount
from .base import ConnectionResult, ProviderError, public_provider_data, safe_provider_error
from .registry import get_provider
from social_stats.publishers.base import PublishError


class ConnectionService:
    def connect(self, client, platform: str, credentials: dict, *, social_account_id=None, authorize_account=None):
        if not client or not client.pk:
            raise ProviderError('Workspace is required', code='scope_denied')
        provider = get_provider(platform)
        target = None
        if social_account_id is not None:
            target = SocialAccount.objects.filter(pk=social_account_id, client=client,
                                                   platform=provider.manifest.key).first()
            if target is None:
                raise ProviderError('Account scope denied', code='scope_denied')
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
        legacy_identity = None
        if provider.manifest.key == 'telegram':
            destination = result.data.get('destination', {}) if isinstance(result.data, dict) else {}
            chat = destination.get('chat_id') if isinstance(destination, dict) else None
            bot = result.account_id
            if (isinstance(chat, int) and not isinstance(chat, bool) and chat != 0
                    and isinstance(bot, str) and bot.isdecimal() and int(bot) > 0
                    and str(external_id) == str(chat)):
                legacy_identity = f'{bot}:{chat}'
        if target and target.external_id != str(external_id) and target.external_id != legacy_identity:
            raise ProviderError('Select the original account to reconnect', code='account_mismatch')
        if not external_id:
            raise ProviderError('Provider identity is missing', code='invalid_response')
        metadata = {**metadata, 'destination_type': result.destination_type, 'account_identity': result.account_id,
                    'account_name': result.account_name,
                    'destination_id': result.destination_id or result.account_id}
        if any(secret and secret in str(external_id) for secret in (result.access_token, result.refresh_token)):
            raise ProviderError('Invalid provider identity', code='invalid_response')
        display_name = public_provider_data(display_name, (result.access_token, result.refresh_token))
        metadata = public_provider_data(metadata, (result.access_token, result.refresh_token))
        platform = provider.manifest.key
        with transaction.atomic():
            # Serialize reconnects and legacy credential attachment within a workspace.
            type(client).objects.select_for_update().get(pk=client.pk)
            if target is not None:
                target = SocialAccount.objects.select_for_update().filter(pk=target.pk, client=client, platform=platform).first()
                if target is None:
                    raise ProviderError('Account scope changed', code='scope_denied')
                if target.external_id not in {str(external_id), legacy_identity}:
                    raise ProviderError('Account identity changed', code='account_mismatch')
            existing = SocialAccount.objects.filter(client=client, platform=platform, external_id=str(external_id)).first()
            reconciled = None
            if legacy_identity:
                historical = SocialAccount.objects.select_for_update().filter(client=client, platform=platform, external_id=legacy_identity).first()
                if historical and target is None:
                    raise ProviderError('Select the original account to reconnect', code='account_required')
                if target and target.external_id == legacy_identity:
                    if historical is None or historical.pk != target.pk or existing is not None:
                        raise ProviderError('Account identity conflict', code='account_mismatch')
                    attached = PlatformCredential.objects.select_for_update().filter(
                        social_account=historical, client=client, platform=platform,
                        platform_user_id__in=[str(external_id), result.destination_id],
                    ).first()
                    if attached is None:
                        raise ProviderError('Original credential identity is missing', code='account_mismatch')
                    reconciled = historical
            if authorize_account and not authorize_account(reconciled or existing):
                raise ProviderError('Account permission denied', code='permission_denied')
            if reconciled is not None:
                account = reconciled
                account.external_id = str(external_id)
                account.display_name = display_name
                account.is_active = True
                account.metadata = metadata
                account.save()
            else:
                account, _ = SocialAccount.objects.update_or_create(
                    client=client, platform=platform, external_id=str(external_id),
                    defaults={'display_name': display_name, 'is_active': True, 'metadata': metadata},
                )
            defaults = {
                'auth_failure_code': '',
                'client': client, 'platform': platform, 'access_token': result.access_token,
                'refresh_token': result.refresh_token, 'platform_user_id': result.destination_id or result.account_id,
                'page_name': result.account_name, 'scope': result.scope, 'is_active': True,
                'auth_method': 'managed_bot' if provider.manifest.auth_type == 'managed_bot' else 'manual_token', 'expires_at': result.expires_at,
            }
            attached_exists = PlatformCredential.objects.filter(social_account=account).exists()
            legacy_query = PlatformCredential.objects.filter(
                client=client, platform=platform, social_account__isnull=True,
            )
            if platform == 'telegram' and not attached_exists:
                legacy_query = legacy_query.filter(platform_user_id__in=[str(external_id), result.destination_id])
                if legacy_query.count() > 1:
                    raise ProviderError('Select the original credential to reconnect', code='account_required')
            legacy = legacy_query.first() if not attached_exists else None
            if legacy is not None:
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

    @staticmethod
    def _status(credential):
        if credential.auth_method == 'managed_bot':
            from .account_health import connection_health
            health = connection_health(get_provider(credential.platform), credential)
            return 'active' if health.ready else health.state
        return credential.status if credential.is_active else 'not_connected'

    def statuses(self, client) -> dict:
        from .registry import iter_providers
        connectable = {p.manifest.key for p in iter_providers(capability='connect')}
        rows = PlatformCredential.objects.filter(client=client, platform__in=connectable)
        return {
            credential.platform: {
                'status': self._status(credential),
                'credential_id': credential.id,
                'destination_id': credential.platform_user_id,
                'account_name': credential.page_name or '',
                'connected_at': credential.connected_at,
            }
            for credential in rows
        }
