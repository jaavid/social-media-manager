"""Deletion reconciliation is account-owned and read-only; no real account deletion."""
from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from social_stats.security.privacy_models import AccountDeletionRequest


class DeletionStatusTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('privacy-fixture', email='privacy@example.test')
        self.other = User.objects.create_user('other-fixture', email='other@example.test')
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.url = '/api/privacy/delete-account/'

    def row(self, user, status='queued'):
        return AccountDeletionRequest.objects.create(
            user=user, user_email_at_request=user.email, status=status,
            grace_until=timezone.now() + timedelta(days=30),
        )

    def test_empty_is_explicit_and_never_reads_another_account(self):
        self.row(self.other)
        response = self.client.get(self.url, {'user_id': self.other.id})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {'request': None})
        self.assertEqual(AccountDeletionRequest.objects.count(), 1)

    def test_latest_request_and_cancelled_state_are_authoritative(self):
        old = self.row(self.user)
        old.status = 'cancelled'
        old.cancelled_at = timezone.now()
        old.save()
        response = self.client.get(self.url)
        self.assertEqual(response.data['request']['status'], 'cancelled')
        queued = self.row(self.user)
        self.assertEqual(self.client.get(self.url).data['request']['id'], queued.id)
        # Existing idempotent POST returns the queued request rather than creating another.
        self.assertEqual(self.client.post(self.url, {'reason': 'fixture'}).data['id'], queued.id)
        self.assertEqual(AccountDeletionRequest.objects.filter(user=self.user).count(), 2)
        response = self.client.post(self.url + 'cancel/')
        self.assertEqual(response.data['status'], 'cancelled')
        self.assertEqual(self.client.get(self.url).data['request']['status'], 'cancelled')

    def test_anonymous_read_is_denied(self):
        self.client.force_authenticate(None)
        self.assertIn(self.client.get(self.url).status_code, (401, 403))
