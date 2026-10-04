"""Cookie WebSocket identity, Origin and revocation across the actual ASGI stack."""
import asyncio

from channels.db import database_sync_to_async
from channels.testing import WebsocketCommunicator
from django.contrib.auth.models import User
from django.test import TransactionTestCase, override_settings
from rest_framework.test import APIClient

from social_stats.models import Client, UserProfile
from social_stats.security.sessions import revoke_all_for_user


@override_settings(ALLOWED_HOSTS=['testserver'], CHANNEL_LAYERS={
    'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'},
})
class BrowserRealtimeTests(TransactionTestCase):
    def setUp(self):
        self.workspace = Client.objects.create(name='Cookie workspace', company='Example', email='workspace@example.invalid')
        self.user = User.objects.create_user(username='socket@example.invalid', password='StrongPass!234xyz')
        UserProfile.objects.create(user=self.user, role='client', client=self.workspace)
        client = APIClient()
        response = client.post('/api/auth/login/', {'username': self.user.username, 'password': 'StrongPass!234xyz', 'terms_accepted': True}, format='json', HTTP_X_BROWSER_SESSION='1')
        self.assertEqual(response.status_code, 200)
        self.cookie = f"sessionid={response.cookies['sessionid'].value}".encode()

    def communicator(self, origin):
        from dashboard.asgi import application
        headers = [(b'cookie', self.cookie)]
        if origin:
            headers.append((b'origin', origin.encode()))
        return WebsocketCommunicator(application, '/ws/realtime/', headers=headers)

    def test_cookie_connection_rejects_missing_and_untrusted_origin(self):
        async def run():
            for origin in [None, 'https://attacker.invalid']:
                connection = self.communicator(origin)
                connected, _ = await connection.connect()
                self.assertFalse(connected)
                await connection.disconnect()
        asyncio.run(run())

    def test_cookie_identity_receives_only_workspace_and_revocation_closes_socket(self):
        async def run():
            connection = self.communicator('http://testserver')
            connected, _ = await connection.connect()
            self.assertTrue(connected)
            ready = await connection.receive_json_from()
            self.assertEqual(ready['client_ids'], [self.workspace.id])
            await connection.send_json_to({'type': 'ping'})
            self.assertEqual((await connection.receive_json_from())['type'], 'pong')
            await database_sync_to_async(revoke_all_for_user)(self.user)
            await connection.send_json_to({'type': 'ping'})
            event = await connection.receive_output()
            self.assertEqual(event['type'], 'websocket.close')
            self.assertEqual(event['code'], 4401)
            await connection.disconnect()
        asyncio.run(run())
