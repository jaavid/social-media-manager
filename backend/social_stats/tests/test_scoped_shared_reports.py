from datetime import date
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from social_stats.models import (
    Client,
    SocialAccount,
    DailyMetric,
    SharedReport,
    UserProfile,
)


class ScopedSharedReportTests(TestCase):
    def setUp(self):
        self.workspace = Client.objects.create(
            name="Shared", company="Shared", email="shared@example.test"
        )
        self.actor = User.objects.create_superuser("share-owner", password="test")
        UserProfile.objects.create(user=self.actor, role="superadmin")
        self.account = SocialAccount.objects.create(
            client=self.workspace, platform="youtube", external_id="one"
        )
        self.other = SocialAccount.objects.create(
            client=self.workspace, platform="facebook", external_id="two"
        )
        self.api = APIClient()
        self.api.force_authenticate(self.actor)
        self.payload = {
            "client": self.workspace.pk,
            "date_from": "2026-10-01",
            "date_until": "2026-10-06",
            "platforms": [],
            "social_account_ids": [self.account.pk],
        }
        for account in [self.account, self.other]:
            DailyMetric.objects.create(
                client=self.workspace,
                social_account=account,
                platform=account.platform,
                date=date(2026, 10, 1),
                provider_metrics={"views": 0, "reach": 99},
            )

    def test_share_captures_account_scope_and_never_aggregates_unrelated_metrics(self):
        result = self.api.post("/api/shared-reports/", self.payload, format="json")
        self.assertEqual(result.status_code, 201, result.data)
        self.assertEqual(result.data["social_account_ids"], [self.account.pk])
        public = APIClient().get(f"/api/public/report/{result.data['token']}/")
        self.assertEqual(public.status_code, 200, public.content)
        self.assertEqual(public.data["version"], 2)
        self.assertNotIn("totals", public.data)
        self.assertEqual(len(public.data["reports"]), 1)
        self.assertEqual(public.data["reports"][0]["rows"][0]["values"]["views"], 0)
        self.assertEqual(public.data["reports"][0]["account_id"], self.account.pk)

    def test_foreign_account_and_inverted_dates_cannot_create_a_share(self):
        foreign = Client.objects.create(
            name="Foreign", email="foreignshare@example.test"
        )
        account = SocialAccount.objects.create(
            client=foreign, platform="youtube", external_id="private"
        )
        for extra in [
            {"social_account_ids": [account.pk]},
            {"date_from": "2026-10-09"},
        ]:
            response = self.api.post(
                "/api/shared-reports/", {**self.payload, **extra}, format="json"
            )
            self.assertEqual(response.status_code, 400, response.data)
        self.assertFalse(SharedReport.objects.exists())

    def test_legacy_unknown_scope_and_author_revocation_do_not_guess_private_data(self):
        shared = SharedReport.objects.create(
            client=self.workspace,
            created_by=self.actor,
            date_from=date(2026, 10, 1),
            date_until=date(2026, 10, 6),
        )
        path = f"/api/public/report/{shared.token}/"
        response = APIClient().get(path)
        self.assertEqual(response.data["availability"], "unavailable")
        self.assertEqual(response.data["reports"], [])
        shared.social_account_ids = [self.account.pk]
        shared.save()
        self.actor.is_active = False
        self.actor.save()
        self.assertEqual(APIClient().get(path).data["reports"], [])

    def test_password_gate_and_deactivation_preserve_confidentiality(self):
        created = self.api.post(
            "/api/shared-reports/",
            {**self.payload, "password": "private-password"},
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        path = f"/api/public/report/{created.data['token']}/"
        public = APIClient()
        self.assertTrue(public.get(path).data["requires_password"])
        self.assertNotIn("reports", public.get(path).data)
        self.assertEqual(
            public.post(
                path + "verify/", {"password": "wrong"}, format="json"
            ).status_code,
            401,
        )
        self.assertEqual(
            public.post(
                path + "verify/", {"password": "private-password"}, format="json"
            ).status_code,
            200,
        )
        self.api.delete(f"/api/shared-reports/{created.data['id']}/")
        self.assertEqual(public.get(path).status_code, 404)

    def test_view_permission_does_not_imply_export_or_sharing_permission(self):
        from social_stats.models import WorkspaceMemberPolicy

        viewer = User.objects.create_user("report-viewer", password="test")
        UserProfile.objects.create(user=viewer, role="client", client=self.workspace)
        WorkspaceMemberPolicy.objects.create(
            user=viewer,
            workspace=self.workspace,
            permissions={
                "view_analytics": True,
                "export_data": False,
                "generate_reports": False,
            },
        )
        self.api.force_authenticate(viewer)
        params = {
            "social_account": self.account.pk,
            "since": "2026-10-01",
            "until": "2026-10-06",
        }
        path = f"/api/workspaces/{self.workspace.pk}/analytics_report/"
        self.assertEqual(self.api.get(path, params).status_code, 200)
        self.assertEqual(
            self.api.get(path, {**params, "export": "csv"}).status_code, 403
        )
        self.assertEqual(
            self.api.post(
                "/api/shared-reports/", self.payload, format="json"
            ).status_code,
            403,
        )

    def test_report_token_list_obeys_account_permission_boundary(self):
        from social_stats.models import SocialAccountPermissionOverride

        viewer = User.objects.create_user("scoped-viewer", password="test")
        UserProfile.objects.create(user=viewer, role="client", client=self.workspace)
        SocialAccountPermissionOverride.objects.create(
            user=viewer, account=self.other, permissions={"view_analytics": False}
        )
        hidden = SharedReport.objects.create(
            client=self.workspace,
            created_by=self.actor,
            date_from=date(2026, 10, 1),
            date_until=date(2026, 10, 6),
            social_account_ids=[self.other.pk],
        )
        allowed = SharedReport.objects.create(
            client=self.workspace,
            created_by=self.actor,
            date_from=date(2026, 10, 1),
            date_until=date(2026, 10, 6),
            social_account_ids=[self.account.pk],
        )
        self.api.force_authenticate(viewer)
        response = self.api.get("/api/shared-reports/", {"client": self.workspace.pk})
        self.assertEqual(response.status_code, 200)
        self.assertNotIn(str(hidden.token), str(response.data))
        self.assertIn(str(allowed.token), str(response.data))
        self.assertEqual(
            self.api.delete(f"/api/shared-reports/{hidden.pk}/").status_code, 404
        )

    def test_authenticated_password_verification_uses_browser_csrf_contract(self):
        created = self.api.post(
            "/api/shared-reports/",
            {**self.payload, "password": "fixture-password"},
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        browser = APIClient(enforce_csrf_checks=True)
        browser.force_login(self.actor)
        path = f"/api/public/report/{created.data['token']}/verify/"
        self.assertEqual(
            browser.post(
                path, {"password": "fixture-password"}, format="json"
            ).status_code,
            403,
        )
        session = browser.get("/api/auth/session/")
        self.assertEqual(session.status_code, 200, session.content)
        verified = browser.post(
            path,
            {"password": "fixture-password"},
            format="json",
            HTTP_X_CSRFTOKEN=session.data["csrfToken"],
        )
        self.assertEqual(verified.status_code, 200, verified.content)
        self.assertEqual(verified.data["reports"][0]["account_id"], self.account.pk)
