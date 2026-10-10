"""Temporary, read-only Telegram Cloud access; separate from publisher accounts."""
from django.conf import settings
from django.db import models


class TelegramCloudLinkCode(models.Model):
    """One short-lived, single-use device-link challenge per authenticated user."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="tgcloud_link_code"
    )
    code_hash = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)


class TelegramCloudSession(models.Model):
    """Revocable, hashed bearer credential for a linked Telegram identity."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="tgcloud_session"
    )
    telegram_user_id = models.BigIntegerField(unique=True)
    token_hash = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
