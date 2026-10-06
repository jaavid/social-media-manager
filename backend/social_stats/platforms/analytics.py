"""Provider-declared metrics; no legacy zero backfill or cross-provider totals."""
import math
from dataclasses import asdict
from social_stats.authorization import evaluate
from social_stats.models import DailyMetric
from .account_health import sync_health, connection_health
from .base import ProviderError
from .registry import get_provider


def report(account, since, until, page=1, page_size=100):
    provider = get_provider(account.platform)
    manifest = provider.manifest
    available = manifest.capability('analytics').enabled and bool(manifest.analytics_metrics)
    descriptors = [asdict(metric) for metric in manifest.analytics_metrics] if available else []
    query = DailyMetric.objects.filter(client_id=account.client_id, social_account=account,
                                       date__range=(since, until)).order_by('date', 'pk')
    count = query.count() if available else 0
    rows = []
    for row in query[(page - 1) * page_size:page * page_size] if available else []:
        values = {}
        received = row.provider_metrics
        if received is not None and not isinstance(received, dict):
            raise ProviderError('Invalid stored analytics', code='invalid_response')
        for descriptor in descriptors:
            value = (received or {}).get(descriptor['key'])
            if value is not None and (type(value) not in (int, float) or not math.isfinite(value)):
                raise ProviderError('Invalid stored metric', code='invalid_response')
            values[descriptor['key']] = value
        state = 'unknown' if received is None else 'partial' if any(v is None for v in values.values()) else 'available'
        rows.append({'id': row.pk, 'date': row.date.isoformat(), 'observed_at': row.synced_at,
                     'values': values, 'state': state})
    return {'version': 1, 'workspace_id': account.client_id, 'account_id': account.pk,
            'provider': manifest.key, 'period': {'since': since.isoformat(), 'until': until.isoformat()},
            'metrics': descriptors, 'availability': 'available' if available else 'unavailable',
            'sync': sync_health(provider, account), 'rows': rows,
            'dataset_count': DailyMetric.objects.filter(client_id=account.client_id, social_account=account).count() if available else 0,
            'pagination': {'page': page, 'page_size': page_size, 'count': count,
                           'has_next': page * page_size < count, 'has_previous': page > 1}}


def queue_sync(credential, actor, days=30):
    account = credential.social_account
    provider = get_provider(credential.platform)
    if (account is None or not evaluate(actor, account.client, 'view_analytics', account=account).allowed
        or not provider.manifest.capability('analytics').enabled
        or not provider.manifest.analytics_metrics
        or (provider.manifest.legacy_adapter and not provider.manifest.analytics_sync_handler)
        or not connection_health(provider, credential).ready):
        raise ProviderError('Analytics sync is unavailable', code='permission_denied')
    from social_stats.tasks import sync_provider_account
    sync_provider_account.delay(account.client_id, credential.pk, actor.pk)
