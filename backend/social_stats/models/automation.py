# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""Automation models."""
from social_stats.entitlements import EntitledCapabilityMixin

from django.db import models
from django.contrib.auth.models import User

from social_stats.models.workspaces import Client

AUTOMATION_ACTION_CHOICES = [
    ('auto_reply',     'پاسخ خودکار'),
    ('ai_smart_reply', 'پاسخ هوشمند با هوش مصنوعی'),
    ('notify',         'ارسال اعلان'),
    ('assign',         'تخصیص به کاربر'),
    ('add_tag',        'افزودن برچسب'),
    ('webhook',        'فراخوانی وب‌هوک'),
]


AUTOMATION_TRIGGER_CHOICES = [
    ('new_comment',         'دیدگاه جدید'),
    ('new_dm',              'پیام مستقیم جدید'),
    ('new_review',          'نظر جدید مشتری'),
    ('keyword_mention',     'اشاره به کلیدواژه'),
    ('negative_sentiment',  'تشخیص احساس منفی'),
    ('viral_post',          'افزایش سریع بازدید پست'),
    ('new_follower',        'دنبال‌کننده جدید'),
]


class AutomationRule(EntitledCapabilityMixin, models.Model):
    """IF (trigger + filters) THEN action — runs on inbox/engagement events."""

    entitlement_capability = 'automations'
    client          = models.ForeignKey(Client, verbose_name='فضای کاری', on_delete=models.CASCADE, related_name='automation_rules')
    name            = models.CharField(verbose_name='نام', max_length=200)
    trigger_type    = models.CharField(verbose_name='نوع محرک', max_length=40, choices=AUTOMATION_TRIGGER_CHOICES)
    trigger_filters = models.JSONField(verbose_name='شرط‌های محرک', default=dict, blank=True, help_text='شرط‌ها در قالب JSON با کلیدهایی مانند platforms، keywords و sentiment.')
    action_type     = models.CharField(verbose_name='نوع عملیات', max_length=40, choices=AUTOMATION_ACTION_CHOICES)
    action_config   = models.JSONField(verbose_name='تنظیمات عملیات', default=dict, blank=True)
    is_active       = models.BooleanField(verbose_name='فعال', default=True)
    run_count       = models.IntegerField(verbose_name='تعداد اجرا', default=0)
    last_run_at     = models.DateTimeField(verbose_name='زمان آخرین اجرا', null=True, blank=True)
    created_by      = models.ForeignKey(User, verbose_name='ایجادکننده', on_delete=models.SET_NULL, null=True, blank=True, related_name='created_automation_rules')
    created_at      = models.DateTimeField(verbose_name='زمان ایجاد', auto_now_add=True)
    updated_at      = models.DateTimeField(verbose_name='آخرین ویرایش', auto_now=True)

    class Meta:
        verbose_name_plural = 'قانون‌های خودکارسازی'
        verbose_name = 'قانون خودکارسازی'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['client', 'is_active', 'trigger_type']),
        ]

    def __str__(self):
        return f"{self.client.company} | {self.trigger_type} → {self.action_type}"


# ── Competitor snapshots ──────────────────────────────────────────────────────
