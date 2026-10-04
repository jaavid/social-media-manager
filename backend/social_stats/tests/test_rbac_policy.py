"""RBAC regression matrix: tenant ceilings, compatibility, overrides, approvals."""

from datetime import timedelta
from unittest.mock import patch
from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from social_stats.models import (
    Client,
    UserProfile,
    Permission,
    RolePermission,
    UserPermission,
    StaffClientAssignment,
    Agency,
    AgencyMembership,
    AgencyClientRelation,
    RolePreset,
    WorkspaceMemberPolicy,
    SocialAccount,
    SocialAccountPermissionOverride,
    ActionLog,
    UnifiedPost,
    ApprovalRequest,
)
from social_stats.authorization import evaluate, accessible_workspaces
from social_stats.permissions import PermissionChecker
from social_stats.approval_executors import execute_approval


class RBACPolicyTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner")
        self.actor = User.objects.create_user(username="member")
        self.workspace = Client.objects.create(
            name="Workspace",
            company="Team",
            email="team@example.test",
            owner_user=self.owner,
        )
        self.other = Client.objects.create(
            name="Other", company="Other", email="other@example.test"
        )
        self.profile = UserProfile.objects.create(user=self.actor, role="staff")
        self.assignment = StaffClientAssignment.objects.create(
            staff_profile=self.profile, client=self.workspace, can_edit=True
        )
        self.permission, _ = Permission.objects.get_or_create(
            code="composer.publish", defaults={"label": "Publish"}
        )
        RolePermission.objects.update_or_create(
            role="staff", permission=self.permission, defaults={"is_granted": True}
        )
        self.account = SocialAccount.objects.create(
            client=self.workspace, platform="facebook", external_id="one"
        )
        self.sibling = SocialAccount.objects.create(
            client=self.workspace, platform="facebook", external_id="two"
        )
        self.editor = RolePreset.objects.get(key="editor")
        self.api = APIClient()
        self.api.force_authenticate(self.owner)

    def policy(self, **kwargs):
        return WorkspaceMemberPolicy.objects.create(
            workspace=self.workspace, user=self.actor, **kwargs
        )

    def test_legacy_user_override_and_staff_edit_ceiling(self):
        self.assertTrue(evaluate(self.actor, self.workspace, "publish_posts").allowed)
        UserPermission.objects.create(
            user_profile=self.profile, permission=self.permission, is_granted=False
        )
        self.assertFalse(evaluate(self.actor, self.workspace, "publish_posts").allowed)
        self.assertFalse(
            PermissionChecker.has_permission(self.profile, "composer.publish")
        )
        UserPermission.objects.all().delete()
        self.assignment.can_edit = False
        self.assignment.save()
        self.policy(
            preset=RolePreset.objects.get(key="owner"),
            permissions={"publish_posts": True},
        )
        self.assertFalse(evaluate(self.actor, self.workspace, "publish_posts").allowed)

    def test_assignment_table_without_m2m_resolves_tenant(self):
        self.assertTrue(self.profile.can_access_client(self.workspace.pk))
        self.assertTrue(
            accessible_workspaces(self.actor).filter(pk=self.workspace.pk).exists()
        )
        self.assertFalse(evaluate(self.actor, self.other, "publish_posts").allowed)

    def test_explicit_policy_deny_beats_preset(self):
        self.policy(preset=self.editor, permissions={"publish_posts": False})
        self.assertFalse(evaluate(self.actor, self.workspace, "publish_posts").allowed)

    def test_defaults_are_data_driven_and_approval_exception(self):
        policy = self.policy(preset=self.editor)
        self.assertTrue(
            evaluate(self.actor, self.workspace, "publish_posts").requires_approval
        )
        policy.approval_overrides = {"publish_posts": False}
        policy.save()
        self.assertFalse(
            evaluate(self.actor, self.workspace, "publish_posts").requires_approval
        )
        self.editor.permissions["publish_posts"] = False
        self.editor.save()
        self.assertFalse(evaluate(self.actor, self.workspace, "publish_posts").allowed)

    def test_workspace_approval_cannot_be_waived(self):
        self.workspace.requires_approval = True
        self.workspace.save()
        self.policy(preset=self.editor, approval_overrides={"publish_posts": False})
        SocialAccountPermissionOverride.objects.create(
            account=self.account,
            user=self.actor,
            approval_overrides={"publish_posts": False},
        )
        self.assertTrue(
            evaluate(
                self.actor, self.workspace, "publish_posts", account=self.account
            ).requires_approval
        )

    def test_account_restriction_is_local_and_grant_cannot_expand(self):
        self.policy(permissions={"publish_posts": True})
        override = SocialAccountPermissionOverride.objects.create(
            account=self.account, user=self.actor, permissions={"publish_posts": False}
        )
        self.assertFalse(
            evaluate(
                self.actor, self.workspace, "publish_posts", account=self.account
            ).allowed
        )
        self.assertTrue(
            evaluate(
                self.actor, self.workspace, "publish_posts", account=self.sibling
            ).allowed
        )
        WorkspaceMemberPolicy.objects.filter(user=self.actor).update(
            permissions={"publish_posts": False}
        )
        override.permissions = {"publish_posts": True}
        override.save()
        self.assertFalse(
            evaluate(
                self.actor, self.workspace, "publish_posts", account=self.account
            ).allowed
        )

    def test_account_wrong_workspace_denied_even_for_owner(self):
        self.assertFalse(
            evaluate(
                self.owner, self.other, "publish_posts", account=self.account
            ).allowed
        )

    def test_inactive_user_and_revoked_member_denied(self):
        self.actor.is_active = False
        self.actor.save()
        self.assertFalse(evaluate(self.actor, self.workspace, "publish_posts").allowed)
        self.actor.is_active = True
        self.actor.save()
        self.policy(is_active=False)
        self.assertFalse(evaluate(self.actor, self.workspace, "publish_posts").allowed)
        self.assertFalse(accessible_workspaces(self.actor).exists())

    def test_agency_relation_remains_ceiling_and_paused_is_not_resurrected(self):
        agency = Agency.objects.create(
            name="Agency", slug="agency", owner_user=self.owner
        )
        membership = AgencyMembership.objects.create(
            agency=agency, user=self.actor, preset=self.editor
        )
        relation = AgencyClientRelation.objects.create(
            agency=agency,
            client=self.workspace,
            status="active",
            initiated_by="agency",
            permissions={"publish_posts": False},
        )
        self.policy(permissions={"publish_posts": True})
        self.assertFalse(evaluate(self.actor, self.workspace, "publish_posts").allowed)
        relation.permissions = {"publish_posts": True}
        relation.requires_approval_for = ["publish_posts"]
        relation.save()
        self.assertTrue(
            evaluate(self.actor, self.workspace, "publish_posts").requires_approval
        )
        relation.status = "paused"
        relation.save()
        self.assertFalse(evaluate(self.actor, self.workspace, "publish_posts").allowed)
        # A legacy staff assignment must not resurrect this agency workspace.
        self.assertFalse(
            accessible_workspaces(self.actor).filter(pk=self.workspace.pk).exists()
        )
        relation.status = "active"
        relation.save()
        membership.is_active = False
        membership.save()
        # Legacy assignment is an independently authorized compatibility input.
        self.assignment.delete()
        self.assertFalse(evaluate(self.actor, self.workspace, "publish_posts").allowed)

    def test_team_shows_effective_defaults(self):
        self.policy(preset=self.editor)
        res = self.api.get(
            f"/api/management/workspaces/{self.workspace.pk}/team-policy/"
        )
        self.assertEqual(res.status_code, 200)
        member = next(m for m in res.data["members"] if m["user_id"] == self.actor.pk)
        self.assertTrue(member["effective"]["publish_posts"]["requires_approval"])
        self.assertEqual(member["policy"]["preset"], "editor")

    def test_policy_write_is_validated_and_audited(self):
        url = f"/api/management/workspaces/{self.workspace.pk}/team-policy/{self.actor.pk}/"
        self.assertEqual(
            self.api.put(
                url, {"permissions": {"publish_posts": "false"}}, format="json"
            ).status_code,
            400,
        )
        self.assertFalse(WorkspaceMemberPolicy.objects.exists())
        res = self.api.put(
            url,
            {"preset": "editor", "permissions": {"publish_posts": False}},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        log = ActionLog.objects.get(action="rbac.policy_updated")
        self.assertEqual(log.details["after"]["permissions"], {"publish_posts": False})
        self.assertFalse(evaluate(self.actor, self.workspace, "publish_posts").allowed)

    def test_account_write_tenant_scope_and_reset(self):
        url = f"/api/management/workspaces/{self.workspace.pk}/accounts/{self.account.pk}/policy/{self.actor.pk}/"
        self.assertEqual(
            self.api.put(
                url, {"permissions": {"publish_posts": False}}, format="json"
            ).status_code,
            200,
        )
        self.assertFalse(
            evaluate(
                self.actor, self.workspace, "publish_posts", account=self.account
            ).allowed
        )
        self.assertEqual(self.api.delete(url).status_code, 200)
        self.assertTrue(
            evaluate(
                self.actor, self.workspace, "publish_posts", account=self.account
            ).allowed
        )
        wrong = url.replace(
            f"workspaces/{self.workspace.pk}/", f"workspaces/{self.other.pk}/"
        )
        self.assertEqual(self.api.put(wrong, {}, format="json").status_code, 403)

    def test_member_cannot_manage_policy_or_grant_cross_workspace_user(self):
        self.api.force_authenticate(self.actor)
        url = f"/api/management/workspaces/{self.workspace.pk}/team-policy/{self.actor.pk}/"
        self.assertEqual(self.api.put(url, {}, format="json").status_code, 403)
        self.api.force_authenticate(self.owner)
        outsider = User.objects.create_user(username="outsider")
        url = url.replace(f"/{self.actor.pk}/", f"/{outsider.pk}/")
        self.assertEqual(
            self.api.put(url, {"preset": "owner"}, format="json").status_code, 403
        )

    @patch("social_stats.notification_dispatcher.dispatch")
    def test_non_agency_approval_and_revocation_before_execution(self, notify):
        self.policy(preset=self.editor)
        self.api.force_authenticate(self.actor)
        post = UnifiedPost.objects.create(
            client=self.workspace, created_by=self.actor, target_platforms=["facebook"]
        )
        res = self.api.post(f"/api/composer/posts/{post.pk}/publish_now/")
        self.assertEqual(res.status_code, 202)
        approval = ApprovalRequest.objects.get(pk=res.data["approval_id"])
        self.assertIsNone(approval.relation_id)
        self.api.force_authenticate(self.owner)
        self.assertEqual(
            self.api.get(f"/api/approvals/{approval.pk}/").status_code, 200
        )
        WorkspaceMemberPolicy.objects.filter(user=self.actor).update(
            permissions={"publish_posts": False}
        )
        ok, _, _ = execute_approval(approval)
        self.assertFalse(ok)

    @patch("social_stats.orchestrator.publish_unified_post.delay")
    def test_schedule_policy_and_executor(self, publish):
        self.policy(preset=self.editor)
        self.api.force_authenticate(self.actor)
        post = UnifiedPost.objects.create(
            client=self.workspace, created_by=self.actor, target_platforms=["facebook"]
        )
        when = (timezone.now() + timedelta(days=1)).isoformat()
        res = self.api.post(
            f"/api/composer/posts/{post.pk}/schedule/",
            {"scheduled_at": when},
            format="json",
        )
        self.assertEqual(res.status_code, 202)
        approval = ApprovalRequest.objects.get(pk=res.data["approval_id"])
        approval.decided_by = self.owner
        ok, _, _ = execute_approval(approval)
        self.assertTrue(ok)
        post.refresh_from_db()
        self.assertEqual(post.status, "scheduled")
        self.assertEqual(post.approved_by, self.owner)

    def test_editor_cannot_approve_own_or_others_post(self):
        self.policy(preset=self.editor)
        self.api.force_authenticate(self.actor)
        post = UnifiedPost.objects.create(
            client=self.workspace, created_by=self.actor, status="pending_approval"
        )
        self.assertEqual(
            self.api.post(f"/api/composer/posts/{post.pk}/approve/").status_code, 403
        )

    @patch("social_stats.orchestrator.publish_to_platform.delay")
    def test_worker_rechecks_account_and_scheduled_approval(self, fanout):
        from social_stats.orchestrator import publish_unified_post

        post = UnifiedPost.objects.create(
            client=self.workspace,
            created_by=self.actor,
            target_platforms=["facebook"],
            status="scheduled",
        )
        SocialAccountPermissionOverride.objects.create(
            user=self.actor, account=self.account, permissions={"publish_posts": False}
        )
        publish_unified_post(post.pk)
        fanout.assert_not_called()
        post.refresh_from_db()
        self.assertEqual(post.status, "failed")
        SocialAccountPermissionOverride.objects.all().delete()
        self.workspace.requires_approval = True
        self.workspace.save()
        post.status = "scheduled"
        post.save()
        publish_unified_post(post.pk)
        fanout.assert_not_called()
        post.refresh_from_db()
        self.assertEqual(post.status, "pending_approval")

    def test_unknown_action_fails_closed(self):
        self.assertFalse(evaluate(self.owner, self.workspace, "invented").allowed)

    def test_organization_preset_requires_owner_and_respects_relationship_ceiling(self):
        agency = Agency.objects.create(
            name="Organization", slug="organization", owner_user=self.owner
        )
        membership = AgencyMembership.objects.create(agency=agency, user=self.actor)
        AgencyClientRelation.objects.create(
            agency=agency,
            client=self.workspace,
            status="active",
            initiated_by="agency",
            permissions={"publish_posts": True},
        )
        url = (
            f"/api/management/organizations/{agency.pk}/members/{self.actor.pk}/preset/"
        )
        res = self.api.put(url, {"preset": "editor"}, format="json")
        self.assertEqual(res.status_code, 200)
        membership.refresh_from_db()
        self.assertEqual(membership.preset, self.editor)
        self.assertTrue(
            evaluate(self.actor, self.workspace, "publish_posts").requires_approval
        )
        self.assertTrue(
            ActionLog.objects.filter(action="rbac.organization_preset_updated").exists()
        )
        self.api.force_authenticate(self.actor)
        self.assertEqual(
            self.api.put(url, {"preset": "owner"}, format="json").status_code, 403
        )

    def test_account_read_restrictions_apply_to_summary_and_timeseries(self):
        from social_stats.models import DailyMetric

        for account in (self.account, self.sibling):
            DailyMetric.objects.create(
                client=self.workspace,
                platform="facebook",
                social_account=account,
                date=timezone.now().date(),
                impressions=100,
            )
        SocialAccountPermissionOverride.objects.create(
            user=self.owner, account=self.account, permissions={"view_analytics": False}
        )
        timeseries = self.api.get(f"/api/clients/{self.workspace.pk}/timeseries/")
        self.assertEqual(timeseries.status_code, 200)
        self.assertEqual(len(timeseries.data), 1)
        summary = self.api.get(f"/api/clients/{self.workspace.pk}/summary/")
        self.assertEqual(summary.status_code, 200)
        self.assertEqual(summary.data["totals"]["total_impressions"], 100)

    def test_explicit_post_account_does_not_inherit_sibling_restriction(self):
        from social_stats.authorization import post_decision

        SocialAccountPermissionOverride.objects.create(
            user=self.actor, account=self.sibling, permissions={"publish_posts": False}
        )
        post = UnifiedPost.objects.create(
            client=self.workspace,
            created_by=self.actor,
            target_platforms=["facebook"],
            platform_overrides={"facebook": {"social_account_id": self.account.pk}},
        )
        self.assertTrue(post_decision(post).allowed)
        post.platform_overrides = {"facebook": {"social_account_id": self.sibling.pk}}
        self.assertFalse(post_decision(post).allowed)
        foreign = SocialAccount.objects.create(
            client=self.other, platform="facebook", external_id="foreign"
        )
        post.platform_overrides = {"facebook": {"social_account_id": foreign.pk}}
        self.assertFalse(post_decision(post).allowed)

    def test_cannot_move_post_to_another_workspace(self):
        post = UnifiedPost.objects.create(
            client=self.workspace, created_by=self.owner, content="Original"
        )
        res = self.api.patch(
            f"/api/composer/posts/{post.pk}/", {"client": self.other.pk}, format="json"
        )
        self.assertEqual(res.status_code, 400)
        post.refresh_from_db()
        self.assertEqual(post.client, self.workspace)

    def test_audit_failure_rolls_back_policy_change(self):
        url = f"/api/management/workspaces/{self.workspace.pk}/team-policy/{self.actor.pk}/"
        with patch(
            "social_stats.views.rbac.ActionLog.objects.create",
            side_effect=RuntimeError("audit unavailable"),
        ):
            with self.assertRaises(RuntimeError):
                self.api.put(url, {"preset": "editor"}, format="json")
        self.assertFalse(WorkspaceMemberPolicy.objects.exists())

    @patch("social_stats.orchestrator.publish_unified_post.delay")
    def test_worker_uses_publication_requester_instead_of_draft_author(self, enqueue):
        from social_stats.authorization import post_decision

        self.policy(permissions={"publish_posts": False})
        post = UnifiedPost.objects.create(
            client=self.workspace,
            created_by=self.actor,
            content="Editor draft",
            target_platforms=["facebook"],
        )
        self.assertFalse(post_decision(post).allowed)
        response = self.api.post(f"/api/composer/posts/{post.pk}/publish_now/")
        self.assertEqual(response.status_code, 200)
        post.refresh_from_db()
        self.assertEqual(post.publish_requested_by, self.owner)
        self.assertTrue(post_decision(post).allowed)
        enqueue.assert_called_once_with(post.pk)

    def test_delegated_post_approver_cannot_approve_non_post_or_agency_request(self):
        from social_stats.views.approval import _user_owns_approval

        approver = User.objects.create_user(username="senior-editor")
        WorkspaceMemberPolicy.objects.create(
            user=approver,
            workspace=self.workspace,
            preset=RolePreset.objects.get(key="senior-editor"),
        )
        approval = ApprovalRequest.objects.create(
            client=self.workspace, requested_by=self.actor, action_type="send_campaign"
        )
        self.assertFalse(_user_owns_approval(approver, approval))
        self.assertTrue(_user_owns_approval(self.owner, approval))
        approval.action_type = "publish_post"
        self.assertTrue(_user_owns_approval(approver, approval))
        agency = Agency.objects.create(
            name="Agency", slug="review-agency", owner_user=self.owner
        )
        approval.relation = AgencyClientRelation.objects.create(
            agency=agency, client=self.workspace, initiated_by="agency", status="active"
        )
        self.assertFalse(_user_owns_approval(approver, approval))

    @patch("social_stats.orchestrator.publish_unified_post.delay")
    def test_delegated_approver_cannot_approve_own_publication_of_someone_elses_draft(
        self, enqueue
    ):
        self.policy(preset=RolePreset.objects.get(key="senior-editor"))
        self.workspace.requires_approval = True
        self.workspace.save()
        post = UnifiedPost.objects.create(
            client=self.workspace,
            created_by=self.owner,
            content="Owner draft",
            target_platforms=["facebook"],
        )
        self.api.force_authenticate(self.actor)
        self.assertEqual(
            self.api.post(f"/api/composer/posts/{post.pk}/publish_now/").status_code,
            202,
        )
        self.assertEqual(
            self.api.post(f"/api/composer/posts/{post.pk}/approve/").status_code, 403
        )
        enqueue.assert_not_called()

    def test_edit_clears_prior_requester_and_returns_scheduled_post_to_draft(self):
        post = UnifiedPost.objects.create(
            client=self.workspace,
            created_by=self.owner,
            content="Reviewed",
            status="scheduled",
            approved_by=self.owner,
            publish_requested_by=self.owner,
        )
        self.api.force_authenticate(self.actor)
        res = self.api.patch(
            f"/api/composer/posts/{post.pk}/", {"content": "New content"}, format="json"
        )
        self.assertEqual(res.status_code, 200)
        post.refresh_from_db()
        self.assertIsNone(post.publish_requested_by)
        self.assertIsNone(post.approved_by)
        self.assertEqual(post.status, "draft")

    def test_approved_edit_clears_prior_requester_and_schedule(self):
        post = UnifiedPost.objects.create(
            client=self.workspace,
            created_by=self.owner,
            content="Reviewed",
            status="scheduled",
            approved_by=self.owner,
            publish_requested_by=self.owner,
        )
        approval = ApprovalRequest.objects.create(
            client=self.workspace,
            requested_by=self.actor,
            action_type="edit_post",
            payload={"post_id": post.pk, "content": "New content"},
        )
        self.assertTrue(execute_approval(approval)[0])
        post.refresh_from_db()
        self.assertIsNone(post.publish_requested_by)
        self.assertIsNone(post.approved_by)
        self.assertEqual(post.status, "draft")

    def test_platform_recheck_records_failure_and_preserves_partial_success(self):
        from social_stats.models import PlatformPublishLog
        from social_stats.orchestrator import publish_to_platform

        self.policy(permissions={"publish_posts": False})
        post = UnifiedPost.objects.create(
            client=self.workspace,
            created_by=self.actor,
            target_platforms=["facebook", "instagram"],
            status="publishing",
        )
        PlatformPublishLog.objects.create(
            unified_post=post, platform="instagram", status="success"
        )
        log = PlatformPublishLog.objects.create(
            unified_post=post, platform="facebook", status="pending"
        )
        publish_to_platform(post.pk, "facebook")
        log.refresh_from_db()
        post.refresh_from_db()
        self.assertEqual(log.status, "failed")
        self.assertEqual(log.error_code, "permission_denied")
        self.assertEqual(post.status, "partial")

    def test_team_evaluation_ignores_unrelated_users(self):
        outsider = User.objects.create_user(username="not-in-team")
        from social_stats.authorization import acting_context

        with patch(
            "social_stats.views.rbac.acting_context", wraps=acting_context
        ) as resolve:
            res = self.api.get(
                f"/api/management/workspaces/{self.workspace.pk}/team-policy/"
            )
        self.assertEqual(res.status_code, 200)
        self.assertNotIn(
            outsider.pk, [args.args[0].pk for args in resolve.call_args_list]
        )

    @patch("social_stats.orchestrator.publish_to_platform.delay")
    def test_stale_fanout_task_does_not_publish_invalidated_draft(self, fanout):
        from social_stats.orchestrator import publish_unified_post

        post = UnifiedPost.objects.create(
            client=self.workspace,
            created_by=self.owner,
            status="draft",
            target_platforms=["facebook"],
        )
        publish_unified_post(post.pk)
        fanout.assert_not_called()
        post.refresh_from_db()
        self.assertEqual(post.status, "draft")

    def test_stale_platform_task_closes_pending_log_without_publishing_draft(self):
        from social_stats.models import PlatformPublishLog
        from social_stats.orchestrator import publish_to_platform

        post = UnifiedPost.objects.create(
            client=self.workspace,
            created_by=self.owner,
            status="draft",
            target_platforms=["facebook"],
        )
        log = PlatformPublishLog.objects.create(
            unified_post=post, platform="facebook", status="pending"
        )
        publish_to_platform(post.pk, "facebook")
        log.refresh_from_db()
        post.refresh_from_db()
        self.assertEqual(log.error_code, "publication_invalidated")
        self.assertEqual(post.status, "draft")

    @patch("social_stats.scheduler.publish_unified_post.delay")
    def test_queue_materialization_preserves_requester_and_schedule_policy(
        self, enqueue
    ):
        from social_stats.models import PostQueue, QueuedItem
        from social_stats.scheduler import _dispatch_queued_item
        from social_stats.authorization import post_decision

        queue = PostQueue.objects.create(
            client=self.workspace, name="Queue", platforms=["facebook"]
        )
        item = QueuedItem.objects.create(
            queue=queue, content="Queued content", requested_by=self.actor
        )
        _dispatch_queued_item(queue, item)
        item.refresh_from_db()
        self.assertEqual(item.unified_post.publish_requested_by, self.actor)
        self.assertEqual(item.unified_post.publish_action, "schedule_posts")
        self.policy(permissions={"publish_posts": True, "schedule_posts": False})
        self.assertFalse(post_decision(item.unified_post).allowed)

    def test_queue_add_items_records_authorized_requester(self):
        from social_stats.models import PostQueue

        queue = PostQueue.objects.create(
            client=self.workspace, name="Queue", platforms=["facebook"]
        )
        response = self.api.post(
            f"/api/composer/queues/{queue.pk}/add_items/",
            {"items": [{"content": "Queued content"}]},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(queue.items.get().requested_by, self.owner)
