"""Transport aliases must preserve authorization, data and old consumers."""

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse, resolve
from rest_framework.test import APIClient
from social_stats.models import Client, ClientGoal, UserProfile
from social_stats.views.core import CustomTokenSerializer
from social_stats.workspace_vocabulary import (
    add_workspace_output,
    normalize_workspace_input,
)
from rest_framework.exceptions import ParseError


class WorkspaceVocabularyTests(TestCase):
    def setUp(self):
        self.workspace = Client.objects.create(
            name="One", company="One", email="one@example.test"
        )
        self.other = Client.objects.create(
            name="Other", company="Other", email="other@example.test"
        )
        self.user = User.objects.create_user(username="member", password="test")
        UserProfile.objects.create(user=self.user, role="client", client=self.workspace)
        self.api = APIClient()
        self.api.force_authenticate(self.user)

    def test_resource_routes_have_identical_access_boundaries(self):
        for root in ("clients", "workspaces"):
            own = self.api.get(f"/api/{root}/{self.workspace.pk}/")
            self.assertEqual(own.status_code, 200)
            self.assertEqual(own.data["id"], self.workspace.pk)
            self.assertEqual(
                self.api.get(f"/api/{root}/{self.other.pk}/").status_code, 404
            )
            listed = self.api.get(f"/api/{root}/")
            self.assertEqual(
                [row["id"] for row in listed.data["results"]], [self.workspace.pk]
            )
        self.assertEqual(
            reverse("workspace-detail", args=[self.workspace.pk]),
            f"/api/workspaces/{self.workspace.pk}/",
        )

    def test_summary_and_user_responses_keep_both_names(self):
        summary = self.api.get(f"/api/workspaces/{self.workspace.pk}/summary/")
        self.assertEqual(summary.status_code, 200)
        self.assertEqual(summary.data["workspace"], summary.data["client"])
        me = self.api.get("/api/auth/me/")
        self.assertEqual(me.status_code, 200, me.content)
        self.assertEqual(me.data["workspace_id"], self.workspace.pk)
        self.assertEqual(me.data["client_id"], self.workspace.pk)
        self.assertEqual(me.data["role"], "client")
        token = CustomTokenSerializer.get_token(self.user)
        self.assertEqual(token["workspace_id"], token["client_id"])

    def _goal_payload(self, **extra):
        return {
            "platform": "youtube",
            "metric": "likes",
            "target_value": 100,
            "month": 10,
            "year": 2026,
            **extra,
        }

    def test_json_and_multipart_accept_canonical_fields_without_schema_rename(self):
        for encoding, month in (("json", 10), ("multipart", 11)):
            response = self.api.post(
                "/api/goals/",
                self._goal_payload(workspace=self.workspace.pk, month=month),
                format=encoding,
            )
            self.assertEqual(response.status_code, 201, response.content)
            self.assertEqual(response.data["workspace"], self.workspace.pk)
            self.assertEqual(response.data["client"], self.workspace.pk)
        self.assertEqual(ClientGoal.objects.filter(client=self.workspace).count(), 2)
        self.assertEqual(Client._meta.db_table, "social_stats_client")
        self.assertEqual(ClientGoal._meta.get_field("client").column, "client_id")

    def test_legacy_writes_and_canonical_query_filters_still_work(self):
        response = self.api.post(
            "/api/goals/", self._goal_payload(client=self.workspace.pk), format="json"
        )
        self.assertEqual(response.status_code, 201, response.content)
        rows = self.api.get("/api/goals/", {"workspace": self.workspace.pk}).data[
            "results"
        ]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["workspace"], self.workspace.pk)
        counts = self.api.get(
            "/api/dashboard/counts/", {"workspace_id": self.workspace.pk}
        )
        self.assertEqual(counts.status_code, 200, counts.content)
        self.assertEqual(counts.data["workspace_id"], self.workspace.pk)

    def test_aliases_do_not_grant_access_to_another_workspace(self):
        response = self.api.post(
            "/api/goals/", self._goal_payload(workspace=self.other.pk), format="json"
        )
        self.assertEqual(response.status_code, 403, response.content)
        self.assertFalse(ClientGoal.objects.exists())
        response = self.api.get(
            "/api/dashboard/counts/", {"workspace_id": self.other.pk}
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["workspace_id"])

    def test_conflicting_body_or_query_aliases_fail_before_writes(self):
        response = self.api.post(
            "/api/goals/",
            self._goal_payload(workspace=self.other.pk, client=self.workspace.pk),
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(ClientGoal.objects.exists())
        response = self.api.get(
            "/api/goals/", {"workspace": self.other.pk, "client": self.workspace.pk}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Conflicting", response.json()["detail"])

    def test_normalization_is_shallow_except_assignment_envelopes(self):
        original = {
            "workspace_id": 1,
            "metadata": {"workspace_id": 2},
            "add": [{"workspace_id": 3}],
        }
        result = normalize_workspace_input(original)
        self.assertEqual(result["client_id"], 1)
        self.assertEqual(result["add"][0]["client_id"], 3)
        self.assertEqual(result["metadata"], {"workspace_id": 2})
        self.assertIn("workspace_id", original)
        self.assertEqual(
            normalize_workspace_input({"workspace_id": "1", "client_id": 1})[
                "client_id"
            ],
            "1",
        )
        with self.assertRaises(ParseError):
            normalize_workspace_input({"workspace_ids": [1, 2], "client_ids": [1, 3]})
        rendered = add_workspace_output(
            {"results": [{"client_id": 1}], "metadata": {"client_id": 2}}
        )
        self.assertEqual(rendered["results"][0]["workspace_id"], 1)
        self.assertEqual(rendered["metadata"], {"client_id": 2})

    def test_management_and_setup_aliases_share_existing_views(self):
        pairs = [
            ("/api/management/workspaces/", "/api/management/clients/"),
            ("/api/management/staff/1/workspaces/", "/api/management/staff/1/clients/"),
            ("/api/admin/create-workspace/", "/api/admin/create-client/"),
            ("/api/workspace/setup-solo/", "/api/client/setup-solo/"),
            ("/api/ai/v2/usage/by-workspace/", "/api/ai/v2/usage/by-client/"),
        ]
        for canonical, legacy in pairs:
            new, old = resolve(canonical).func, resolve(legacy).func
            self.assertEqual(
                getattr(new, "view_class", new), getattr(old, "view_class", old)
            )

    def test_django_admin_uses_workspace_labels_with_legacy_storage(self):
        from django.contrib import admin
        from django.test import RequestFactory
        from social_stats.models import SocialAccount

        request = RequestFactory().get("/backend/")
        request.user = self.user
        form = admin.site._registry[SocialAccount].get_form(request)
        self.assertEqual(form.base_fields["client"].label, "فضای کاری")
        self.assertEqual(Client._meta.verbose_name, "فضای کاری")
        self.assertEqual(Client._meta.db_table, "social_stats_client")
        self.assertEqual(
            dict(UserProfile._meta.get_field("role").choices)["client"],
            "عضو فضای کاری",
        )
