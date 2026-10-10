"""Tenant migration, context authorization and ownership regression checks."""

import tempfile
import unittest
import uuid
from importlib import import_module
from pathlib import Path
from types import SimpleNamespace

from django.contrib.auth.models import AnonymousUser, User
from django.core.exceptions import ValidationError as ModelValidationError
from django.db import IntegrityError, connections, transaction
from django.db.backends.sqlite3.base import DatabaseWrapper
from django.db.migrations.executor import MigrationExecutor
from django.db.models.deletion import ProtectedError
from django.http import Http404
from django.test import TestCase
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.test import APIClient

from social_stats.authorization import accessible_workspaces, evaluate
from social_stats.models import (
    Agency,
    AgencyClientRelation,
    AgencyMembership,
    Client,
    Organization,
    OrganizationMembership,
    RolePreset,
    UserProfile,
    WorkspaceMemberPolicy,
    ensure_client_profile,
)
from social_stats.tenancy import accessible_organizations, resolve_organization_context


class OrganizationTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user("tenant-owner")
        self.member = User.objects.create_user("tenant-member")
        self.outsider = User.objects.create_user("tenant-outsider")
        self.workspace = Client.objects.create(
            name="Owner",
            company="Brand",
            email="brand@example.com",
            owner_user=self.owner,
        )
        self.organization = self.workspace.organization
        self.api = APIClient()
        self.api.force_authenticate(self.owner)

    def test_every_workspace_has_an_isolated_tenant_and_known_owner(self):
        other = Client.objects.create(
            name="Other",
            company="Brand",
            email="other@example.com",
            owner_user=self.owner,
        )
        self.assertNotEqual(other.organization_id, self.workspace.organization_id)
        self.assertEqual(self.organization.owner_user_id, self.owner.pk)
        orphan = Client.objects.create(
            name="Unknown",
            company="Legacy",
            email="legacy@example.com",
        )
        self.assertIsNone(orphan.organization.owner_user_id)

    def test_creation_failure_rolls_back_tenant(self):
        before = Organization.objects.count()
        with self.assertRaises(IntegrityError), transaction.atomic():
            Client.objects.create(
                name="Invalid",
                company="Invalid",
                email=None,
            )
        self.assertEqual(Organization.objects.count(), before)

    def test_legacy_self_signup_creates_a_known_tenant_owner(self):
        self.member.email = "signup@example.com"
        self.member.save()
        profile = UserProfile.objects.create(user=self.member, role="client")
        workspace = ensure_client_profile(profile)
        self.assertEqual(workspace.organization.owner_user_id, self.member.pk)
        self.assertEqual(workspace.owner_user_id, self.member.pk)

    def test_staff_creation_does_not_bypass_staff_permissions(self):
        UserProfile.objects.create(user=self.member, role="staff")
        self.api.force_authenticate(self.member)
        response = self.api.post(
            "/api/workspaces/",
            {
                "name": "Staff",
                "company": "Staff",
                "email": "staff@example.com",
                "owner_user": self.member.pk,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        workspace = Client.objects.get(pk=response.data["id"])
        self.assertIsNone(workspace.owner_user_id)
        self.assertIsNone(workspace.organization.owner_user_id)
        self.assertFalse(evaluate(self.member, workspace, "publish_posts").allowed)

    def test_organization_creation_and_platform_recovery_are_explicit(self):
        response = self.api.post(
            "/api/organizations/",
            {
                "name": "New organization",
                "owner_user": self.outsider.pk,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["owner_user"], self.owner.pk)
        orphan = Organization.objects.create(name="Unclaimed")
        self.assertEqual(
            self.api.get(f"/api/organizations/{orphan.pk}/").status_code, 404
        )
        UserProfile.objects.create(user=self.owner, role="superadmin")
        self.assertEqual(
            self.api.patch(
                f"/api/organizations/{orphan.pk}/",
                {
                    "requires_approval": True,
                },
                format="json",
            ).status_code,
            200,
        )
        orphan.refresh_from_db()
        self.assertTrue(orphan.requires_approval)
        self.assertIsNone(orphan.owner_user_id)

    def test_tenant_is_protected_and_model_cannot_reparent(self):
        with self.assertRaises(ProtectedError):
            self.organization.delete()
        self.workspace.organization = Organization.objects.create(name="Another")
        with self.assertRaises(ModelValidationError):
            self.workspace.save()
        self.workspace.refresh_from_db()
        self.assertEqual(self.workspace.organization_id, self.organization.pk)
        replacement = Client(
            pk=self.workspace.pk,
            name="Replacement",
            company="Replacement",
            email=self.workspace.email,
            organization=Organization.objects.create(name="Replacement"),
        )
        with self.assertRaises(ModelValidationError):
            replacement.save()
        with self.assertRaises(IntegrityError), transaction.atomic():
            Client.objects.filter(pk=self.workspace.pk).update(organization=None)

    def test_context_is_derived_from_authorized_workspace(self):
        self.assertEqual(
            resolve_organization_context(self.owner, self.workspace.pk),
            self.organization,
        )
        for user in (self.outsider, AnonymousUser()):
            with self.assertRaises(Http404):
                resolve_organization_context(user, self.workspace.pk)
        with self.assertRaises(PermissionDenied):
            resolve_organization_context(
                self.owner,
                self.workspace.pk,
                organization_id=self.organization.pk + 1,
            )
        with self.assertRaises(ValidationError):
            resolve_organization_context(
                self.owner, self.workspace.pk, organization_id="bad"
            )
        self.owner.is_active = False
        self.owner.save()
        self.assertFalse(accessible_organizations(self.owner).exists())
        with self.assertRaises(Http404):
            resolve_organization_context(self.owner, self.workspace.pk)

    def test_membership_never_grants_workspace_or_tenant_management(self):
        membership = OrganizationMembership.objects.create(
            organization=self.organization,
            user=self.member,
        )
        self.api.force_authenticate(self.member)
        url = f"/api/organizations/{self.organization.pk}/"
        self.assertEqual(self.api.get(url).status_code, 200)
        self.assertEqual(self.api.patch(url, {"name": "Hijacked"}).status_code, 403)
        self.assertEqual(self.api.get(url + "members/").status_code, 403)
        self.assertEqual(self.api.get(url + "workspaces/").data, [])
        self.assertFalse(accessible_workspaces(self.member).exists())
        self.assertFalse(evaluate(self.member, self.workspace, "view_posts").allowed)
        membership.is_active = False
        membership.save()
        self.assertEqual(self.api.get(url).status_code, 404)

    def test_organization_workspace_listing_keeps_each_workspace_grant(self):
        second = Client.objects.create(
            name="Another owner",
            company="Second",
            email="second-owner@example.com",
            organization=self.organization,
            owner_user=self.outsider,
        )
        url = f"/api/organizations/{self.organization.pk}/workspaces/"
        self.assertEqual(
            [row["id"] for row in self.api.get(url).data], [self.workspace.pk]
        )
        self.assertFalse(
            accessible_workspaces(self.owner).filter(pk=second.pk).exists()
        )
        with self.assertRaises(Http404):
            resolve_organization_context(self.owner, second.pk)

    def test_agency_delegation_can_resolve_context_without_organization_membership(
        self,
    ):
        agency = Agency.objects.create(
            name="Delegate",
            slug="delegate",
            owner_user=self.member,
        )
        AgencyMembership.objects.create(agency=agency, user=self.member)
        relation = AgencyClientRelation.objects.create(
            agency=agency,
            client=self.workspace,
            status="active",
        )
        self.assertEqual(
            resolve_organization_context(self.member, self.workspace.pk),
            self.organization,
        )
        self.assertFalse(accessible_organizations(self.member).exists())
        self.api.force_authenticate(self.member)
        url = f"/api/workspaces/{self.workspace.pk}/organization_context/"
        response = self.api.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["organization_id"], self.organization.pk)
        self.assertNotIn("owner_user", response.data)
        self.assertEqual(self.api.get(url, {"organization_id": -1}).status_code, 403)
        self.assertEqual(
            self.api.get(f"/api/organizations/{self.organization.pk}/").status_code, 404
        )
        relation.status = "terminated"
        relation.save()
        self.assertEqual(self.api.get(url).status_code, 404)

    def test_owner_can_manage_members_but_member_cannot_add_others(self):
        url = f"/api/organizations/{self.organization.pk}/members/"
        response = self.api.post(url, {"user_id": self.member.pk}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.api.force_authenticate(self.member)
        self.assertEqual(
            self.api.post(url, {"user_id": self.outsider.pk}).status_code, 403
        )
        self.api.force_authenticate(self.owner)
        self.assertEqual(
            self.api.post(
                url, {"user_id": self.member.pk, "is_active": False}
            ).status_code,
            200,
        )
        self.assertFalse(accessible_organizations(self.member).exists())
        self.assertEqual(self.api.post(url, {"user_id": "bad"}).status_code, 400)
        self.assertEqual(self.api.post(url, {"user_id": 999999}).status_code, 404)

    def test_owner_can_create_multiple_workspaces_only_in_authorized_tenant(self):
        url = f"/api/organizations/{self.organization.pk}/workspaces/"
        response = self.api.post(
            url,
            {
                "name": "Second",
                "company": "Second",
                "email": "second@example.com",
                "organization": 999999,
                "owner_user": self.outsider.pk,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        second = Client.objects.get(pk=response.data["id"])
        self.assertEqual(second.organization_id, self.organization.pk)
        self.assertEqual(second.owner_user_id, self.owner.pk)
        self.assertEqual(len(self.api.get(url).data), 2)
        self.api.force_authenticate(self.outsider)
        self.assertEqual(self.api.post(url, {}).status_code, 404)

    def test_public_workspace_writes_cannot_change_tenant_or_owner(self):
        foreign = Organization.objects.create(name="Foreign", owner_user=self.outsider)
        url = f"/api/workspaces/{self.workspace.pk}/"
        response = self.api.patch(
            url,
            {
                "organization": foreign.pk,
                "owner_user": self.outsider.pk,
                "company": "Renamed",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.workspace.refresh_from_db()
        self.assertEqual(self.workspace.organization_id, self.organization.pk)
        self.assertEqual(self.workspace.owner_user_id, self.owner.pk)
        self.assertEqual(self.workspace.company, "Renamed")
        UserProfile.objects.create(user=self.owner, role="client")
        response = self.api.post(
            "/api/workspaces/",
            {
                "name": "New",
                "company": "New",
                "email": "new@example.com",
                "organization": foreign.pk,
                "owner_user": self.outsider.pk,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        new = Client.objects.get(pk=response.data["id"])
        self.assertNotEqual(new.organization_id, foreign.pk)
        self.assertEqual(new.organization.owner_user_id, self.owner.pk)

    def test_organization_policy_is_mandatory_in_authorization(self):
        self.organization.requires_approval = True
        self.organization.save()
        policy = WorkspaceMemberPolicy.objects.create(
            workspace=self.workspace,
            user=self.member,
            preset=RolePreset.objects.get(key="owner"),
            approval_overrides={"publish_posts": False},
        )
        for user in (self.owner, self.member):
            result = evaluate(user, self.workspace, "publish_posts")
            self.assertTrue(result.allowed)
            self.assertTrue(result.requires_approval)
        policy.is_active = False
        policy.save()
        self.assertFalse(evaluate(self.member, self.workspace, "publish_posts").allowed)


class OrganizationMigrationTests(unittest.TestCase):
    def test_historical_workspaces_keep_data_and_do_not_share_tenants(self):
        # A separate database exercises the real migration without reversing the
        # intentionally irreversible ownership backfill in the suite database.
        alias = "organization_migration"
        primary = connections["default"]
        schema = "organization_migration_" + uuid.uuid4().hex
        with tempfile.TemporaryDirectory() as directory:
            config = primary.settings_dict.copy()
            if primary.vendor == "postgresql":
                with primary.cursor() as cursor:
                    cursor.execute("CREATE SCHEMA " + primary.ops.quote_name(schema))
                config["OPTIONS"] = {"options": "-c search_path=" + schema}
                connection = type(primary)(config, alias=alias)
            else:
                config.update(
                    ENGINE="django.db.backends.sqlite3",
                    NAME=str(Path(directory) / "migration.sqlite3"),
                )
                connection = DatabaseWrapper(config, alias=alias)
            connections[alias] = connection
            try:
                executor = MigrationExecutor(connection)
                before = [("social_stats", "0075_telegram_advanced")]
                state = executor.loader.project_state(before)
                apps = state.apps
                # Build the affected tables from the real 0075 state. Older
                # unrelated data migrations hard-code the default DB alias.
                with connection.schema_editor() as editor:
                    for app, model in (
                        ("contenttypes", "ContentType"),
                        ("auth", "Permission"),
                        ("auth", "Group"),
                        ("auth", "User"),
                        ("social_stats", "Client"),
                        ("social_stats", "SocialAccount"),
                    ):
                        editor.create_model(apps.get_model(app, model))
                UserModel = apps.get_model("auth", "User")
                Workspace = apps.get_model("social_stats", "Client")
                Account = apps.get_model("social_stats", "SocialAccount")
                owner = UserModel.objects.using(alias).create(username="original-owner")
                original_ids = []
                for index in range(3):
                    workspace = Workspace.objects.using(alias).create(
                        name="Same",
                        company="Same",
                        email=f"old{index}@example.com",
                        owner_user_id=owner.pk if index < 2 else None,
                    )
                    original_ids.append(workspace.pk)
                    Account.objects.using(alias).create(
                        client=workspace,
                        platform="facebook",
                        external_id=str(index),
                    )
                after = [("social_stats", "0076_organization_tenancy")]
                executor.apply_migration(
                    state, executor.loader.get_migration(*after[0])
                )
                apps = executor.loader.project_state(after).apps
                Workspace = apps.get_model("social_stats", "Client")
                OrganizationModel = apps.get_model("social_stats", "Organization")
                rows = list(Workspace.objects.using(alias).order_by("pk"))
                self.assertEqual([row.pk for row in rows], original_ids)
                self.assertEqual(len({row.organization_id for row in rows}), 3)
                self.assertEqual(
                    list(
                        OrganizationModel.objects.using(alias)
                        .order_by("pk")
                        .values_list("owner_user_id", flat=True)
                    ),
                    [owner.pk, owner.pk, None],
                )
                self.assertEqual(
                    apps.get_model("social_stats", "OrganizationMembership")
                    .objects.using(alias)
                    .count(),
                    0,
                )
                self.assertEqual(
                    list(
                        apps.get_model("social_stats", "SocialAccount")
                        .objects.using(alias)
                        .order_by("pk")
                        .values_list("client_id", flat=True)
                    ),
                    original_ids,
                )
                backfill = import_module(
                    "social_stats.migrations.0076_organization_tenancy"
                ).backfill_organizations
                backfill(apps, SimpleNamespace(connection=connection))
                self.assertEqual(OrganizationModel.objects.using(alias).count(), 3)
            finally:
                connection.close()
                del connections[alias]
                if primary.vendor == "postgresql":
                    with primary.cursor() as cursor:
                        cursor.execute(
                            "DROP SCHEMA " + primary.ops.quote_name(schema) + " CASCADE"
                        )
