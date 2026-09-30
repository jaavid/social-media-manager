"""Authentication and tenant-isolation coverage for alerts/notifications."""
import uuid

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from social_stats.models import Alert, Client, Notification, UserProfile


class AlertAccessTests(TestCase):
    def setUp(self):
        self.own_client = Client.objects.create(
            name='Own', company='Own', email=f'own-{uuid.uuid4().hex}@test.invalid')
        self.other_client = Client.objects.create(
            name='Other', company='Other', email=f'other-{uuid.uuid4().hex}@test.invalid')
        self.user = User.objects.create_user('alert-user', password='test')
        self.other_user = User.objects.create_user('other-user', password='test')
        UserProfile.objects.create(user=self.user, role='client', client=self.own_client)
        UserProfile.objects.create(user=self.other_user, role='client', client=self.other_client)
        self.own_alert = Alert.objects.create(
            client=self.own_client, alert_type='sync_failed', message='mine')
        Alert.objects.create(
            client=self.other_client, alert_type='sync_failed', message='not mine')
        self.own_notification = Notification.objects.create(
            user=self.user, client=self.own_client, title='mine')
        Notification.objects.create(
            user=self.other_user, client=self.other_client, title='not mine')

    def test_anonymous_alerts_are_unauthorized(self):
        api = APIClient()
        self.assertEqual(api.get('/api/alerts/').status_code, 401)
        self.assertEqual(api.get('/api/notifications/').status_code, 401)

    def test_authenticated_user_only_receives_own_notifications(self):
        api = APIClient()
        api.force_authenticate(self.user)
        response = api.get('/api/notifications/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row['id'] for row in response.data], [self.own_notification.id])

    def test_client_user_only_receives_alerts_for_own_client(self):
        api = APIClient()
        api.force_authenticate(self.user)
        response = api.get(f'/api/alerts/?client={self.other_client.id}')
        rows = response.data.get('results', response.data)
        self.assertEqual(rows, [])

        response = api.get('/api/alerts/')
        rows = response.data.get('results', response.data)
        self.assertEqual([row['id'] for row in rows], [self.own_alert.id])
