from django.test import TestCase

from social_stats.models import Client, PlatformCredential, SocialAccount
from social_stats.oauth_views import _save_credential


class MultiAccountCredentialTests(TestCase):
    def setUp(self):
        self.workspace = Client.objects.create(
            name='Workspace', company='Workspace', email='workspace@example.com',
        )

    def test_oauth_upserts_by_workspace_platform_and_external_id(self):
        _save_credential(self.workspace.pk, 'youtube', {
            'channel_id': 'channel-a', 'channel_name': 'First', 'access_token': 'token-a',
        })
        _save_credential(self.workspace.pk, 'youtube', {
            'channel_id': 'channel-b', 'channel_name': 'Second', 'access_token': 'token-b',
        })

        self.assertEqual(SocialAccount.objects.count(), 2)
        self.assertEqual(PlatformCredential.objects.count(), 2)
        self.assertSetEqual(
            set(SocialAccount.objects.values_list('external_id', flat=True)),
            {'channel-a', 'channel-b'},
        )

    def test_reconnect_updates_only_matching_account(self):
        for token in ('old-a', 'old-b'):
            suffix = token[-1]
            _save_credential(self.workspace.pk, 'youtube', {
                'channel_id': f'channel-{suffix}', 'access_token': token,
            })
        _save_credential(self.workspace.pk, 'youtube', {
            'channel_id': 'channel-a', 'channel_name': 'Renamed', 'access_token': 'new-a',
        })

        first = PlatformCredential.objects.get(social_account__external_id='channel-a')
        second = PlatformCredential.objects.get(social_account__external_id='channel-b')
        self.assertEqual(first.access_token, 'new-a')
        self.assertEqual(first.social_account.display_name, 'Renamed')
        self.assertEqual(second.access_token, 'old-b')

    def test_public_identity_never_contains_tokens(self):
        fields = {field.name for field in SocialAccount._meta.fields}
        self.assertNotIn('access_token', fields)
        self.assertNotIn('refresh_token', fields)
