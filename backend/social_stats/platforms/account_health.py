"""Account health projection of the runtime provider result and scoped sync logs."""
from datetime import timedelta
from collections.abc import Mapping

from django.conf import settings
from django.utils import timezone

from social_stats.models import SyncLog
from .base import ProviderError
from .contracts import DestinationContext, HealthResult
from .execution import ProviderExecution


def connection_health(provider, credential):
    if credential is None:
        return HealthResult(False, 'not_connected')
    account = credential.social_account
    if account is None:
        # Legacy unattached credentials cannot pass the runtime account boundary.
        return HealthResult(False, 'unknown', 'account_required')
    if not isinstance(account.metadata, Mapping):
        return HealthResult(False, 'unknown', 'health_unavailable')
    kind = account.metadata.get('destination_type', provider.manifest.destination_types[0])
    if not isinstance(kind, str) or kind not in provider.manifest.destination_types:
        return HealthResult(False, 'unknown', 'health_unavailable')
    destination = DestinationContext(account.pk, account.client_id, kind=kind)
    try:
        result = ProviderExecution(provider, credential, destination).call('health')
        # Only stable codes are public; provider messages are never UI payloads.
        return HealthResult(result.ready and result.state == 'ready', result.state,
                            result.code if result.code in {'token_expired', 'reconnect_required', 'not_connected'} else '')
    except ProviderError:
        # Never equate an upstream outage/invalid result with credential expiry.
        return HealthResult(False, 'unknown', 'health_unavailable')


def sync_health(provider, account):
    stale_seconds = max(60, int(getattr(settings, 'ACCOUNT_SYNC_STALE_SECONDS', 86400)))
    result = {'state': 'unknown', 'last_success_at': None, 'last_failure_at': None,
              'last_attempt_at': None, 'stale_after_seconds': stale_seconds}
    if not provider.manifest.capability('analytics').enabled:
        return {**result, 'state': 'not_available'}
    logs = SyncLog.objects.filter(client_id=account.client_id, social_account=account,
                                  platform=account.platform).order_by('-started_at', '-pk')
    last = logs.first()
    success = logs.filter(status='success').first()
    failure = logs.filter(status='failed').first()
    result.update(last_success_at=(success.finished_at or success.started_at) if success else None,
                  last_failure_at=(failure.finished_at or failure.started_at) if failure else None,
                  last_attempt_at=last.started_at if last else None)
    if last and last.status == 'failed':
        result['state'] = 'failure'
    elif last and last.status in {'running', 'pending'}:
        result['state'] = 'pending'
    elif success:
        result['state'] = ('stale' if timezone.now() - result['last_success_at'] >
                           timedelta(seconds=stale_seconds) else 'fresh')
    return result
