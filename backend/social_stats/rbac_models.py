"""Additive RBAC data; legacy rows remain authoritative compatibility inputs."""

from django.conf import settings
from django.db import models


def validate_action_map(value):
    from django.core.exceptions import ValidationError
    from .marketplace_models import AGENCY_CLIENT_PERMISSIONS

    keys = set(AGENCY_CLIENT_PERMISSIONS) | {"approve_posts"}
    if not isinstance(value, dict) or any(
        key not in keys or type(flag) is not bool for key, flag in value.items()
    ):
        raise ValidationError("Expected known action keys with boolean values")


class RolePreset(models.Model):
    key = models.SlugField(unique=True)
    label = models.CharField(max_length=100)
    permissions = models.JSONField(default=dict, blank=True)
    approval_defaults = models.JSONField(default=dict, blank=True)

    def clean(self):
        validate_action_map(self.permissions)
        validate_action_map(self.approval_defaults)


class WorkspaceMemberPolicy(models.Model):
    workspace = models.ForeignKey(
        "social_stats.Client", on_delete=models.CASCADE, related_name="member_policies"
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    preset = models.ForeignKey(
        RolePreset, null=True, blank=True, on_delete=models.PROTECT
    )
    permissions = models.JSONField(default=dict, blank=True)
    approval_overrides = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["workspace", "user"], name="unique_workspace_member_policy"
            )
        ]


class SocialAccountPermissionOverride(models.Model):
    account = models.ForeignKey(
        "social_stats.SocialAccount",
        on_delete=models.CASCADE,
        related_name="permission_overrides",
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    permissions = models.JSONField(default=dict, blank=True)
    approval_overrides = models.JSONField(default=dict, blank=True)
    note = models.CharField(max_length=300, blank=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["account", "user"],
                name="unique_account_user_permission_override",
            )
        ]
