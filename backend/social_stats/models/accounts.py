# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""Accounts models."""
from social_stats.entitlements import EntitledResourceMixin

from django.db import models
from django.utils import timezone
from datetime import timedelta
from social_stats.fields import EncryptedTextField
from social_stats.platforms.registry import PLATFORM_CHOICES

from social_stats.models.workspaces import Client

class SocialAccount(EntitledResourceMixin, models.Model):
    """Public provider identity, intentionally separated from secret tokens."""
    client = models.ForeignKey(Client, verbose_name='فضای کاری', on_delete=models.CASCADE, related_name='social_accounts')
    platform = models.CharField(verbose_name='پلتفرم', max_length=30, choices=PLATFORM_CHOICES)
    external_id = models.CharField(verbose_name='شناسه در پلتفرم', max_length=200)
    display_name = models.CharField(verbose_name='نام نمایشی', max_length=200, blank=True)
    username = models.CharField(verbose_name='نام کاربری', max_length=200, blank=True)
    avatar_url = models.URLField(verbose_name='نشانی تصویر پروفایل', max_length=500, blank=True)
    metadata = models.JSONField(verbose_name='اطلاعات تکمیلی', default=dict, blank=True)
    is_active = models.BooleanField(verbose_name='فعال', default=True)
    created_at = models.DateTimeField(verbose_name='زمان ایجاد', auto_now_add=True)
    updated_at = models.DateTimeField(verbose_name='آخرین ویرایش', auto_now=True)

    class Meta:
        verbose_name_plural = 'حساب‌های شبکه‌های اجتماعی'
        verbose_name = 'حساب شبکه اجتماعی'
        ordering = ['platform', 'display_name', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['client', 'platform', 'external_id'],
                name='unique_social_account_identity',
            ),
        ]

    def __str__(self):
        return self.display_name or f'{self.get_platform_display()} ({self.external_id})'


class PlatformCredential(models.Model):
    client        = models.ForeignKey(Client, verbose_name='فضای کاری', on_delete=models.CASCADE, related_name='credentials')
    platform      = models.CharField(verbose_name='پلتفرم', max_length=30, choices=PLATFORM_CHOICES)
    social_account = models.OneToOneField(
        SocialAccount, verbose_name='حساب شبکه اجتماعی', on_delete=models.CASCADE, related_name='credential',
        null=True, blank=True,
    )

    # OAuth tokens (AES-encrypted at rest)
    access_token  = EncryptedTextField(verbose_name='توکن دسترسی', blank=True)
    refresh_token = EncryptedTextField(verbose_name='توکن تمدید دسترسی', blank=True)
    token_type    = models.CharField(verbose_name='نوع توکن', max_length=50, blank=True, default='Bearer')
    expires_at    = models.DateTimeField(verbose_name='زمان انقضا', null=True, blank=True)
    scope         = models.TextField(verbose_name='دامنه دسترسی', blank=True)

    platform_user_id = models.CharField(verbose_name='شناسه کاربر در پلتفرم', max_length=80, blank=True, db_index=True)

    # Platform-specific IDs (auto-fetched after OAuth)
    page_id              = models.CharField(verbose_name='شناسه صفحه فیسبوک', max_length=200, blank=True)   # Facebook Page ID
    page_name            = models.CharField(verbose_name='نام صفحه فیسبوک', max_length=200, blank=True)   # Facebook Page Name
    instagram_account_id = models.CharField(verbose_name='شناسه حساب اینستاگرام', max_length=200, blank=True)   # IG Business Account ID
    channel_id           = models.CharField(verbose_name='شناسه کانال یوتیوب', max_length=200, blank=True)   # YouTube Channel ID
    channel_name         = models.CharField(verbose_name='نام کانال یوتیوب', max_length=200, blank=True)   # YouTube Channel Name
    organization_id      = models.CharField(verbose_name='شناسه سازمان لینکدین', max_length=200, blank=True)   # LinkedIn Org ID
    organization_name    = models.CharField(verbose_name='نام سازمان لینکدین', max_length=200, blank=True)   # LinkedIn Org Name
    gmb_account_id       = models.CharField(verbose_name='شناسه حساب کسب‌وکار گوگل', max_length=200, blank=True)   # GMB Account
    gmb_location_id      = models.CharField(verbose_name='شناسه موقعیت کسب‌وکار گوگل', max_length=200, blank=True)   # GMB Location

    # Observed auth failures only. Empty means no recorded evidence, not health.
    auth_failure_code = models.CharField(verbose_name='دلیل خطای احراز هویت', max_length=32, blank=True, default='', editable=False,
                                        choices=[('token_expired', 'Token expired'), ('revoked', 'Revoked')])

    is_active    = models.BooleanField(verbose_name='فعال', default=True)
    connected_at = models.DateTimeField(verbose_name='زمان اتصال', auto_now_add=True)
    updated_at   = models.DateTimeField(verbose_name='آخرین ویرایش', auto_now=True)

    # How the credential was provisioned. 'oauth' = via Social Stats-owned OAuth app.
    # 'manual_token' = client pasted their own token from their dev account.
    # 'system_user' = Meta System User token (long-lived, ideal for prod).
    auth_method  = models.CharField(
        verbose_name='روش احراز هویت', max_length=20,
        choices=[('oauth', 'احراز هویت OAuth'), ('manual_token', 'توکن دستی'), ('system_user', 'کاربر سیستمی')],
        default='oauth',
    )

    class Meta:
        verbose_name_plural = 'اطلاعات اتصال پلتفرم‌ها'
        verbose_name = 'اطلاعات اتصال پلتفرم'
        ordering = ['platform']

    def __str__(self):
        return f"{self.client.company} — {self.get_platform_display()}"

    def mark_auth_failure(self, code):
        if code not in {'token_expired', 'revoked'}:
            raise ValueError('Unknown credential failure code')
        self.auth_failure_code = code
        self.is_active = False
        self.save(update_fields=['auth_failure_code', 'is_active', 'updated_at'])

    @property
    def is_expired(self):
        if not self.expires_at:
            return False
        return timezone.now() >= self.expires_at - timedelta(minutes=10)

    @property
    def status(self):
        if not self.access_token:
            return 'not_connected'
        if self.is_expired:
            return 'expired'
        return 'active'


class ManualCredentialExtras(models.Model):
    """
    Sibling row holding the client-provided Google OAuth-app credentials
    (and optional API key) used by manual-mode YouTube and GMB connections.

    PlatformCredential.access_token / refresh_token already hold the per-account
    tokens; this row only adds the user's Google Cloud OAuth client identity
    so the existing token-refresh path can keep working without an
    Social Stats-owned OAuth app. Encrypted at rest (same Fernet pipeline as tokens).
    """
    credential          = models.OneToOneField(PlatformCredential, on_delete=models.CASCADE, related_name='manual_extras')
    oauth_client_id     = EncryptedTextField(blank=True)
    oauth_client_secret = EncryptedTextField(blank=True)
    api_key             = EncryptedTextField(blank=True)
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Manual extras — {self.credential}"


# ── Daily Aggregated Metrics ───────────────────────────────────────────────────
