"""Django email backend using the shared, allowlisted HTTP egress router."""
import base64
import uuid

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.mail.backends.base import BaseEmailBackend

from social_stats.egress.router import outbound_request


class EmailDeliveryError(RuntimeError):
    """Provider rejection without exposing credentials or email contents."""


class ResendEmailBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        sent = 0
        for message in email_messages or []:
            if not message.recipients():
                continue
            try:
                self._send(message)
                sent += 1
            except Exception:
                if not self.fail_silently:
                    raise
        return sent

    def _send(self, message):
        api_key = settings.RESEND_API_KEY
        if not api_key:
            raise ImproperlyConfigured('RESEND_API_KEY is required for EMAIL_PROVIDER=resend')
        # Validate sender and recipient headers using Django's normal mail rules.
        message.message()
        payload = {
            'from': message.from_email,
            'to': message.to,
            'subject': message.subject,
        }
        payload['html' if message.content_subtype == 'html' else 'text'] = message.body
        for alternative in getattr(message, 'alternatives', []):
            content, mimetype = alternative
            if mimetype == 'text/html':
                payload['html'] = content
        for field in ('cc', 'bcc', 'reply_to'):
            value = getattr(message, field, None)
            if value:
                payload[field] = value
        if message.extra_headers:
            payload['headers'] = {
                key: value for key, value in message.extra_headers.items()
                if key.lower() != 'idempotency-key'
            }
        attachments = []
        for attachment in message.attachments:
            if not isinstance(attachment, tuple) or len(attachment) != 3:
                raise ValueError('Resend supports filename/content/mimetype attachments')
            filename, content, _ = attachment
            if isinstance(content, str):
                content = content.encode('utf-8')
            attachments.append({'filename': filename, 'content': base64.b64encode(content).decode('ascii')})
        if attachments:
            payload['attachments'] = attachments
        # Reusing this message after a timeout retains the same provider key.
        key = next((value for name, value in message.extra_headers.items()
                    if name.lower() == 'idempotency-key'), None)
        if not key:
            key = getattr(message, '_resend_idempotency_key', None) or str(uuid.uuid4())
            message._resend_idempotency_key = key
        response = outbound_request(
            'resend', 'POST', 'https://api.resend.com/emails',
            headers={'Authorization': f'Bearer {api_key}', 'Idempotency-Key': key},
            json=payload, timeout=settings.EMAIL_TIMEOUT, allow_redirects=False,
        )
        if not 200 <= response.status_code < 300:
            raise EmailDeliveryError(f'Email provider rejected request (HTTP {response.status_code})')
        result = response.json()
        if not isinstance(result, dict) or not result.get('id'):
            raise EmailDeliveryError('Email provider returned no delivery identifier')
        message.resend_email_id = result['id']
