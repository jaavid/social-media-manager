"""Tenant ownership is independent of agency delegation and workspace grants."""

from django.conf import settings
from social_stats.entitlements import EntitledResourceMixin

from django.db import models


class Organization(models.Model):
    name = models.CharField(max_length=200)
    owner_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="owned_organizations",
    )
    requires_approval = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class OrganizationMembership(EntitledResourceMixin, models.Model):
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="memberships"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="organization_memberships",
    )
    role = models.CharField(max_length=20, choices=[('admin', 'Admin'), ('member', 'Member')], default='member')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = (
            models.UniqueConstraint(
                fields=["organization", "user"],
                name="unique_organization_membership",
            ),
        )


class OrganizationTeamInvitation(models.Model):
    """Email-bound, expiring invitation with explicit per-workspace grants."""

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='team_invitations')
    email = models.EmailField()
    token_digest = models.CharField(max_length=64, unique=True)
    organization_role = models.CharField(max_length=20, choices=[('admin', 'Admin'), ('member', 'Member')], default='member')
    workspace_grants = models.JSONField(default=list)
    invited_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='+')
    status = models.CharField(max_length=20, default='pending', choices=[('pending', 'Pending'), ('accepted', 'Accepted'), ('cancelled', 'Cancelled')])
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    accepted_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
