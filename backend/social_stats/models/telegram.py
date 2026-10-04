# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""Telegram models."""
from django.db import models
from django.contrib.auth.models import User
from social_stats.fields import EncryptedTextField

from social_stats.models.workspaces import Client
from social_stats.models.inbox import Conversation
from social_stats.models.accounts import SocialAccount
from social_stats.models.publishing import UnifiedPost

class TelegramIntegration(models.Model):
    """Account-scoped routing and encrypted webhook credentials."""
    account = models.OneToOneField(SocialAccount, on_delete=models.CASCADE, related_name='telegram_config')
    webhook_secret = EncryptedTextField(blank=True)
    webhook_enabled = models.BooleanField(default=False)
    destination_context = models.JSONField(default=dict, blank=True)
    assistant_enabled = models.BooleanField(default=False)
    rich_enabled = models.BooleanField(default=True)
    assistant_rich = models.BooleanField(default=False)
    last_update_at = models.DateTimeField(null=True, blank=True)
    replay_floor = models.BigIntegerField(default=-1)


class TelegramUpdate(models.Model):
    account = models.ForeignKey(SocialAccount, on_delete=models.CASCADE)
    update_id = models.BigIntegerField()
    payload = models.JSONField(default=dict)
    status = models.CharField(max_length=20, default='pending')
    retry_at = models.DateTimeField(null=True, blank=True)
    retry_count = models.PositiveSmallIntegerField(default=0)
    error_code = models.CharField(max_length=80, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['account', 'update_id'], name='telegram_unique_update')]


class TelegramSuggestion(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE)
    account = models.ForeignKey(SocialAccount, on_delete=models.CASCADE)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE)
    message_id = models.BigIntegerField()
    content = models.TextField(blank=True)
    media = models.JSONField(default=dict)
    proposal = models.JSONField(default=dict)
    provider_update_id = models.BigIntegerField(default=-1)
    provider_state = models.CharField(max_length=30, default='pending')
    state = models.CharField(max_length=30, default='received')
    draft = models.ForeignKey(UnifiedPost, null=True, blank=True, on_delete=models.SET_NULL)
    decided_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['account', 'conversation', 'message_id'], name='telegram_unique_suggestion')]


class TelegramCallback(models.Model):
    token = models.CharField(max_length=64, unique=True)
    account = models.ForeignKey(SocialAccount, on_delete=models.CASCADE)
    chat_id = models.CharField(max_length=80)
    action = models.CharField(max_length=30, default='acknowledge')
    expires_at = models.DateTimeField()
    # Acknowledgements record interaction only; never execute workspace mutations.
    consumed_at = models.DateTimeField(null=True, blank=True)
    telegram_user_id = models.BigIntegerField(null=True, blank=True)


class TelegramAssistantLink(models.Model):
    """An operator explicitly links a Telegram identity to an application identity."""
    account = models.ForeignKey(SocialAccount, on_delete=models.CASCADE)
    telegram_user_id = models.BigIntegerField()
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='+')

    class Meta:
        constraints = [models.UniqueConstraint(fields=['account', 'telegram_user_id'], name='telegram_unique_identity_link')]


class TelegramAssistantRun(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE)
    source_update = models.OneToOneField(TelegramUpdate, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    prompt = models.TextField()
    draft_id = models.PositiveIntegerField()
    state = models.CharField(max_length=20, default='pending')
    cancelled = models.BooleanField(default=False)
    response = models.TextField(blank=True)
    error_code = models.CharField(max_length=80, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
