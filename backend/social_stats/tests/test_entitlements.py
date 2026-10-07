"""Billing policy stays at the tenant boundary for all resource write paths."""
import unittest
from importlib import import_module
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.apps import apps
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError, connection, transaction
from django.test import TestCase
from rest_framework.test import APIClient

from social_stats.authorization import evaluate
from social_stats.billing_plans import ORG_FREE, get_plan
from social_stats.entitlements import (
    EntitlementDenied, month_key, reserve_ai, snapshot, subscription_for,
)
from social_stats.models import (
    Client, MediaAsset, Organization, OrganizationMembership, SocialAccount,
    Subscription,
)


class EntitlementTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user('billing-owner')
        self.workspace = Client.objects.create(
            name='One', company='One', email='one@billing.test', owner_user=self.owner,
        )
        self.org = self.workspace.organization
        self.sub = subscription_for(self.org)
        self.sub.plan = 'org-free'
        self.sub.save()
        self.api = APIClient()
        self.api.force_authenticate(self.owner)

    def test_default_preserves_self_hosted_and_unknown_plan_is_bounded(self):
        other = Organization.objects.create(name='Legacy')
        self.assertEqual(subscription_for(other).plan, 'self-hosted')
        self.assertIs(get_plan('unknown'), ORG_FREE)

    def test_workspace_limit_and_api_denial_without_partial_creation(self):
        before = Client.objects.count()
        response = self.api.post(f'/api/organizations/{self.org.pk}/workspaces/', {
            'name': 'Two', 'company': 'Two', 'email': 'two@billing.test',
        })
        self.assertEqual(response.status_code, 403)
        self.assertEqual(Client.objects.count(), before)
        self.assertEqual(response.data['code'], 'entitlement_limit_exceeded')
        self.sub.plan = 'org-pro'
        self.sub.save()
        Client.objects.create(organization=self.org, name='Two', email='two@billing.test')
        self.assertEqual(snapshot(self.org)['usage']['workspaces']['current'], 2)

    def test_members_owner_count_idempotency_and_reactivation(self):
        users = [User.objects.create_user(f'member-{i}') for i in range(3)]
        for user in users[:2]:
            OrganizationMembership.objects.create(organization=self.org, user=user)
        OrganizationMembership.objects.create(organization=self.org, user=self.owner)
        with self.assertRaises(EntitlementDenied):
            OrganizationMembership.objects.create(organization=self.org, user=users[2])
        row = OrganizationMembership.objects.get(user=users[0])
        row.save()
        row.is_active = False
        row.save()
        OrganizationMembership.objects.create(organization=self.org, user=users[2])
        row.is_active = True
        with self.assertRaises(EntitlementDenied):
            row.save()

    def test_accounts_aggregate_across_workspaces_and_reactivation(self):
        self.sub.plan = 'self-hosted'
        self.sub.save()
        sibling = Client.objects.create(organization=self.org, name='Sibling', email='sib@billing.test')
        self.sub.plan = 'org-free'
        self.sub.save()
        for i in range(3):
            SocialAccount.objects.create(client=sibling, platform='youtube', external_id=str(i))
        dormant = SocialAccount.objects.create(client=self.workspace, platform='youtube',
                                               external_id='dormant', is_active=False)
        dormant.is_active = True
        with self.assertRaises(EntitlementDenied):
            dormant.save()
        self.assertEqual(snapshot(self.org)['usage']['social_accounts']['current'], 3)
        other = Client.objects.create(name='Other', email='other@billing.test')
        SocialAccount.objects.create(client=other, platform='youtube', external_id='ok')

    def test_storage_quota_checks_before_files_are_written(self):
        MediaAsset.objects.create(client=self.workspace, file_size=1073741824)
        from social_stats.media_service import upload_media

        with patch('django.db.models.fields.files.FieldFile.save') as save:
            with self.assertRaises(EntitlementDenied):
                upload_media(SimpleUploadedFile('a.txt', b'x'), client_id=self.workspace.pk)
            save.assert_not_called()
        asset = MediaAsset.objects.get(client=self.workspace)
        asset.alt_text = 'Allowed metadata update'
        asset.save()
        asset.file_size += 1
        with self.assertRaises(EntitlementDenied):
            asset.save()
        asset.file_size = -1
        with self.assertRaises(EntitlementDenied):
            asset.save()

    def test_ai_reservation_blocks_provider_and_resets_calendar_period(self):
        self.sub.usage_counters = {'ai': {month_key(): 50}}
        self.sub.save()
        from social_stats.ai.client import AIClient
        from social_stats.ai.rate_limiter import RateLimited

        for method in ('complete', 'complete_stream', 'complete_vision'):
            ai = AIClient(client=self.workspace)
            sdk = Mock()
            with patch.object(ai, '_sdk_client', return_value=sdk), \
                 patch('social_stats.ai.client.rate_limiter.check'), \
                 patch('social_stats.ai.client.ai_cache.get', return_value=None):
                with self.assertRaises(RateLimited):
                    if method == 'complete_stream':
                        list(ai.complete_stream('hello'))
                    elif method == 'complete_vision':
                        ai.complete_vision('hello', 'aGVsbG8=')
                    else:
                        ai.complete('hello', use_cache=False)
                sdk.messages.create.assert_not_called()
                sdk.messages.stream.assert_not_called()
        self.sub.usage_counters = {'ai': {'2000-01': 500}}
        self.sub.save()
        reserve_ai(self.workspace)
        self.assertEqual(snapshot(self.org)['usage']['ai_generations_per_month']['current'], 1)

    def test_suspension_blocks_growth_and_capabilities_but_allows_cleanup(self):
        self.sub.status = 'past_due'
        self.sub.save()
        with self.assertRaises(EntitlementDenied):
            SocialAccount.objects.create(client=self.workspace, platform='youtube', external_id='no')
        self.workspace.name = 'Still editable'
        self.workspace.save()
        with self.assertRaises(EntitlementDenied):
            reserve_ai(self.workspace)
        self.assertFalse(evaluate(self.owner, self.workspace, 'generate_reports').allowed)

    def test_capability_gate_is_distinct_from_authorization(self):
        self.assertFalse(evaluate(self.owner, self.workspace, 'manage_automation').allowed)
        self.sub.plan = 'org-pro'
        self.sub.save()
        self.assertTrue(evaluate(self.owner, self.workspace, 'manage_automation').allowed)
        outsider = User.objects.create_user('outsider')
        self.assertFalse(evaluate(outsider, self.workspace, 'manage_automation').allowed)

    def test_effective_state_owner_only_and_tenant_isolated(self):
        url = f'/api/organizations/{self.org.pk}/entitlements/'
        self.assertEqual(self.api.get(url).status_code, 200)
        self.assertEqual(self.api.get(url).data['subscription']['plan'], 'org-free')
        member = User.objects.create_user('viewer')
        OrganizationMembership.objects.create(organization=self.org, user=member)
        self.api.force_authenticate(member)
        self.assertEqual(self.api.get(url).status_code, 403)
        self.api.force_authenticate(User.objects.create_user('unrelated'))
        self.assertEqual(self.api.get(url).status_code, 404)

    def test_legacy_ai_api_cannot_bypass_organization_quota(self):
        from social_stats.models import UserProfile
        UserProfile.objects.create(user=self.owner, role='client', client=self.workspace)
        self.sub.usage_counters = {'ai': {month_key(): 50}}
        self.sub.save()
        with patch('social_stats.views.ai.get_claude') as provider:
            response = self.api.post('/api/ai/compose-post/', {
                'topic': 'announcement', 'platforms': ['facebook'],
            }, format='json')
            self.assertEqual(response.status_code, 403)
            provider.return_value.messages.create.assert_not_called()

    def test_background_sentiment_denial_avoids_provider(self):
        from social_stats.sentiment import classify
        self.sub.usage_counters = {'ai': {month_key(): 50}}
        self.sub.save()
        with patch('social_stats.sentiment._get_client') as provider:
            self.assertEqual(classify('hello', workspace_id=self.workspace.pk), 'unknown')
            provider.return_value.messages.create.assert_not_called()

    def test_ai_capacity_is_shared_and_cache_hits_do_not_consume_it(self):
        self.sub.plan = 'self-hosted'
        self.sub.save()
        sibling = Client.objects.create(organization=self.org, name='Sibling', email='ai-sib@billing.test')
        self.sub.plan = 'org-free'
        self.sub.usage_counters = {'ai': {month_key(): 49}}
        self.sub.save()
        reserve_ai(sibling)
        with self.assertRaises(EntitlementDenied):
            reserve_ai(self.workspace)
        from social_stats.ai.client import AIClient
        with patch('social_stats.ai.client.rate_limiter.check'), \
             patch('social_stats.ai.client.ai_cache.get', return_value='cached'):
            self.assertEqual(AIClient(client=self.workspace).complete('hello'), 'cached')
        self.assertEqual(snapshot(self.org)['usage']['ai_generations_per_month']['current'], 50)

    def test_operator_assignment_and_platform_admin_query(self):
        from io import StringIO
        from django.core.management import call_command
        from social_stats.models import UserProfile

        call_command('assign_organization_plan', self.org.pk, 'org-pro', stdout=StringIO())
        self.sub.refresh_from_db()
        self.assertEqual(self.sub.plan, 'org-pro')
        admin = User.objects.create_user('platform-admin')
        UserProfile.objects.create(user=admin, role='superadmin')
        self.api.force_authenticate(admin)
        self.assertEqual(self.api.get(f'/api/organizations/{self.org.pk}/entitlements/').status_code, 200)

    def test_worker_rechecks_capability_after_plan_downgrade(self):
        from social_stats.automation_engine import _run_action
        from social_stats.models import AutomationRule

        with self.assertRaises(EntitlementDenied):
            AutomationRule.objects.create(client=self.workspace, name='Blocked',
                                           trigger_type='new_dm', action_type='notify')
        self.sub.plan = 'org-pro'
        self.sub.save()
        rule = AutomationRule.objects.create(client=self.workspace, name='Allowed',
                                              trigger_type='new_dm', action_type='notify')
        self.sub.plan = 'org-free'
        self.sub.save()
        handler = Mock()
        with patch.dict('social_stats.automation_engine.ACTION_HANDLERS', notify=handler):
            _run_action(rule, {})
        handler.assert_not_called()

    def test_subject_constraint_and_unique_organization(self):
        with transaction.atomic(), self.assertRaises(IntegrityError):
            Subscription.objects.create(organization=self.org)
        with transaction.atomic(), self.assertRaises(IntegrityError):
            Subscription.objects.create(organization=self.org, client=self.workspace)

    def test_backfill_transfers_single_history_and_defaults_conflicts(self):
        self.sub.delete()
        legacy = Subscription.objects.create(client=self.workspace, plan='eu-pro')
        other = Organization.objects.create(name='Conflicting')
        for i in range(2):
            workspace = Client.objects.create(organization=other, name=str(i), email=f'legacy{i}@billing.test')
            Subscription.objects.create(client=workspace, plan='eu-premium')
        Subscription.objects.filter(organization=other).delete()
        migration = import_module('social_stats.migrations.0082_organization_subscriptions')
        migration.backfill_organization_subscriptions(apps, SimpleNamespace(connection=connection))
        migration.backfill_organization_subscriptions(apps, SimpleNamespace(connection=connection))
        legacy.refresh_from_db()
        self.assertEqual(legacy.organization_id, self.org.pk)
        self.assertIsNone(legacy.client_id)
        self.assertEqual(legacy.plan, 'eu-pro')
        self.assertEqual(Subscription.objects.get(organization=other).plan, 'self-hosted')
        self.assertEqual(Subscription.objects.filter(client__organization=other).count(), 2)


class BillingMigrationTests(unittest.TestCase):
    """Use autocommit so a second connection can see the isolated test schema."""

    def test_real_schema_migration_keeps_invoice_and_ai_usage(self):
        """Reproduce PostgreSQL's old ordering failure, then verify safe upgrade."""
        import tempfile
        from pathlib import Path
        from django.db import connections
        from django.db.backends.sqlite3.base import DatabaseWrapper
        from django.db.migrations.executor import MigrationExecutor

        alias = 'billing_migration'
        with tempfile.TemporaryDirectory() as directory:
            primary = connections['default']
            config = primary.settings_dict.copy()
            schema = None
            if primary.vendor == 'postgresql':
                import uuid
                schema = 'billing_migration_' + uuid.uuid4().hex
                with primary.cursor() as cursor:
                    cursor.execute('CREATE SCHEMA ' + primary.ops.quote_name(schema))
                config['OPTIONS'] = {**config.get('OPTIONS', {}),
                                     'options': '-c search_path=' + schema}
                db = type(primary)(config, alias=alias)
            else:
                config.update(ENGINE='django.db.backends.sqlite3',
                              NAME=str(Path(directory) / 'billing.sqlite3'))
                db = DatabaseWrapper(config, alias=alias)
            connections[alias] = db
            try:
                executor = MigrationExecutor(db)
                state = executor.loader.project_state([('social_stats', '0081_shared_report_account_scope')])
                with db.schema_editor() as editor:
                    for app, model in (
                        ('contenttypes', 'ContentType'), ('auth', 'Permission'),
                        ('auth', 'Group'), ('auth', 'User'),
                        ('social_stats', 'Organization'), ('social_stats', 'Client'),
                        ('social_stats', 'Agency'), ('social_stats', 'Subscription'),
                        ('social_stats', 'Invoice'), ('social_stats', 'AIUsageLog'),
                    ):
                        editor.create_model(state.apps.get_model(app, model))
                org = state.apps.get_model('social_stats', 'Organization').objects.using(alias).create(name='Historical')
                unbilled = state.apps.get_model('social_stats', 'Organization').objects.using(alias).create(name='Needs default plan')
                workspace = state.apps.get_model('social_stats', 'Client').objects.using(alias).create(
                    organization_id=org.pk, name='Before', email='before@billing.test',
                )
                sub = state.apps.get_model('social_stats', 'Subscription').objects.using(alias).create(
                    client_id=workspace.pk, plan='eu-pro', gateway_customer_id='retained',
                )
                invoice = state.apps.get_model('social_stats', 'Invoice').objects.using(alias).create(
                    subscription_id=sub.pk, amount=12,
                )
                state.apps.get_model('social_stats', 'AIUsageLog').objects.using(alias).create(
                    client_id=workspace.pk, feature='caption', model='historical',
                )
                migration = executor.loader.get_migration('social_stats', '0082_organization_subscriptions')
                if primary.vendor == 'postgresql':
                    from django.db import OperationalError

                    broken = type(migration)(migration.name, migration.app_label)
                    broken.operations = [*migration.operations[:-2],
                                         migration.operations[-1], migration.operations[-2]]
                    with self.assertRaisesRegex(OperationalError, 'pending trigger events'):
                        executor.apply_migration(state.clone(), broken)
                    # The failed atomic upgrade must leave historical data intact.
                    original = state.apps.get_model('social_stats', 'Subscription').objects.using(alias).get(pk=sub.pk)
                    self.assertEqual(original.client_id, workspace.pk)
                state = executor.apply_migration(state, migration)
                migrated = state.apps.get_model('social_stats', 'Subscription').objects.using(alias).get(pk=sub.pk)
                self.assertEqual(migrated.organization_id, org.pk)
                self.assertIsNone(migrated.client_id)
                self.assertEqual(migrated.gateway_customer_id, 'retained')
                default_sub = state.apps.get_model('social_stats', 'Subscription').objects.using(alias).get(organization_id=unbilled.pk)
                self.assertEqual(default_sub.plan, 'self-hosted')
                self.assertEqual(migrated.usage_counters['ai'][month_key()], 1)
                saved_invoice = state.apps.get_model('social_stats', 'Invoice').objects.using(alias).get(pk=invoice.pk)
                self.assertEqual(saved_invoice.subscription_id, sub.pk)
            finally:
                db.close()
                del connections[alias]
                if schema:
                    with primary.cursor() as cursor:
                        cursor.execute('DROP SCHEMA ' + primary.ops.quote_name(schema) + ' CASCADE')
