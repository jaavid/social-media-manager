# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""Sync models."""
from django.db import models
from social_stats.platforms.registry import PLATFORM_CHOICES

from social_stats.models.workspaces import Client, SYNC_STATUS
from social_stats.models.accounts import SocialAccount

class SyncLog(models.Model):
    client         = models.ForeignKey(Client, verbose_name='فضای کاری', on_delete=models.CASCADE, related_name='sync_logs', null=True)
    social_account = models.ForeignKey(SocialAccount, verbose_name='حساب شبکه اجتماعی', on_delete=models.SET_NULL, related_name='sync_logs', null=True, blank=True)
    platform       = models.CharField(verbose_name='پلتفرم', max_length=30, choices=PLATFORM_CHOICES)
    status         = models.CharField(verbose_name='وضعیت', max_length=20, choices=SYNC_STATUS, default='pending')
    records_synced = models.IntegerField(verbose_name='تعداد رکوردهای همگام‌شده', default=0)
    error_message  = models.TextField(verbose_name='شرح خطا', blank=True)
    started_at     = models.DateTimeField(verbose_name='زمان شروع', auto_now_add=True)
    finished_at    = models.DateTimeField(verbose_name='زمان پایان', null=True, blank=True)

    class Meta:
        verbose_name_plural = 'گزارش‌های همگام‌سازی'
        verbose_name = 'گزارش همگام‌سازی'
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.platform} | {self.get_status_display()} | {self.started_at:%Y-%m-%d %H:%M}"


# ── Content Calendar ───────────────────────────────────────────────────────────

