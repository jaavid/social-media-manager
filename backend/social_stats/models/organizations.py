"""Tenant ownership is independent of agency delegation and workspace grants."""

from django.conf import settings
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


class OrganizationMembership(models.Model):
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="memberships"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="organization_memberships",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = (
            models.UniqueConstraint(
                fields=["organization", "user"],
                name="unique_organization_membership",
            ),
        )
