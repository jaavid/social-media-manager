"""Ordinary users onboard and manage isolated brands without platform privileges."""
import re
from datetime import timedelta
from unittest.mock import patch
from django.contrib.auth.models import User
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from social_stats.authorization import accessible_workspaces, evaluate
from social_stats.models import (
    Client, Organization, OrganizationMembership, OrganizationTeamInvitation,
    UserProfile, WorkspaceMemberPolicy, RolePreset, EmailVerificationToken,
)


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class OrganizationTeamTests(TestCase):
    def setUp(self):
        cache.clear()
        self.owner = self.user('owner@example.com')
        self.designer = self.user('designer@example.com')
        self.outsider = self.user('outsider@example.com')
        self.organization = Organization.objects.create(name='Negative Five', owner_user=self.owner)
        self.sky = Client.objects.create(organization=self.organization, owner_user=self.owner,
                                         name='Owner', company='Sky Den', email=self.owner.email)
        self.school = Client.objects.create(organization=self.organization, owner_user=self.owner,
                                            name='Owner', company='School', email=self.owner.email)
        self.other = Client.objects.create(owner_user=self.outsider, name='Other', company='Other', email=self.outsider.email)
        self.api = APIClient()
        self.api.force_authenticate(self.owner)

    def user(self, email):
        user = User.objects.create_user(email, email=email, password='A-secure-test-pass-483')
        UserProfile.objects.create(user=user, role='client', account_type='end_user', email_verified=True)
        return user

    def invite(self, email=None, preset='designer', role='member', grants=None):
        response = self.api.post(f'/api/organizations/{self.organization.pk}/invitations/', {
            'email': email or self.designer.email, 'organization_role': role,
            'workspace_grants': grants or [{'workspace_id': self.sky.pk, 'preset': preset}],
        }, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(response.data['email_sent'])
        token = re.search(r'/join-team\?token=([\w-]+)', mail.outbox[-1].body).group(1)
        return response.data['id'], token

    def test_designer_accepts_only_selected_brand_without_owner_escalation(self):
        invitation_id, token = self.invite()
        self.api.force_authenticate(self.designer)
        response = self.api.post('/api/organization-team/invitation/', {'token': token}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(list(accessible_workspaces(self.designer)), [self.sky])
        self.assertTrue(evaluate(self.designer, self.sky, 'draft_posts').allowed)
        for action in ['publish_posts', 'schedule_posts', 'approve_posts', 'change_billing', 'manage_team', 'view_inbox']:
            self.assertFalse(evaluate(self.designer, self.sky, action).allowed, action)
        self.designer.profile.refresh_from_db()
        self.assertIsNone(self.designer.profile.client_id)
        self.assertEqual(self.designer.profile.default_workspace_id, self.sky.pk)
        self.assertFalse(self.designer.is_staff)
        self.assertEqual(self.api.get('/api/auth/me/').data['workspace_id'], self.sky.pk)
        self.assertEqual(self.api.put('/api/end-user/workspace/', {'company': 'stolen'}, format='json').status_code, 403)
        self.assertEqual(self.api.post('/api/organization-team/invitation/', {'token': token}, format='json').status_code, 400)
        self.assertEqual(OrganizationTeamInvitation.objects.get(pk=invitation_id).status, 'accepted')

    def test_foreign_workspace_and_owner_preset_are_rejected_before_email(self):
        for workspace_id, preset in [(self.other.pk, 'designer'), (self.sky.pk, 'owner')]:
            response = self.api.post(f'/api/organizations/{self.organization.pk}/invitations/', {
                'email': self.designer.email, 'workspace_grants': [{'workspace_id': workspace_id, 'preset': preset}],
            }, format='json')
            self.assertEqual(response.status_code, 400)
        self.assertEqual(OrganizationTeamInvitation.objects.count(), 0)

    def test_wrong_email_expiry_cancel_and_unverified_account_are_denied(self):
        invitation_id, token = self.invite()
        self.api.force_authenticate(self.outsider)
        self.assertEqual(self.api.post('/api/organization-team/invitation/', {'token': token}, format='json').status_code, 403)
        self.api.force_authenticate(self.designer)
        self.designer.profile.email_verified = False
        self.designer.profile.save()
        self.assertEqual(self.api.post('/api/organization-team/invitation/', {'token': token}, format='json').status_code, 403)
        OrganizationTeamInvitation.objects.filter(pk=invitation_id).update(expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.api.get('/api/organization-team/invitation/', {'token': token}).status_code, 400)
        self.api.force_authenticate(self.owner)
        self.assertEqual(self.api.delete(f'/api/organizations/{self.organization.pk}/invitations/{invitation_id}/').status_code, 204)

    def test_org_admin_manages_members_but_cannot_appoint_admin_or_change_billing(self):
        invitation_id, _ = self.invite(self.designer.email, 'workspace-admin', 'admin')
        self.api.force_authenticate(self.designer)
        self.assertEqual(self.api.post(f'/api/organization-team/invitations/{invitation_id}/accept/').status_code, 200)
        self.assertEqual(self.api.get(f'/api/organizations/{self.organization.pk}/members/').status_code, 200)
        self.assertEqual(self.api.patch(f'/api/organizations/{self.organization.pk}/', {'name': 'changed'}, format='json').status_code, 403)
        self.assertFalse(evaluate(self.designer, self.sky, 'change_billing').allowed)
        response = self.api.post(f'/api/organizations/{self.organization.pk}/invitations/', {
            'email': self.outsider.email, 'organization_role': 'admin',
            'workspace_grants': [{'workspace_id': self.sky.pk, 'preset': 'designer'}],
        }, format='json')
        self.assertEqual(response.status_code, 403)
        response = self.api.post(f'/api/organizations/{self.organization.pk}/workspaces/', {
            'company': 'New brand', 'name': 'Owner', 'email': self.owner.email,
        }, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['owner_user'], self.owner.pk)
        self.assertEqual(self.api.get(f'/api/organizations/{self.other.organization_id}/members/').status_code, 404)

    def test_revocation_removes_brand_access_and_session_default(self):
        invitation_id, _ = self.invite()
        self.api.force_authenticate(self.designer)
        self.api.post(f'/api/organization-team/invitations/{invitation_id}/accept/')
        self.api.force_authenticate(self.owner)
        response = self.api.put(f'/api/organizations/{self.organization.pk}/team/{self.designer.pk}/', {
            'is_active': False, 'organization_role': 'member',
        }, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertFalse(accessible_workspaces(self.designer).exists())
        self.assertFalse(evaluate(self.designer, self.sky, 'draft_posts').allowed)
        self.api.force_authenticate(self.designer)
        self.assertIsNone(self.api.get('/api/auth/me/').data['workspace_id'])
        self.assertEqual(self.api.get('/api/end-user/workspace/').status_code, 404)

    def test_revoked_inviter_cannot_grant_old_invitation(self):
        invitation_id, _ = self.invite(self.designer.email, 'workspace-admin', 'admin')
        self.api.force_authenticate(self.designer)
        self.api.post(f'/api/organization-team/invitations/{invitation_id}/accept/')
        other_id, token = self.invite(self.outsider.email)
        self.api.force_authenticate(self.owner)
        self.api.put(f'/api/organizations/{self.organization.pk}/team/{self.designer.pk}/', {
            'is_active': False, 'organization_role': 'member',
        }, format='json')
        self.api.force_authenticate(self.outsider)
        self.assertEqual(self.api.post('/api/organization-team/invitation/', {'token': token}).status_code, 403)
        self.assertEqual(OrganizationTeamInvitation.objects.get(pk=other_id).status, 'pending')

    @patch('social_stats.views.organization_team.send_mail', side_effect=RuntimeError('provider offline'))
    def test_delivery_failure_is_reported_and_pending_invite_is_preserved(self, send):
        response = self.api.post(f'/api/organizations/{self.organization.pk}/invitations/', {
            'email': self.designer.email, 'workspace_grants': [{'workspace_id': self.sky.pk, 'preset': 'designer'}],
        }, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertFalse(response.data['email_sent'])
        self.assertEqual(OrganizationTeamInvitation.objects.count(), 1)

    def test_brand_manager_can_approve_but_cannot_publish(self):
        WorkspaceMemberPolicy.objects.create(workspace=self.school, user=self.designer,
                                             preset=RolePreset.objects.get(key='brand-manager'))
        self.assertTrue(evaluate(self.designer, self.school, 'approve_posts').allowed)
        self.assertFalse(evaluate(self.designer, self.school, 'publish_posts').allowed)
        self.assertFalse(evaluate(self.designer, self.sky, 'view_posts').allowed)

    def test_selection_uses_canonical_workspace_input_and_checks_tenant(self):
        response = self.api.post(f'/api/organizations/{self.organization.pk}/select_workspace/',
                                 {'workspace_id': self.school.pk}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(self.api.get('/api/auth/me/').data['workspace_id'], self.school.pk)
        response = self.api.post(f'/api/organizations/{self.organization.pk}/select_workspace/',
                                 {'workspace_id': self.other.pk}, format='json')
        self.assertEqual(response.status_code, 404)

    def test_admin_cannot_elevate_self_owner_or_member_billing_via_policy_api(self):
        OrganizationMembership.objects.create(organization=self.organization, user=self.designer, role='admin')
        WorkspaceMemberPolicy.objects.create(workspace=self.sky, user=self.designer,
                                             preset=RolePreset.objects.get(key='workspace-admin'))
        WorkspaceMemberPolicy.objects.create(workspace=self.sky, user=self.outsider,
                                             preset=RolePreset.objects.get(key='designer'))
        self.api.force_authenticate(self.designer)
        base = f'/api/management/workspaces/{self.sky.pk}/team-policy'
        for user_id, data in [(self.designer.pk, {'preset': 'owner'}),
                              (self.owner.pk, {'preset': 'designer'}),
                              (self.outsider.pk, {'preset': 'owner'}),
                              (self.outsider.pk, {'permissions': {'change_billing': True}})]:
            self.assertEqual(self.api.put(f'{base}/{user_id}/', data, format='json').status_code, 403)

    def test_member_quota_failure_leaves_invitation_and_grants_unchanged(self):
        from social_stats.models import Subscription
        subscription = Subscription.objects.get(organization=self.organization)
        subscription.plan = 'org-free'
        subscription.save(update_fields=['plan'])
        for email in ['quota-one@example.com', 'quota-two@example.com']:
            OrganizationMembership.objects.create(organization=self.organization, user=self.user(email))
        invitation_id, _ = self.invite()
        self.api.force_authenticate(self.designer)
        response = self.api.post(f'/api/organization-team/invitations/{invitation_id}/accept/')
        self.assertEqual(response.status_code, 403)
        self.assertFalse(OrganizationMembership.objects.filter(organization=self.organization, user=self.designer).exists())
        self.assertFalse(WorkspaceMemberPolicy.objects.filter(user=self.designer).exists())
        self.assertEqual(OrganizationTeamInvitation.objects.get(pk=invitation_id).status, 'pending')


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class VerifiedSignupTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_both_signup_apis_require_email_verification_and_explicit_onboarding(self):
        for index, path in enumerate(['/api/auth/signup/', '/api/end-user/signup/']):
            api = APIClient()
            email = f'signup{index}@example.com'
            response = api.post(path, {'full_name': 'Team Owner', 'email': email,
                                      'password': 'A-secure-test-pass-483', 'terms_accepted': True}, format='json')
            self.assertEqual(response.status_code, 201, response.data)
            user = User.objects.get(email=email)
            self.assertFalse(user.is_active)
            self.assertFalse(user.profile.email_verified)
            self.assertEqual(Organization.objects.count(), 0)
            token = EmailVerificationToken.objects.get(user=user)
            response = api.get(f'/api/auth/verify-email/?token={token.token}')
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data['next_url'], '/u/organizations')
            user.refresh_from_db()
            self.assertTrue(user.is_active)
            api.force_authenticate(user)
            api.get('/api/auth/me/')
            self.assertEqual(Organization.objects.count(), 0)
            self.assertFalse(user.is_staff)

    @patch('social_stats.views.auth.send_mail', side_effect=RuntimeError('offline'))
    def test_signup_reports_email_failure_without_losing_recovery_account(self, send):
        response = APIClient().post('/api/auth/signup/', {
            'full_name': 'Owner', 'email': 'recover@example.com',
            'password': 'A-secure-test-pass-483', 'terms_accepted': True,
        }, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertFalse(response.data['email_sent'])
        self.assertTrue(EmailVerificationToken.objects.filter(user__email='recover@example.com').exists())

    def test_invited_signup_verifies_then_accepts_without_creating_an_organization(self):
        owner = User.objects.create_user('invite-owner', email='invite-owner@example.com')
        UserProfile.objects.create(user=owner, role='client', account_type='end_user')
        workspace = Client.objects.create(owner_user=owner, company='School', name='Owner', email=owner.email)
        api = APIClient()
        api.force_authenticate(owner)
        response = api.post(f'/api/organizations/{workspace.organization_id}/invitations/', {
            'email': 'new-member@example.com',
            'workspace_grants': [{'workspace_id': workspace.pk, 'preset': 'designer'}],
        }, format='json')
        self.assertEqual(response.status_code, 201)
        invitation_id = response.data['id']
        token = re.search(r'/join-team\?token=([\w-]+)', mail.outbox[-1].body).group(1)
        api.force_authenticate(None)
        response = api.post('/api/auth/signup/', {
            'full_name': 'New Designer', 'email': 'new-member@example.com',
            'password': 'A-secure-test-pass-483', 'terms_accepted': True, 'team_invite': token,
        }, format='json')
        self.assertEqual(response.status_code, 201)
        new_user = User.objects.get(email='new-member@example.com')
        verification = new_user.email_verification
        self.assertEqual(api.get('/api/auth/verify-email/', {'token': str(verification.token)}).status_code, 200)
        new_user.refresh_from_db()
        api.force_authenticate(new_user)
        self.assertEqual(Organization.objects.count(), 1)
        self.assertEqual(len(api.get('/api/organization-team/invitations/').data), 1)
        self.assertEqual(api.post(f'/api/organization-team/invitations/{invitation_id}/accept/').status_code, 200)
        self.assertEqual(Organization.objects.count(), 1)
        self.assertTrue(evaluate(new_user, workspace, 'draft_posts').allowed)
        self.assertFalse(evaluate(new_user, workspace, 'publish_posts').allowed)
