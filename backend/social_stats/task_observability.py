"""Celery tracing without persisting task arguments or return values."""
import logging
import uuid

from celery import Task, signals
from django.conf import settings
from logging.config import dictConfig

from .observability import request_id_context, safe_request_id, task_id_context

logger = logging.getLogger('social_stats.tasks.lifecycle')


def correlation_headers(headers=None):
    headers = dict(headers or {})
    headers['request_id'] = (
        safe_request_id(request_id_context.get())
        or safe_request_id(headers.get('request_id'))
        or uuid.uuid4().hex
    )
    return headers


class CorrelatedTask(Task):
    def apply_async(self, args=None, kwargs=None, **options):
        # Unlike before_task_publish, this also runs for eager/dev execution.
        options['headers'] = correlation_headers(options.get('headers'))
        return super().apply_async(args=args, kwargs=kwargs, **options)


@signals.before_task_publish.connect
def propagate_request_id(headers=None, **kwargs):
    # Covers send_task and retry publication as well as normal .delay().
    if headers is not None:
        headers.update(correlation_headers(headers))


@signals.setup_logging.connect
def configure_worker_logging(**kwargs):
    # Prevent Celery replacing Django handlers with an unredacted formatter.
    dictConfig(settings.LOGGING)


@signals.task_prerun.connect
def task_started(task=None, task_id=None, **kwargs):
    headers = getattr(task.request, 'headers', None) or {}
    request_token = request_id_context.set(
        safe_request_id(headers.get('request_id')) or uuid.uuid4().hex
    )
    task_token = task_id_context.set(task_id)
    # Keep tokens on the per-execution request, never on the shared Task object.
    task.request.log_context_tokens = (request_token, task_token)
    logger.info('task_started', extra={'task_name': task.name})


@signals.task_postrun.connect
def task_finished(task=None, state=None, **kwargs):
    try:
        logger.info('task_finished', extra={'task_name': task.name, 'task_state': state})
    finally:
        tokens = getattr(task.request, 'log_context_tokens', None)
        if tokens:
            request_id_context.reset(tokens[0])
            task_id_context.reset(tokens[1])


@signals.task_failure.connect
def task_failed(sender=None, exception=None, **kwargs):
    logger.error('task_failed', extra={
        'task_name': sender.name, 'error_type': type(exception).__name__,
        'error': str(exception),
    })
