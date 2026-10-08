"""Authorization/query growth contract; no decisions or provider calls."""
from django.contrib.auth.models import User
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient
from social_stats.models import Client, SocialAccount, UserProfile, Conversation, TelegramSuggestion, SocialAccountPermissionOverride


class SuggestionQueryBoundary(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('public-query-fixture')
        self.workspace = Client.objects.create(name='Public fixture', company='Fixture', email='fixture@example.test')
        UserProfile.objects.create(user=self.user, role='client', client=self.workspace)
        self.account = SocialAccount.objects.create(client=self.workspace, platform='telegram', external_id='public-fixture')
        self.conversation = Conversation.objects.create(client=self.workspace, platform='telegram', social_account=self.account, platform_thread_id='public-fixture')
        self.api = APIClient()
        self.api.force_authenticate(self.user)

    def create_row(self, number):
        return TelegramSuggestion.objects.create(client=self.workspace, account=self.account, conversation=self.conversation, message_id=number)

    def read(self):
        with CaptureQueriesContext(connection) as queries:
            response = self.api.get('/api/telegram-suggestions/', {'account': self.account.pk})
            self.assertEqual(response.status_code, 200)
        return len(queries), response.data.get('results', response.data) if isinstance(response.data, dict) else response.data

    def test_query_count_does_not_grow_per_suggestion_and_scope_is_not_bypassed(self):
        self.create_row(1)
        one, rows = self.read()
        self.assertEqual(len(rows), 1)
        for number in range(2, 21):
            self.create_row(number)
        many, rows = self.read()
        self.assertEqual(len(rows), 20)
        self.assertLessEqual(many, one + 1)
        other = Client.objects.create(name='Other fixture', company='Other', email='other@example.test')
        foreign = SocialAccount.objects.create(client=other, platform='telegram', external_id='foreign-fixture')
        TelegramSuggestion.objects.create(client=other, account=foreign, conversation=self.conversation, message_id=30)
        # A malformed row must not bridge a visible workspace to another account.
        TelegramSuggestion.objects.create(client=self.workspace, account=foreign, conversation=self.conversation, message_id=31)
        _, rows = self.read()
        self.assertEqual({row['account'] for row in rows}, {self.account.pk})
        response = self.api.get('/api/telegram-suggestions/', {'account': foreign.pk})
        data = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        self.assertEqual(data, [])

    def test_account_permission_override_denies_rows_without_weakening_workspace_scope(self):
        self.create_row(1)
        SocialAccountPermissionOverride.objects.create(user=self.user, account=self.account, permissions={'view_inbox': False})
        _, rows = self.read()
        self.assertEqual(rows, [])
