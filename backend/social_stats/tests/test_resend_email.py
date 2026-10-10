"""Resend transport preserves routing, secrets, payloads and failure semantics."""
from unittest.mock import Mock, patch
import requests
from django.core.mail import EmailMultiAlternatives
from django.test import SimpleTestCase, override_settings
from social_stats.mail.resend import ResendEmailBackend, EmailDeliveryError


@override_settings(RESEND_API_KEY='test-provider-key', EMAIL_TIMEOUT=12)
class ResendEmailTests(SimpleTestCase):
    def message(self):
        message = EmailMultiAlternatives('دعوت', 'متن', 'Ravinta <mail@example.com>', ['person@example.com'],
                                         cc=['cc@example.com'], bcc=['bcc@example.com'], reply_to=['reply@example.com'])
        message.attach_alternative('<p>دعوت</p>', 'text/html')
        message.attach('design.txt', 'طرح', 'text/plain')
        return message

    @patch('social_stats.egress.router.requests.request')
    @patch.dict('os.environ', {'API_GATEWAY_URL': 'https://gateway.example.com',
                             'API_GATEWAY_KEY': 'test-gateway-key', 'OUTBOUND_RESEND_MODE': 'gateway'})
    def test_email_uses_gateway_and_preserves_provider_headers(self, request):
        request.return_value = Mock(status_code=200, json=Mock(return_value={'id': 'email-123'}))
        message = self.message()
        self.assertEqual(ResendEmailBackend().send_messages([message]), 1)
        kwargs = request.call_args.kwargs
        self.assertEqual(kwargs['url'], 'https://gateway.example.com/resend/emails')
        self.assertEqual(kwargs['headers']['Authorization'], 'Bearer test-provider-key')
        self.assertEqual(kwargs['headers']['X-API-Gateway-Key'], 'test-gateway-key')
        self.assertFalse(kwargs['allow_redirects'])
        self.assertEqual(kwargs['json']['html'], '<p>دعوت</p>')
        self.assertEqual(kwargs['json']['bcc'], ['bcc@example.com'])
        self.assertEqual(kwargs['json']['reply_to'], ['reply@example.com'])
        self.assertEqual(len(kwargs['json']['attachments']), 1)
        self.assertEqual(message.resend_email_id, 'email-123')

    @patch('social_stats.mail.resend.outbound_request')
    def test_ambiguous_failure_reuses_idempotency_key_and_never_replays(self, request):
        request.side_effect = [requests.ReadTimeout(), Mock(status_code=200, json=Mock(return_value={'id': 'ok'}))]
        message = self.message()
        backend = ResendEmailBackend()
        with self.assertRaises(requests.ReadTimeout):
            backend.send_messages([message])
        self.assertEqual(request.call_count, 1)
        backend.send_messages([message])
        self.assertEqual(request.call_args_list[0].kwargs['headers']['Idempotency-Key'],
                         request.call_args_list[1].kwargs['headers']['Idempotency-Key'])

    @patch('social_stats.mail.resend.outbound_request')
    def test_http_rejection_is_not_success_and_silent_send_returns_zero(self, request):
        request.return_value = Mock(status_code=429)
        with self.assertRaises(EmailDeliveryError):
            ResendEmailBackend().send_messages([self.message()])
        self.assertEqual(ResendEmailBackend(fail_silently=True).send_messages([self.message()]), 0)

    @patch('social_stats.egress.router.requests.request')
    @patch.dict('os.environ', {'API_GATEWAY_URL': '', 'OUTBOUND_RESEND_MODE': 'gateway'})
    def test_required_gateway_never_sends_direct(self, request):
        with self.assertRaises(RuntimeError):
            ResendEmailBackend().send_messages([self.message()])
        request.assert_not_called()
