from datetime import date
from unittest.mock import patch, Mock
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from social_stats.models import Client, SocialAccount, DailyMetric, PlatformCredential, UserProfile, SyncLog
from social_stats.tasks import _analytics_json, sync_youtube


class AnalyticsReportContractTests(TestCase):
    def setUp(self):
        self.workspace = Client.objects.create(name='Analytics', email='analytics@example.test')
        self.account = SocialAccount.objects.create(client=self.workspace, platform='youtube', external_id='channel')
        self.credential = PlatformCredential.objects.create(client=self.workspace, social_account=self.account,
            platform='youtube', channel_id='channel', access_token='private-test-token')
        self.user = User.objects.create_superuser('report-admin', password='test')
        UserProfile.objects.create(user=self.user, role='superadmin')
        self.api = APIClient(); self.api.force_authenticate(self.user)
        self.url = f'/api/workspaces/{self.workspace.pk}/analytics_report/'
        self.params = {'social_account': self.account.pk, 'since': '2026-10-01', 'until': '2026-10-06'}

    def test_zero_missing_and_historical_unknown_are_distinct(self):
        DailyMetric.objects.create(client=self.workspace, social_account=self.account, platform='youtube',
            date=date(2026,10,1), provider_metrics={'views': 0})
        DailyMetric.objects.create(client=self.workspace, social_account=self.account, platform='youtube',
            date=date(2026,10,2), video_views=999)
        response = self.api.get(self.url, self.params)
        self.assertEqual(response.status_code, 200, response.content)
        rows = response.data['rows']
        self.assertEqual(rows[0]['values']['views'], 0)
        self.assertIsNone(rows[0]['values']['likes'])
        self.assertEqual(rows[0]['state'], 'partial')
        self.assertIsNone(rows[1]['values']['views'])
        self.assertEqual(rows[1]['state'], 'unknown')
        self.assertNotIn('private-test-token', str(response.data))

    def test_scope_range_export_and_unavailable(self):
        other = SocialAccount.objects.create(client=self.workspace, platform='youtube', external_id='other')
        for account, day in [(self.account,1),(other,2),(self.account,9)]:
            DailyMetric.objects.create(client=self.workspace, social_account=account, platform='youtube',
                date=date(2026,10,day), provider_metrics={'views': 0})
        response=self.api.get(self.url,{**self.params,'export':'csv'})
        self.assertEqual(response.status_code,200,response.content)
        self.assertEqual(len(response.content.decode().splitlines()),2)
        response=self.api.get(self.url,{**self.params,'since':'2026-09-01','until':'2026-09-02'})
        self.assertEqual(response.data['pagination']['count'],0)
        self.assertEqual(response.data['dataset_count'],2)
        foreign = Client.objects.create(name='Foreign', email='foreign@example.test')
        outsider = SocialAccount.objects.create(client=foreign, platform='youtube',external_id='secret')
        self.assertEqual(self.api.get(self.url,{**self.params,'social_account':outsider.pk}).status_code,404)
        self.account.platform='telegram'; self.account.save()
        response=self.api.get(self.url,self.params)
        self.assertEqual(response.data['availability'],'unavailable')
        self.assertEqual(response.data['rows'],[])
        self.assertEqual(response.data['metrics'],[])

    def test_invalid_data_is_failure_not_empty(self):
        row=DailyMetric.objects.create(client=self.workspace,social_account=self.account,platform='youtube',
            date=date(2026,10,1),provider_metrics={'views':'private-test-token'})
        self.assertEqual(self.api.get(self.url,self.params).status_code,502)
        row.provider_metrics={}; row.save()
        self.assertEqual(self.api.get(self.url,{**self.params,'page':0}).status_code,400)

    def test_remote_failure_is_sanitized_and_never_success(self):
        response=Mock(); response.raise_for_status.side_effect=RuntimeError('https://secret?token=private-test-token')
        with self.assertRaisesRegex(RuntimeError,'unavailable'): _analytics_json(response)
        response.raise_for_status.side_effect=None; response.json.return_value=[]
        with self.assertRaises(RuntimeError): _analytics_json(response)
        response.json.return_value={'error':{'message':'private-test-token'}}
        with self.assertRaises(RuntimeError): _analytics_json(response)
        with patch('social_stats.tasks.requests.get',return_value=response), patch.object(sync_youtube,'retry',side_effect=RuntimeError('retry')):
            with self.assertRaises(RuntimeError): sync_youtube.run(self.workspace.pk,credential_id=self.credential.pk)
        log=SyncLog.objects.latest('pk')
        self.assertEqual(log.status,'failed')
        self.assertNotIn('private-test-token',log.error_message)
        self.assertFalse(DailyMetric.objects.exists())

from social_stats.tests.test_provider_conformance import FixtureRegistration
from social_stats.tasks import sync_provider_account


class GenericAnalyticsFixtureTests(FixtureRegistration, TestCase):
    def setUp(self):
        super().setUp()
        AnalyticsReportContractTests.setUp(self)
        self.account.platform = 'contract_example'; self.account.save()
        self.credential.platform = 'contract_example'; self.credential.save()

    def test_generic_sync_without_product_source_edits(self):
        sync_provider_account.run(self.workspace.pk,self.credential.pk,self.user.pk)
        row=DailyMetric.objects.get(social_account=self.account)
        self.assertEqual(row.provider_metrics,{'views':1})
        self.assertEqual(SyncLog.objects.latest('pk').status,'success')
        response=self.api.get(self.url,{**self.params,'since':date.today().isoformat(),'until':date.today().isoformat()})
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.data['metrics'][0]['key'],'views')
        self.assertEqual(response.data['rows'][0]['values']['views'],1)

    def test_revoked_actor_cannot_start_sync(self):
        self.user.is_active=False;self.user.save()
        sync_provider_account.run(self.workspace.pk,self.credential.pk,self.user.pk)
        self.assertFalse(SyncLog.objects.exists())
