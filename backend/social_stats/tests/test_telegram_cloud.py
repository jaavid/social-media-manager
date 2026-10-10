"""Telegram Cloud linking: token secrecy, replay resistance, tenant isolation."""
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from social_stats.models import (
    Agency, AgencyClientRelation, ApprovalRequest, Client, Permission,
    RolePermission, UnifiedPost, UserProfile, WorkspaceMemberPolicy,
)
from social_stats.models.telegram_cloud import TelegramCloudLinkCode, TelegramCloudSession


class TelegramCloudAuthTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="reader", password="abc123")
        self.other_user = User.objects.create_user(username="other", password="abc123")
        self.auth = APIClient()
        self.auth.force_authenticate(user=self.user)
        self.anonymous = APIClient()

    def test_requires_login_and_single_use(self):
        url = "/api/tgcloud/link-code/"
        self.assertIn(self.anonymous.post(url, {}).status_code, (401, 403))
        response = self.auth.post(url, {})
        self.assertEqual(response.status_code, 201)
        code = response.data["code"]
        self.assertNotEqual(TelegramCloudLinkCode.objects.get(user=self.user).code_hash, code)
        claim_url = "/api/tgcloud/claim/"
        claim = self.anonymous.post(claim_url, {"code": code, "telegram_user_id": 42}, format="json")
        self.assertEqual(claim.status_code, 201)
        token = claim.data["token"]
        self.assertNotEqual(TelegramCloudSession.objects.get(user=self.user).token_hash, token)
        self.assertEqual(self.anonymous.post(claim_url, {"code": code, "telegram_user_id": 42}, format="json").status_code, 400)
        self.assertEqual(self.auth.get(url).data["telegram_user_id"], 42)
        self.assertEqual(self.auth.delete(url).status_code, 200)
        self.assertEqual(self.anonymous.get("/api/tgcloud/reviews/", HTTP_AUTHORIZATION=f"Bearer {token}").status_code, 401)

    def test_reissued_code_invalidates_previous(self):
        first = self.auth.post("/api/tgcloud/link-code/", {}).data["code"]
        second = self.auth.post("/api/tgcloud/link-code/", {}).data["code"]
        self.assertNotEqual(first, second)
        self.assertEqual(self.anonymous.post("/api/tgcloud/claim/", {"code": first, "telegram_user_id": 11}, format="json").status_code, 400)
        self.assertEqual(self.anonymous.post("/api/tgcloud/claim/", {"code": second, "telegram_user_id": 11}, format="json").status_code, 201)

    def test_conflicting_identity_does_not_reassign(self):
        code1 = self.auth.post("/api/tgcloud/link-code/").data["code"]
        self.assertEqual(self.anonymous.post("/api/tgcloud/claim/", {"code": code1, "telegram_user_id": 13}, format="json").status_code, 201)
        other = APIClient()
        other.force_authenticate(user=self.other_user)
        code2 = other.post("/api/tgcloud/link-code/").data["code"]
        self.assertEqual(self.anonymous.post("/api/tgcloud/claim/", {"code": code2, "telegram_user_id": 13}, format="json").status_code, 409)

    def test_readonly_reviews_are_scoped_and_authorized(self):
        mine = Client.objects.create(name="Mine", company="Mine", email="mine@example.test", owner_user=self.user)
        not_mine = Client.objects.create(name="Theirs", company="Theirs", email="theirs@example.test", owner_user=self.other_user)
        UserProfile.objects.create(user=self.user, role="client", client=mine)
        UserProfile.objects.create(user=self.other_user, role="client", client=not_mine)
        mine_post = UnifiedPost.objects.create(client=mine, created_by=self.other_user, status="pending_approval", title="Allowed", content="Visible content")
        UnifiedPost.objects.create(client=not_mine, created_by=self.other_user, status="pending_approval", title="Forbidden")
        code = self.auth.post("/api/tgcloud/link-code/").data["code"]
        token = self.anonymous.post("/api/tgcloud/claim/", {"code": code, "telegram_user_id": 67}, format="json").data["token"]
        self.assertEqual(self.anonymous.get("/api/tgcloud/reviews/").status_code, 401)
        r = self.anonymous.get("/api/tgcloud/reviews/", HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(r.status_code, 200)
        self.assertEqual([p["id"] for p in r.data["rows"]], [mine_post.pk])
        self.assertEqual(self.anonymous.post("/api/tgcloud/reviews/", HTTP_AUTHORIZATION=f"Bearer {token}").status_code, 405)

    def _link_token(self, tg_id=670):
        code = self.auth.post("/api/tgcloud/link-code/").data["code"]
        response = self.anonymous.post(
            "/api/tgcloud/claim/",
            {"code": code, "telegram_user_id": tg_id},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        return response.data["token"]

    def test_session_introspection_and_revocation_from_bot(self):
        token = self._link_token()
        headers = {"HTTP_AUTHORIZATION": f"Bearer {token}"}
        self.assertEqual(self.anonymous.get("/api/tgcloud/session/").status_code, 401)
        response = self.anonymous.get("/api/tgcloud/session/", **headers)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["linked"])
        self.assertEqual(response.data["name"], "reader")
        self.assertEqual(response["Cache-Control"], "no-store")
        self.assertEqual(self.anonymous.post("/api/tgcloud/session/", **headers).status_code, 405)
        self.assertEqual(self.anonymous.delete("/api/tgcloud/session/", **headers).status_code, 200)
        self.assertFalse(TelegramCloudSession.objects.filter(user=self.user).exists())
        self.assertEqual(self.anonymous.get("/api/tgcloud/session/", **headers).status_code, 401)
        self.assertEqual(self.anonymous.get("/api/tgcloud/reviews/", **headers).status_code, 401)

    def test_reviews_cursor_and_detail_recheck_scope(self):
        mine = Client.objects.create(
            name="Workspace Mine", company="Workspace Mine",
            email="mine2@example.test", owner_user=self.user,
        )
        hidden = Client.objects.create(
            name="Workspace Other", company="Workspace Other",
            email="other2@example.test", owner_user=self.other_user,
        )
        UserProfile.objects.create(user=self.user, role="client", client=mine)
        UserProfile.objects.create(user=self.other_user, role="client", client=hidden)
        posts = []
        for n in range(9):
            posts.append(UnifiedPost.objects.create(
                client=mine, created_by=self.other_user, status="pending_approval",
                title=f"Post {n}", content=f"Editorial content {n}",
                media_urls=["https://private.example.test/token-in-url"],
            ))
            if n == 4:
                forbidden = UnifiedPost.objects.create(
                    client=hidden, created_by=self.other_user,
                    status="pending_approval", title="Hidden", content="Secret",
                )
        token = self._link_token()
        headers = {"HTTP_AUTHORIZATION": f"Bearer {token}"}
        page1 = self.anonymous.get("/api/tgcloud/reviews/", **headers)
        self.assertEqual(page1.status_code, 200)
        self.assertEqual(len(page1.data["rows"]), 5)
        self.assertTrue(page1.data["next_cursor"])
        ids = [r["id"] for r in page1.data["rows"]]
        self.assertNotIn(forbidden.id, ids)
        page2 = self.anonymous.get(
            "/api/tgcloud/reviews/",
            {"before": page1.data["next_cursor"]},
            **headers,
        )
        self.assertEqual(page2.status_code, 200)
        self.assertEqual(len(page2.data["rows"]), 4)
        self.assertIsNone(page2.data["next_cursor"])
        self.assertEqual(set(ids + [r["id"] for r in page2.data["rows"]]),
                         {p.pk for p in posts})

        bad = self.anonymous.get("/api/tgcloud/reviews/", {"before": "0"}, **headers)
        self.assertEqual(bad.status_code, 400)
        bad = self.anonymous.get("/api/tgcloud/reviews/", {"before": "garbage"}, **headers)
        self.assertEqual(bad.status_code, 400)

        detail = self.anonymous.get(f"/api/tgcloud/reviews/{posts[0].pk}/", **headers)
        self.assertEqual(detail.status_code, 200)
        self.assertIn("Editorial content", detail.data["content"])
        self.assertNotIn("media_urls", detail.data)
        self.assertNotIn("platform_overrides", detail.data)
        self.assertEqual(
            self.anonymous.get(f"/api/tgcloud/reviews/{forbidden.pk}/", **headers).status_code,
            404,
        )
        self.assertEqual(
            self.anonymous.post(f"/api/tgcloud/reviews/{posts[0].pk}/", **headers).status_code,
            405,
        )
        posts[0].status = "draft"
        posts[0].save(update_fields=["status"])
        self.assertEqual(
            self.anonymous.get(f"/api/tgcloud/reviews/{posts[0].pk}/", **headers).status_code,
            404,
        )
        # Deactivating the linked account revokes this token immediately.
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        self.assertEqual(
            self.anonymous.get(f"/api/tgcloud/reviews/{posts[1].pk}/", **headers).status_code,
            401,
        )

    def _staff_reviewer_workspace(self):
        """Create a non-owner who has both legacy and active workspace grants."""
        workspace = Client.objects.create(
            name="Review tenant", company="Review tenant", email="staff-reviews@example.test",
            owner_user=self.other_user,
        )
        profile = UserProfile.objects.create(user=self.user, role="staff")
        profile.assigned_clients.add(workspace)
        permission, _ = Permission.objects.get_or_create(
            code="composer.approve", defaults={"label": "Approve posts"},
        )
        RolePermission.objects.update_or_create(
            role="staff", permission=permission, defaults={"is_granted": True},
        )
        policy = WorkspaceMemberPolicy.objects.create(
            user=self.user, workspace=workspace,
            permissions={"approve_posts": True}, is_active=True,
        )
        return workspace, policy

    def test_inactive_account_can_revoke_session_and_cannot_reuse_it(self):
        """An inactive user can revoke a token even before possible reactivation."""
        token = self._link_token(tg_id=671)
        headers = {"HTTP_AUTHORIZATION": f"Bearer {token}"}
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        self.assertEqual(self.anonymous.get("/api/tgcloud/session/", **headers).status_code, 401)
        self.assertEqual(self.anonymous.get("/api/tgcloud/reviews/", **headers).status_code, 401)
        response = self.anonymous.delete("/api/tgcloud/session/", **headers)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(TelegramCloudSession.objects.filter(user=self.user).exists())
        self.user.is_active = True
        self.user.save(update_fields=["is_active"])
        self.assertEqual(self.anonymous.get("/api/tgcloud/reviews/", **headers).status_code, 401)

    def test_nonowner_reviewer_cannot_view_own_or_agency_pending_posts(self):
        """Action-granted staff still cannot bypass Composer's approval exceptions."""
        workspace, policy = self._staff_reviewer_workspace()
        allowed = UnifiedPost.objects.create(
            client=workspace, created_by=self.other_user,
            status="pending_approval", title="Allowed staff review",
        )
        own = UnifiedPost.objects.create(
            client=workspace, created_by=self.user,
            status="pending_approval", title="Self-authored",
        )
        requested = UnifiedPost.objects.create(
            client=workspace, created_by=self.other_user,
            publish_requested_by=self.user,
            status="pending_approval", title="Self-requested",
        )
        agency_post = UnifiedPost.objects.create(
            client=workspace, created_by=self.other_user,
            status="pending_approval", title="Agency approval required",
        )
        agency = Agency.objects.create(
            name="Fixture agency", slug="fixture-tgcloud-agency", owner_user=self.other_user,
        )
        relation = AgencyClientRelation.objects.create(
            agency=agency, client=workspace, status="active",
            initiated_by="end_user",
        )
        ApprovalRequest.objects.create(
            relation=relation, client=workspace,
            requested_by=self.other_user, action_type="publish_posts",
            target_object_type="UnifiedPost", target_object_id=agency_post.pk,
            status="pending",
        )
        token = self._link_token(tg_id=672)
        headers = {"HTTP_AUTHORIZATION": f"Bearer {token}"}
        page = self.anonymous.get("/api/tgcloud/reviews/", **headers)
        self.assertEqual(page.status_code, 200)
        self.assertEqual([row["id"] for row in page.data["rows"]], [allowed.pk])
        for post in (own, requested, agency_post):
            with self.subTest(post=post.pk):
                self.assertEqual(
                    self.anonymous.get(f"/api/tgcloud/reviews/{post.pk}/", **headers).status_code,
                    404,
                )
        policy.permissions = {"approve_posts": False}
        policy.save(update_fields=["permissions"])
        self.assertEqual(self.anonymous.get("/api/tgcloud/reviews/", **headers).data["rows"], [])
        self.assertEqual(
            self.anonymous.get(f"/api/tgcloud/reviews/{allowed.pk}/", **headers).status_code,
            404,
        )

    def test_review_scan_is_bounded_and_cursor_preserves_hidden_candidates(self):
        """More than 100 disallowed posts must not force an unbounded evaluation."""
        workspace, _policy = self._staff_reviewer_workspace()
        visible = UnifiedPost.objects.create(
            client=workspace, created_by=self.other_user,
            status="pending_approval", title="Older authorized post",
        )
        UnifiedPost.objects.bulk_create([
            UnifiedPost(
                client=workspace, created_by=self.user,
                status="pending_approval", title=f"Ineligible {index}",
            )
            for index in range(101)
        ])
        token = self._link_token(tg_id=673)
        headers = {"HTTP_AUTHORIZATION": f"Bearer {token}"}
        first = self.anonymous.get("/api/tgcloud/reviews/", **headers)
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.data["rows"], [])
        self.assertIsNotNone(first.data["next_cursor"])
        second = self.anonymous.get(
            "/api/tgcloud/reviews/",
            {"before": first.data["next_cursor"]},
            **headers,
        )
        self.assertEqual(second.status_code, 200)
        self.assertEqual([row["id"] for row in second.data["rows"]], [visible.pk])
        self.assertIsNone(second.data["next_cursor"])
        self.assertNotEqual(first.data["next_cursor"], second.data["next_cursor"])
