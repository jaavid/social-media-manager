"""Bounded, shared operational metrics; never inspect task arguments or results."""
from datetime import timedelta
from functools import lru_cache
import logging

from celery import current_app
from django.conf import settings
from django.db.models import Count, Max, OuterRef, Subquery
from django.utils import timezone
from redis import Redis

logger = logging.getLogger(__name__)
PREFIX = 'socialstats:metrics:v1:'
DURATION_BUCKETS = (1, 5, 15, 60, 300, 1800)
STATES = ('SUCCESS', 'FAILURE', 'RETRY', 'REVOKED', 'OTHER')
MODULE_FAMILIES = {
    'tasks': 'analytics', 'scheduler': 'publishing', 'orchestrator': 'publishing',
    'automation_engine': 'automation', 'inbox_tasks': 'inbox',
    'bot_webhook_tasks': 'bots', 'bot_engine': 'bots',
    'events': 'events', 'security': 'security', 'telegram_tasks': 'telegram',
    'whatsapp_tasks': 'whatsapp', 'meta_capi_tasks': 'ads',
    'competitor_tasks': 'competitors', 'notification_watchers': 'notifications',
}
TASK_FAMILIES = {
    'social_stats.tasks.check_alerts': 'notifications',
    'social_stats.tasks.send_scheduling_reminders': 'notifications',
    'social_stats.tasks.check_overdue_scheduled_posts': 'notifications',
    'social_stats.tasks.sync_posts_to_calendar': 'publishing',
}
FAMILIES = tuple(sorted(set(MODULE_FAMILIES.values()) | {'other'}))


def task_family(name):
    if name in TASK_FAMILIES:
        return TASK_FAMILIES[name]
    parts = (name or '').split('.')
    if len(parts) < 3 or parts[0] != 'social_stats':
        return 'other'
    return MODULE_FAMILIES.get(parts[1], 'other')


@lru_cache(maxsize=4)
def _redis(url):
    return Redis.from_url(url, decode_responses=True, socket_timeout=1,
                          socket_connect_timeout=1, retry_on_timeout=False)


def metrics_store():
    return _redis(settings.RUNTIME_METRICS_REDIS_URL)


def record_task(name, state, duration):
    if not settings.RUNTIME_METRICS_ENABLED:
        return
    key = PREFIX + task_family(name)
    state = state if state in STATES else 'OTHER'
    try:
        with metrics_store().pipeline(transaction=True) as pipeline:
            pipeline.hincrby(key, state, 1)
            pipeline.hincrbyfloat(key, 'duration_sum', max(0, duration))
            for bucket in DURATION_BUCKETS:
                if duration <= bucket:
                    pipeline.hincrby(key, f'le_{bucket}', 1)
            pipeline.execute()
    except Exception:
        # Never let telemetry break publishing, retry handling or context cleanup.
        # Even exception text can include a credential-bearing connection URL.
        logger.warning('runtime_metrics_write_unavailable')


def task_metrics():
    with metrics_store().pipeline(transaction=False) as pipeline:
        for family in FAMILIES:
            pipeline.hgetall(PREFIX + family)
        values = pipeline.execute()
    return {family: {
        'states': {state: int(data.get(state, 0)) for state in STATES},
        'duration_seconds_sum': float(data.get('duration_sum', 0)),
        'duration_seconds_buckets': {str(b): int(data.get(f'le_{b}', 0)) for b in DURATION_BUCKETS},
    } for family, data in zip(FAMILIES, values)}


def queue_depths():
    # Use Kombu's Redis channel so priority buckets and global_keyprefix match
    # the actual broker. _size only issues LLEN; no dequeue or queue declaration.
    with current_app.connection_for_read() as connection:
        with connection.channel() as channel:
            if connection.transport.driver_type != 'redis':
                raise ValueError('Only Redis queue depth is supported')
            return {name: channel._size(name) for name in sorted(current_app.amqp.queues)}


def provider_sync_metrics(*, window_seconds=86400, stale_seconds=86400):
    from .models import SocialAccount, SyncLog
    from .platforms.provider_registry import iter_manifests

    now = timezone.now()
    recent = now - timedelta(seconds=window_seconds)
    cutoff = now - timedelta(seconds=stale_seconds)
    result = {}
    for manifest in iter_manifests():
        if not manifest.capability('analytics').enabled:
            continue
        platform = manifest.key
        logs = SyncLog.objects.filter(platform=platform)
        counts = dict(logs.filter(started_at__gte=recent).values('status').annotate(
            count=Count('pk')).values_list('status', 'count'))
        # Staleness is per active account: one healthy account must not hide
        # another account which has never synced or only recorded failures.
        success = logs.filter(status='success', finished_at__isnull=False,
                              social_account_id=OuterRef('pk'), client_id=OuterRef('client_id'))
        accounts = SocialAccount.objects.filter(platform=platform, is_active=True, client__is_active=True)
        accounts = accounts.annotate(last_success=Subquery(
            success.order_by('-finished_at').values('finished_at')[:1]))
        fresh = accounts.filter(last_success__gte=cutoff).count()
        total = accounts.count()
        result[platform] = {
            'recent_success': counts.get('success', 0), 'recent_failed': counts.get('failed', 0),
            'in_progress': logs.filter(status__in=['pending', 'running']).count(),
            'stuck': logs.filter(status__in=['pending', 'running'], started_at__lt=cutoff).count(),
            'active_accounts': total, 'stale_accounts': total - fresh,
            'last_success_timestamp': (logs.filter(status='success').aggregate(
                last=Max('finished_at'))['last'] or None),
        }
        value = result[platform]['last_success_timestamp']
        result[platform]['last_success_timestamp'] = value.timestamp() if value else None
    return result


def runtime_snapshot():
    result = {'enabled': settings.RUNTIME_METRICS_ENABLED, 'tasks': {}, 'queues': {}, 'providers': {}}
    if not settings.RUNTIME_METRICS_ENABLED:
        return result
    for name, reader in (('tasks', task_metrics), ('queues', queue_depths), ('providers', provider_sync_metrics)):
        try:
            result[name] = reader()
            result[name + '_available'] = True
        except Exception:
            result[name + '_available'] = False
    return result


def prometheus_snapshot(snapshot):
    # Escape labels (including custom queue names); payloads,
    # account IDs, task IDs and exception messages are never included.
    groups = {}

    def label(value):
        return str(value).replace('\\', '\\\\').replace('\n', '\\n').replace('"', '\\"')

    def emit(name, value, **labels):
        suffix = '{' + ','.join(f'{key}="{label(val)}"' for key, val in labels.items()) + '}' if labels else ''
        family = 'task_duration_seconds' if name.startswith('task_duration_seconds_') else name
        groups.setdefault(family, []).append(f'socialstats_{name}{suffix} {value}')

    emit('runtime_metrics_enabled', int(snapshot['enabled']))
    for source in ('tasks', 'queues', 'providers'):
        emit('runtime_metrics_available', int(snapshot.get(source + '_available', False)), source=source)
    for family, values in snapshot['tasks'].items():
        total = sum(values['states'].values())
        for state, count in values['states'].items():
            emit('task_runs_total', count, family=family, state=state)
        emit('task_duration_seconds_sum', values['duration_seconds_sum'], family=family)
        emit('task_duration_seconds_count', total, family=family)
        for bucket, count in values['duration_seconds_buckets'].items():
            emit('task_duration_seconds_bucket', count, family=family, le=bucket)
        emit('task_duration_seconds_bucket', total, family=family, le='+Inf')
    for queue, depth in snapshot['queues'].items():
        emit('queue_depth', depth, queue=queue)
    for provider, values in snapshot['providers'].items():
        for key, value in values.items():
            if value is not None:
                emit('provider_sync_' + key, value, provider=provider)
    lines = []
    for family, samples in groups.items():
        kind = 'histogram' if family == 'task_duration_seconds' else 'counter' if family.endswith('_total') else 'gauge'
        lines.append(f'# TYPE socialstats_{family} {kind}')
        lines.extend(samples)
    return '\n'.join(lines) + '\n'
