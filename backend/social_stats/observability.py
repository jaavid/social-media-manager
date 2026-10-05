"""Production log policy and context shared by HTTP requests and Celery tasks."""
from __future__ import annotations

from contextvars import ContextVar
from datetime import datetime, timezone
import json
import logging
import re

request_id_context = ContextVar('request_id', default=None)
task_id_context = ContextVar('task_id', default=None)
REDACTED = '[REDACTED]'
_ID = re.compile(r'[A-Za-z0-9_-]{1,64}\Z')
# Field names are case/punctuation insensitive, including provider-specific names.
_SECRET_KEY = re.compile(
    r'password|passwd|secret|token|authorization|cookie|apikey|privatekey|'
    r'credential|signature|encryptionkey|gatewaykey|^sessionid$|^sessionkey$|'
    r'^code$|^state$|^query$|^querystring$|^args$|^kwargs$'
)
_URL = re.compile(r'\b(?:https?|wss?|redis|rediss|postgres(?:ql)?|amqp)s?://[^\s<>\"\']+', re.I)
_PAIR = re.compile(
    r'(?P<key>[\w-]*(?:password|passwd|secret|token|authorization|cookie|api[_-]?key|'
    r'private[_-]?key|encryption[_-]?key|gateway[_-]?key|credential|signature)[\w-]*|'
    r'session[_-]?(?:id|key)|code|state|query[_-]?string|query)'
    r'(?P<sep>[\"\']?\s*[:=]\s*)(?P<value>\"[^\"]*\"|\'[^\']*\'|[^\s,;&}\]]+)',
    re.I,
)
_AUTH = re.compile(r'\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+', re.I)
# Token shapes used by providers even when an exception omits the field name.
_TOKEN = re.compile(r'\b(?:sk-(?:proj-|ant-)?[A-Za-z0-9_-]{8,}|'
                    r'(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{8,}|'
                    r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b')


def safe_request_id(value):
    return value if isinstance(value, str) and _ID.fullmatch(value) else None


def _safe_url(match):
    value = match.group(0)
    # Remove ALL URL queries/fragments, including unrecognized OAuth/provider fields.
    value = re.split(r'[?#]', value, maxsplit=1)[0]
    value = re.sub(r'(://)[^/]*@', r'\1[REDACTED]@', value)
    return re.sub(r'/bot[0-9]+:[A-Za-z0-9_-]+', '/bot[REDACTED]', value)


def redact_text(value):
    value = _URL.sub(_safe_url, str(value))
    # Also covers relative request targets printed by Django error logs.
    value = re.sub(r'(/[^\s?\"\']*)\?[^\s\"\']*', r'\1?[REDACTED]', value)
    # Unquoted Cookie headers can contain multiple semicolon-separated values.
    value = re.sub(r'\b(?:Cookie|Set-Cookie)\s*[:=]\s*(?![\"\'])[^\r\n]+',
                   lambda m: m.group(0).split(':', 1)[0].split('=', 1)[0] + ': ' + REDACTED,
                   value, flags=re.I)
    value = _AUTH.sub(lambda m: f'{m.group(1)} {REDACTED}', value)
    value = _PAIR.sub(lambda m: f'{m.group("key")}{m.group("sep")}{REDACTED}', value)
    return _TOKEN.sub(REDACTED, value)


def redact(value):
    if isinstance(value, dict):
        return {
            str(key): REDACTED if _SECRET_KEY.search(re.sub(r'[^a-z0-9]', '', str(key).lower()))
            else redact(item)
            for key, item in value.items()
        }
    if isinstance(value, (list, tuple)):
        return [redact(item) for item in value]
    if value is None or isinstance(value, (bool, int, float)):
        return value
    return redact_text(value)


_STANDARD_FIELDS = frozenset(logging.makeLogRecord({}).__dict__) | {'message', 'asctime'}


class ProductionJSONFormatter(logging.Formatter):
    """Redact at the output boundary, including exceptions and third-party extras.

    Never serialize Django's raw request object (headers, body, cookies) or
    traceback locals. Preserve stack frames, error type and safe diagnostic text.
    """

    def format(self, record):
        try:
            return self._format_event(record)
        except Exception:
            # Logging.handleError otherwise prints the raw message/arguments to
            # stderr when malformed extras (cycles, NaN, bad __str__) break JSON.
            # Fail closed without sending that unredacted fallback to production.
            return json.dumps({
                'level': 'ERROR', 'logger': 'social_stats.observability',
                'message': 'log_formatting_failed',
            })

    def _format_event(self, record):
        event = {
            'timestamp': datetime.fromtimestamp(record.created, timezone.utc).isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'request_id': (safe_request_id(request_id_context.get())
                           or safe_request_id(getattr(getattr(record, 'request', None), 'id', None))),
            'task_id': task_id_context.get(),
        }
        extras = {
            key: value for key, value in record.__dict__.items()
            if key not in _STANDARD_FIELDS and key not in {'request', 'request_id', 'task_id'}
        }
        if extras:
            event['fields'] = extras
        if record.exc_info:
            event['exception'] = self.formatException(record.exc_info)
        if record.stack_info:
            event['stack'] = record.stack_info
        return json.dumps(redact(event), ensure_ascii=True, allow_nan=False)
