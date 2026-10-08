"""Exact historical fixture identity reconciliation, never suffix/name matching."""
from unittest.mock import patch
from django.test import TestCase
from social_stats.models import Client, SocialAccount, PlatformCredential, TelegramIntegration, Organization
from social_stats.platforms.base import ConnectionResult, ProviderError
from social_stats.platforms.connection_service import ConnectionService
from social_stats.platforms.registry import get_provider


class TelegramLegacyReconnect(TestCase):
    def setUp(self):
        organization = Organization.objects.create(name='Public quota fixture')
        self.workspace = Client.objects.create(name='Public workspace', company='Fixture', email='reconnect@example.test', organization=organization)
        self.account = SocialAccount.objects.create(client=self.workspace, platform='telegram', external_id='123:-100')
        self.credential = PlatformCredential.objects.create(client=self.workspace, platform='telegram', social_account=self.account,
                                                          platform_user_id='-100', access_token='public-fixture-old')
        self.integration = TelegramIntegration.objects.create(account=self.account, rich_enabled=True)
        self.result = ConnectionResult(True, account_id='123', account_name='Public bot', destination_id='-100', destination_type='channel',
                                       access_token='public-fixture-new', data={'destination':{'chat_id':-100,'name':'Public channel','type':'channel'}})
        self.provider = get_provider('telegram')

    def connect(self, **kwargs):
        with patch.object(type(self.provider), 'connect', return_value=self.result):
            return ConnectionService().connect(self.workspace, 'telegram', {}, **kwargs)

    def test_exact_reconnect_preserves_account_credential_settings_and_is_idempotent(self):
        credential, _ = self.connect(social_account_id=self.account.pk)
        self.assertEqual(credential.pk, self.credential.pk)
        self.assertEqual(credential.social_account_id, self.account.pk)
        self.account.refresh_from_db()
        self.assertEqual(self.account.external_id, '-100')
        self.integration.refresh_from_db()
        self.assertTrue(self.integration.rich_enabled)
        again, _ = self.connect(social_account_id=self.account.pk)
        self.assertEqual(again.pk, credential.pk)
        self.assertEqual(SocialAccount.objects.filter(client=self.workspace).count(), 1)
        self.assertEqual(PlatformCredential.objects.filter(client=self.workspace).count(), 1)

    def test_untargeted_connection_requires_selection_instead_of_creating_duplicate(self):
        with self.assertRaises(ProviderError):
            self.connect()
        self.assertEqual(SocialAccount.objects.filter(client=self.workspace).count(), 1)

    def test_wrong_bot_chat_missing_credential_or_canonical_collision_is_not_overwritten(self):
        for bot in ['124', '', '123']:
            with self.subTest(bot=bool(bot)):
                self.result.account_id = bot
                if bot == '123':
                    self.result.data['destination']['chat_id'] = -101
                with self.assertRaises(ProviderError):
                    self.connect(social_account_id=self.account.pk)
        self.result.account_id = '123'
        self.result.data['destination']['chat_id'] = -100
        collision = SocialAccount.objects.create(client=self.workspace, platform='telegram', external_id='-100')
        with self.assertRaises(ProviderError):
            self.connect(social_account_id=self.account.pk)
        collision.delete()
        self.credential.delete()
        with self.assertRaises(ProviderError):
            self.connect(social_account_id=self.account.pk)
        self.account.refresh_from_db()
        self.assertEqual(self.account.external_id, '123:-100')

    def test_permission_check_uses_selected_legacy_account(self):
        seen = []
        def deny(account):
            seen.append(account.pk if account else None)
            return False
        with self.assertRaises(ProviderError):
            self.connect(social_account_id=self.account.pk, authorize_account=deny)
        self.assertEqual(seen, [self.account.pk])
        self.credential.refresh_from_db()
        self.assertEqual(self.credential.access_token, 'public-fixture-old')

    def test_extension_failure_rolls_back_identity_and_credential(self):
        with patch.object(type(self.provider), 'connected', side_effect=RuntimeError('Public fixture extension failure')):
            with self.assertRaises(RuntimeError):
                self.connect(social_account_id=self.account.pk)
        self.account.refresh_from_db()
        self.credential.refresh_from_db()
        self.assertEqual(self.account.external_id, '123:-100')
        self.assertEqual(self.credential.access_token, 'public-fixture-old')

    def test_wrong_scope_and_malformed_verified_identity_never_reconcile(self):
        foreign = Client.objects.create(name='Other public fixture', company='Other', email='other-reconnect@example.test')
        with patch.object(type(self.provider), 'connect') as connect:
            with self.assertRaises(ProviderError):
                ConnectionService().connect(foreign, 'telegram', {}, social_account_id=self.account.pk)
            connect.assert_not_called()
        for value in [None, True, 0, '-100', {}]:
            self.result.data['destination']['chat_id'] = value
            with self.assertRaises(ProviderError):
                self.connect(social_account_id=self.account.pk)
        self.credential.refresh_from_db()
        self.assertEqual(self.credential.access_token, 'public-fixture-old')

    def test_reconnect_preserves_quota_and_inactive_reactivation_is_checked(self):
        from social_stats.entitlements import EntitlementDenied, subscription_for
        subscription = subscription_for(self.workspace.organization)
        subscription.plan = 'org-free'
        subscription.save()
        for number in range(2):
            SocialAccount.objects.create(client=self.workspace, platform='telegram', external_id=f'public-other-{number}')
        credential, _ = self.connect(social_account_id=self.account.pk)
        self.assertEqual(credential.pk, self.credential.pk)
        self.account.refresh_from_db()
        self.account.external_id = '123:-100'
        self.account.is_active = False
        self.account.save()
        SocialAccount.objects.create(client=self.workspace, platform='telegram', external_id='public-other-2')
        with self.assertRaises(EntitlementDenied):
            self.connect(social_account_id=self.account.pk)
        self.account.refresh_from_db()
        self.assertFalse(self.account.is_active)
        self.assertEqual(self.account.external_id, '123:-100')

    def test_attached_canonical_reconnect_ignores_ambiguous_unattached_credentials(self):
        self.account.external_id = '-100'
        self.account.save()
        for _ in range(2):
            PlatformCredential.objects.create(client=self.workspace, platform='telegram', platform_user_id='-100', access_token='public-fixture-unattached')
        credential, _ = self.connect(social_account_id=self.account.pk)
        self.assertEqual(credential.pk, self.credential.pk)
        self.assertEqual(PlatformCredential.objects.filter(social_account__isnull=True).count(), 2)

    def test_account_disappearing_during_provider_validation_is_typed_scope_denial(self):
        def validated(*args, **kwargs):
            self.account.delete()
            return self.result
        account_id = self.account.pk
        with patch.object(type(self.provider), 'connect', side_effect=validated):
            with self.assertRaises(ProviderError) as failure:
                ConnectionService().connect(self.workspace, 'telegram', {}, social_account_id=account_id)
        self.assertEqual(failure.exception.code, 'scope_denied')
        self.assertFalse(SocialAccount.objects.filter(client=self.workspace).exists())
