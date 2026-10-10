"""Telegram Cloud linking: token secrecy, replay resistance, tenant isolation."""
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from social_stats.models import Client, UnifiedPost, UserProfile
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
        # A newly revoked workspace link is checked on each request.
        mine.owner_user = self.other_user
        mine.save(update_fields=["owner_user"])
        self.assertEqual(
            self.anonymous.get(f"/api/tgcloud/reviews/{posts[1].pk}/", **headers).status_code,
            404,
        )
