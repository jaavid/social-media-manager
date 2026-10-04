# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""Inbox models."""
from django.db import models
from django.contrib.auth.models import User
from social_stats.platforms.registry import PLATFORM_CHOICES

from social_stats.models.workspaces import Client
from social_stats.models.publishing import PlatformPublishLog
from social_stats.models.accounts import SocialAccount

REVIEW_STATUS_CHOICES = [
    ('new',     'جدید'),
    ('replied', 'پاسخ داده شده'),
    ('flagged', 'علامت‌گذاری شده'),
]


SENTIMENT_CHOICES = [
    ('positive', 'مثبت'),
    ('neutral',  'خنثی'),
    ('negative', 'منفی'),
    ('unknown',  'نامشخص'),
]


MESSAGE_DIRECTION_CHOICES = [
    ('inbound',  'دریافتی'),
    ('outbound', 'ارسالی'),
]


CONVERSATION_TYPE_CHOICES = [
    ('comment',  'دیدگاه'),
    ('dm',       'پیام مستقیم'),
    ('mention',  'اشاره به حساب'),
    ('review',   'نظر مشتری'),
]


class Conversation(models.Model):
    """A thread on any platform — DM, comment thread, mention, or review."""
    client              = models.ForeignKey(Client, verbose_name='فضای کاری', on_delete=models.CASCADE, related_name='conversations')
    platform            = models.CharField(verbose_name='پلتفرم', max_length=30, choices=PLATFORM_CHOICES)
    social_account      = models.ForeignKey(SocialAccount, verbose_name='حساب شبکه اجتماعی', on_delete=models.SET_NULL, related_name='conversations', null=True, blank=True)
    platform_thread_id  = models.CharField(verbose_name='شناسه گفتگو در پلتفرم', max_length=300, db_index=True)
    type                = models.CharField(verbose_name='نوع گفتگو', max_length=20, choices=CONVERSATION_TYPE_CHOICES, default='comment')
    contact_name        = models.CharField(verbose_name='نام مخاطب', max_length=200, blank=True)
    contact_handle      = models.CharField(verbose_name='نام کاربری مخاطب', max_length=200, blank=True)
    contact_avatar_url  = models.URLField(verbose_name='نشانی تصویر مخاطب', blank=True)
    last_message_preview = models.CharField(verbose_name='پیش‌نمایش آخرین پیام', max_length=500, blank=True)
    last_message_at     = models.DateTimeField(verbose_name='زمان آخرین پیام', null=True, blank=True)
    last_outbound_at    = models.DateTimeField(verbose_name='زمان آخرین پیام ارسالی', null=True, blank=True)
    unread_count        = models.IntegerField(verbose_name='تعداد پیام‌های خوانده‌نشده', default=0)
    is_starred          = models.BooleanField(verbose_name='ستاره‌دار', default=False)
    is_archived         = models.BooleanField(verbose_name='بایگانی شده', default=False)
    is_resolved         = models.BooleanField(verbose_name='رسیدگی شده', default=False)
    assigned_to         = models.ForeignKey(User, verbose_name='مسئول رسیدگی', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_conversations')
    sentiment           = models.CharField(verbose_name='احساس متن', max_length=20, choices=SENTIMENT_CHOICES, default='unknown')
    linked_publish_log  = models.ForeignKey(PlatformPublishLog, verbose_name='گزارش انتشار مرتبط', on_delete=models.SET_NULL, null=True, blank=True, related_name='conversations')
    linked_flow         = models.ForeignKey('social_stats.BotFlow', verbose_name='جریان ربات مرتبط', on_delete=models.SET_NULL, null=True, blank=True, related_name='inbox_conversations')
    tags                = models.JSONField(verbose_name='برچسب‌ها', default=list, blank=True)
    created_at          = models.DateTimeField(verbose_name='زمان ایجاد', auto_now_add=True)
    updated_at          = models.DateTimeField(verbose_name='آخرین ویرایش', auto_now=True)

    class Meta:
        verbose_name_plural = 'گفتگوها'
        verbose_name = 'گفتگو'
        unique_together = ('client', 'platform', 'social_account', 'platform_thread_id')
        ordering = ['-last_message_at']
        indexes = [
            models.Index(fields=['client', '-last_message_at']),
            models.Index(fields=['client', 'is_archived', 'is_resolved']),
            models.Index(fields=['client', 'platform', 'type']),
        ]

    def __str__(self):
        return f"{self.client.company} | {self.platform} | {self.contact_handle or self.contact_name}"


class Message(models.Model):
    """An individual message inside a Conversation."""
    conversation         = models.ForeignKey(Conversation, verbose_name='گفتگو', on_delete=models.CASCADE, related_name='messages')
    platform_message_id  = models.CharField(verbose_name='شناسه پیام در پلتفرم', max_length=300, blank=True, db_index=True)
    direction            = models.CharField(verbose_name='جهت پیام', max_length=10, choices=MESSAGE_DIRECTION_CHOICES, default='inbound')
    author_name          = models.CharField(verbose_name='نام نویسنده', max_length=200, blank=True)
    author_handle        = models.CharField(verbose_name='نام کاربری نویسنده', max_length=200, blank=True)
    author_avatar_url    = models.URLField(verbose_name='نشانی تصویر نویسنده', blank=True)
    content              = models.TextField(verbose_name='محتوا', blank=True)
    media_urls           = models.JSONField(verbose_name='نشانی‌های رسانه', default=list, blank=True)
    sent_at              = models.DateTimeField(verbose_name='زمان ارسال', null=True, blank=True)
    read_at              = models.DateTimeField(verbose_name='زمان خواندن', null=True, blank=True)
    replied_at           = models.DateTimeField(verbose_name='زمان پاسخ', null=True, blank=True)
    sentiment            = models.CharField(verbose_name='احساس متن', max_length=20, choices=SENTIMENT_CHOICES, default='unknown')
    ai_suggested_reply   = models.TextField(verbose_name='پاسخ پیشنهادی هوش مصنوعی', blank=True)
    sent_by              = models.ForeignKey(User, verbose_name='ارسال‌کننده', on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_messages', help_text='کاربری که پاسخ خروجی را نوشته است.')
    linked_bot_step      = models.ForeignKey('social_stats.BotConversationStep', verbose_name='مرحله مرتبط ربات', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    created_at           = models.DateTimeField(verbose_name='زمان ایجاد', auto_now_add=True)

    class Meta:
        verbose_name_plural = 'پیام‌ها'
        verbose_name = 'پیام'
        ordering = ['sent_at', 'id']
        indexes = [
            models.Index(fields=['conversation', 'sent_at']),
        ]

    def __str__(self):
        return f"{self.conversation_id} | {self.get_direction_display()} | {self.content[:40]}"


class UnifiedReview(models.Model):
    """
    Cross-platform review (currently GMB; structured for future Yelp/TripAdvisor too).
    Distinct from the existing GMBReview so we can extend without disturbing the
    legacy GMB sync. New review syncs populate this; existing GMBReview stays.
    """
    client              = models.ForeignKey(Client, verbose_name='فضای کاری', on_delete=models.CASCADE, related_name='unified_reviews')
    platform            = models.CharField(verbose_name='پلتفرم', max_length=30, choices=PLATFORM_CHOICES, default='google_my_business')
    social_account      = models.ForeignKey(SocialAccount, verbose_name='حساب شبکه اجتماعی', on_delete=models.SET_NULL, related_name='reviews', null=True, blank=True)
    platform_review_id  = models.CharField(verbose_name='شناسه نظر در پلتفرم', max_length=300, db_index=True)
    reviewer_name       = models.CharField(verbose_name='نام ثبت‌کننده نظر', max_length=200, blank=True)
    reviewer_avatar_url = models.URLField(verbose_name='نشانی تصویر ثبت‌کننده نظر', blank=True)
    rating              = models.PositiveSmallIntegerField(verbose_name='امتیاز', default=5)
    comment             = models.TextField(verbose_name='متن نظر', blank=True)
    language            = models.CharField(verbose_name='زبان', max_length=10, blank=True)
    sentiment           = models.CharField(verbose_name='احساس متن', max_length=20, choices=SENTIMENT_CHOICES, default='unknown')
    status              = models.CharField(verbose_name='وضعیت', max_length=20, choices=REVIEW_STATUS_CHOICES, default='new')
    reply_text          = models.TextField(verbose_name='متن پاسخ', blank=True)
    replied_at          = models.DateTimeField(verbose_name='زمان پاسخ', null=True, blank=True)
    replied_by          = models.ForeignKey(User, verbose_name='پاسخ‌دهنده', on_delete=models.SET_NULL, null=True, blank=True, related_name='replied_reviews')
    created_at_platform = models.DateTimeField(verbose_name='زمان ثبت در پلتفرم', null=True, blank=True)
    synced_at           = models.DateTimeField(verbose_name='زمان همگام‌سازی', auto_now=True)

    class Meta:
        verbose_name_plural = 'نظرهای مشتریان'
        verbose_name = 'نظر مشتری'
        unique_together = ('client', 'platform', 'social_account', 'platform_review_id')
        ordering = ['-created_at_platform']
        indexes = [
            models.Index(fields=['client', 'status']),
            models.Index(fields=['client', '-created_at_platform']),
        ]

    def __str__(self):
        return f"{self.client.company} | ★{self.rating} {self.reviewer_name}"


# ── AI & Automation ───────────────────────────────────────────────────────────
