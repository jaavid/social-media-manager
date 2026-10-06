# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""Publishing models."""
from django.db import models
from django.contrib.auth.models import User
from social_stats.platforms.registry import PLATFORM_CHOICES

from social_stats.models.workspaces import Client
from social_stats.models.accounts import SocialAccount

UNIFIED_POST_STATUS_CHOICES = [
    ('draft',             'پیش‌نویس'),
    ('pending_approval',  'در انتظار تأیید'),
    ('scheduled',         'زمان‌بندی شده'),
    ('queued',            'در صف انتشار'),
    ('publishing',        'در حال انتشار'),
    ('published',         'منتشر شده'),
    ('partial',           'انتشار ناقص'),
    ('failed',            'ناموفق'),
    ('cancelled',         'لغو شده'),
]

UNIFIED_MEDIA_TYPE_CHOICES = [
    ('album', 'آلبوم تلگرام'),
    ('rich', 'مقاله غنی تلگرام'),
    ('poll', 'نظرسنجی تلگرام'),
    ('text',     'فقط متن'),
    ('image',    'تصویر'),
    ('video',    'ویدئو'),
    ('carousel', 'چنداسلایدی'),
    ('reel',     'ریل'),
    ('story',    'استوری'),
]

PUBLISH_LOG_STATUS_CHOICES = [
    ('pending',    'در انتظار'),
    ('publishing', 'در حال انتشار'),
    ('success',    'موفق'),
    ('failed',     'ناموفق'),
    ('skipped',    'رد شده'),
]




QUEUE_STRATEGY_CHOICES = [
    ('round_robin', 'چرخشی'),
    ('random',      'تصادفی'),
    ('sequential',  'به‌ترتیب'),
]

QUEUED_ITEM_STATUS_CHOICES = [
    ('waiting', 'در انتظار استفاده'),
    ('used',    'استفاده شده'),
    ('skipped', 'رد شده'),
]





# ── Composer & Publishing ─────────────────────────────────────────────────────
class MediaAsset(models.Model):
    """Uploaded media library — photos, videos, gifs available to the composer."""
    client       = models.ForeignKey(Client, verbose_name='فضای کاری', on_delete=models.CASCADE, related_name='media_assets')
    uploaded_by  = models.ForeignKey(User, verbose_name='بارگذاری‌کننده', on_delete=models.SET_NULL, null=True, blank=True, related_name='uploaded_media')
    file         = models.FileField(verbose_name='فایل', upload_to='media_assets/%Y/%m/')
    thumbnail    = models.ImageField(verbose_name='تصویر بندانگشتی', upload_to='media_assets/thumbs/%Y/%m/', null=True, blank=True)
    mime_type    = models.CharField(verbose_name='نوع فایل (MIME)', max_length=100, blank=True)
    file_size    = models.BigIntegerField(verbose_name='حجم فایل (بایت)', default=0)
    width        = models.IntegerField(verbose_name='عرض (پیکسل)', default=0)
    height       = models.IntegerField(verbose_name='ارتفاع (پیکسل)', default=0)
    duration_seconds = models.FloatField(verbose_name='مدت رسانه (ثانیه)', default=0)
    alt_text     = models.CharField(verbose_name='متن جایگزین تصویر', max_length=500, blank=True)
    tags         = models.JSONField(verbose_name='برچسب‌ها', default=list, blank=True)
    folder       = models.CharField(verbose_name='پوشه', max_length=100, blank=True)
    is_used      = models.BooleanField(verbose_name='استفاده شده', default=False)
    created_at   = models.DateTimeField(verbose_name='زمان ایجاد', auto_now_add=True)

    class Meta:
        verbose_name_plural = 'فایل‌های رسانه‌ای'
        verbose_name = 'فایل رسانه‌ای'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['client', '-created_at']),
            models.Index(fields=['client', 'folder']),
        ]

    def __str__(self):
        return f"{self.client.company} — {self.file.name}"


class UnifiedPost(models.Model):
    """A post composed in Social Stats, fanned out to one or more platforms."""
    client            = models.ForeignKey(Client, verbose_name='فضای کاری', on_delete=models.CASCADE, related_name='unified_posts')
    intent_key = models.UUIDField(verbose_name='کلید درخواست نگارش', null=True, blank=True, editable=False)
    publish_action = models.CharField(verbose_name='نوع درخواست انتشار', max_length=20, default='publish_posts', choices=[('publish_posts', 'انتشار'), ('schedule_posts', 'زمان‌بندی')])
    publish_requested_by = models.ForeignKey(User, verbose_name='درخواست‌کننده انتشار', on_delete=models.SET_NULL, null=True, blank=True, related_name='requested_post_publications')
    created_by        = models.ForeignKey(User, verbose_name='ایجادکننده', on_delete=models.SET_NULL, null=True, blank=True, related_name='created_unified_posts')
    title             = models.CharField(verbose_name='عنوان', max_length=200, blank=True, help_text='عنوان داخلی اختیاری برای شناسایی پست.')
    content           = models.TextField(verbose_name='محتوا', blank=True)
    media_urls        = models.JSONField(verbose_name='نشانی‌های رسانه', default=list, blank=True, help_text='فهرست مرتب‌شده نشانی رسانه‌ها در قالب JSON.')
    media_assets      = models.ManyToManyField(MediaAsset, verbose_name='فایل‌های رسانه‌ای', blank=True, related_name='used_in_posts')
    media_type        = models.CharField(verbose_name='نوع رسانه', max_length=20, choices=UNIFIED_MEDIA_TYPE_CHOICES, default='text')
    target_platforms  = models.JSONField(verbose_name='پلتفرم‌های مقصد', default=list, blank=True, help_text='فهرست کلید پلتفرم‌های مقصد در قالب JSON؛ برای مثال: ["instagram", "telegram"].')
    platform_overrides = models.JSONField(verbose_name='تنظیمات اختصاصی هر پلتفرم', default=dict, blank=True, help_text='تنظیمات اختصاصی با ساختار {"platform": {"content": "...", "media_urls": [], "hashtags": []}}.')
    status            = models.CharField(verbose_name='وضعیت', max_length=20, choices=UNIFIED_POST_STATUS_CHOICES, default='draft')
    scheduled_at      = models.DateTimeField(verbose_name='زمان انتشار برنامه‌ریزی‌شده', null=True, blank=True)
    published_at      = models.DateTimeField(verbose_name='زمان انتشار', null=True, blank=True)
    created_at        = models.DateTimeField(verbose_name='زمان ایجاد', auto_now_add=True)
    updated_at        = models.DateTimeField(verbose_name='آخرین ویرایش', auto_now=True)
    ai_generated      = models.BooleanField(verbose_name='تولیدشده با هوش مصنوعی', default=False)
    ai_prompt         = models.TextField(verbose_name='دستور هوش مصنوعی', blank=True)
    is_recurring      = models.BooleanField(verbose_name='انتشار تکرارشونده', default=False)
    recurrence_rule   = models.CharField(verbose_name='قاعده تکرار انتشار', max_length=500, blank=True, help_text='قاعده تکرار مطابق استاندارد RFC 5545 (RRULE).')
    approved_by       = models.ForeignKey(User, verbose_name='تأییدکننده', on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_unified_posts')
    approved_at       = models.DateTimeField(verbose_name='زمان تأیید', null=True, blank=True)

    class Meta:
        verbose_name_plural = 'پست‌های یکپارچه'
        verbose_name = 'پست یکپارچه'
        ordering = ['-created_at']
        unique_together = ('client', 'created_by', 'intent_key')
        indexes = [
            models.Index(fields=['client', '-created_at']),
            models.Index(fields=['client', 'status']),
            models.Index(fields=['status', 'scheduled_at']),
        ]

    def __str__(self):
        return f"{self.client.company} | {self.get_status_display()} | {self.title or self.content[:40]}"


class PlatformPublishLog(models.Model):
    """One row per (UnifiedPost × target platform) — tracks per-platform outcome."""
    unified_post       = models.ForeignKey(UnifiedPost, verbose_name='پست یکپارچه', on_delete=models.CASCADE, related_name='publish_logs')
    platform           = models.CharField(verbose_name='پلتفرم', max_length=30, choices=PLATFORM_CHOICES)
    account_target_id = models.PositiveBigIntegerField(verbose_name='شناسه حساب مقصد', default=0, editable=False)
    social_account     = models.ForeignKey(SocialAccount, verbose_name='حساب شبکه اجتماعی', on_delete=models.SET_NULL, related_name='publish_logs', null=True, blank=True)
    status             = models.CharField(verbose_name='وضعیت', max_length=20, choices=PUBLISH_LOG_STATUS_CHOICES, default='pending')
    platform_post_id   = models.CharField(verbose_name='شناسه پست در پلتفرم', max_length=300, blank=True, db_index=True)
    platform_url       = models.URLField(verbose_name='نشانی پست در پلتفرم', blank=True)
    error_code         = models.CharField(verbose_name='کد خطا', max_length=80, blank=True)
    error_message      = models.TextField(verbose_name='شرح خطا', blank=True)
    attempted_at       = models.DateTimeField(verbose_name='زمان تلاش برای انتشار', null=True, blank=True)
    completed_at       = models.DateTimeField(verbose_name='زمان تکمیل', null=True, blank=True)
    engagement_synced_at = models.DateTimeField(verbose_name='زمان همگام‌سازی تعاملات', null=True, blank=True)
    raw_response       = models.JSONField(verbose_name='پاسخ خام پلتفرم', default=dict, blank=True)

    class Meta:
        verbose_name_plural = 'گزارش‌های انتشار پلتفرم‌ها'
        verbose_name = 'گزارش انتشار پلتفرم'
        unique_together = ('unified_post', 'platform', 'account_target_id')
        ordering = ['-attempted_at']
        indexes = [
            models.Index(fields=['platform', 'platform_post_id']),
            models.Index(fields=['unified_post', 'status']),
        ]

    def __str__(self):
        return f"{self.unified_post_id} → {self.platform} ({self.get_status_display()})"


class PostEngagement(models.Model):
    """Live engagement counters for a published post (refreshed periodically)."""
    publish_log    = models.OneToOneField(PlatformPublishLog, on_delete=models.CASCADE, related_name='engagement')
    likes          = models.BigIntegerField(default=0)
    comments       = models.BigIntegerField(default=0)
    shares         = models.BigIntegerField(default=0)
    saves          = models.BigIntegerField(default=0)
    reach          = models.BigIntegerField(default=0)
    impressions    = models.BigIntegerField(default=0)
    video_views    = models.BigIntegerField(default=0)
    watch_time_seconds = models.BigIntegerField(default=0)
    click_throughs = models.BigIntegerField(default=0)
    pulled_at      = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Engagement — {self.publish_log}"


class PostQueue(models.Model):
    """A reusable schedule (e.g. 'every weekday 10am') that drains QueuedItems."""
    client          = models.ForeignKey(Client, verbose_name='فضای کاری', on_delete=models.CASCADE, related_name='post_queues')
    name            = models.CharField(verbose_name='نام', max_length=200)
    platforms       = models.JSONField(verbose_name='پلتفرم‌ها', default=list, blank=True)
    schedule_rule   = models.CharField(verbose_name='قاعده زمان‌بندی', max_length=500, blank=True, help_text='قاعده زمان‌بندی مطابق RFC 5545 (RRULE) یا عبارت cron.')
    queue_strategy  = models.CharField(verbose_name='روش انتخاب از صف', max_length=20, choices=QUEUE_STRATEGY_CHOICES, default='sequential')
    is_active       = models.BooleanField(verbose_name='فعال', default=True)
    last_dispatched_at = models.DateTimeField(verbose_name='زمان آخرین ارسال از صف', null=True, blank=True)
    created_at      = models.DateTimeField(verbose_name='زمان ایجاد', auto_now_add=True)
    updated_at      = models.DateTimeField(verbose_name='آخرین ویرایش', auto_now=True)

    class Meta:
        verbose_name_plural = 'صف‌های انتشار'
        verbose_name = 'صف انتشار'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.client.company} — {self.name}"


class QueuedItem(models.Model):
    """A pre-written post sitting in a PostQueue waiting to be dispatched."""
    requested_by = models.ForeignKey(User, verbose_name='درخواست‌کننده', on_delete=models.SET_NULL, null=True, blank=True, related_name='requested_queue_items')
    queue        = models.ForeignKey(PostQueue, verbose_name='صف انتشار', on_delete=models.CASCADE, related_name='items')
    content      = models.TextField(verbose_name='محتوا', blank=True)
    media_urls   = models.JSONField(verbose_name='نشانی‌های رسانه', default=list, blank=True)
    media_type = models.CharField(verbose_name='نوع رسانه', max_length=20, blank=True, choices=UNIFIED_MEDIA_TYPE_CHOICES)
    platform_overrides = models.JSONField(verbose_name='تنظیمات اختصاصی پلتفرم', default=dict, blank=True)
    hashtags     = models.JSONField(verbose_name='هشتگ‌ها', default=list, blank=True)
    sort_order   = models.IntegerField(verbose_name='ترتیب نمایش', default=0)
    status       = models.CharField(verbose_name='وضعیت', max_length=20, choices=QUEUED_ITEM_STATUS_CHOICES, default='waiting')
    used_at      = models.DateTimeField(verbose_name='زمان استفاده', null=True, blank=True)
    unified_post = models.ForeignKey(UnifiedPost, verbose_name='پست یکپارچه', on_delete=models.SET_NULL, null=True, blank=True, related_name='source_queue_item')
    created_at   = models.DateTimeField(verbose_name='زمان ایجاد', auto_now_add=True)

    class Meta:
        verbose_name_plural = 'آیتم‌های صف انتشار'
        verbose_name = 'آیتم صف انتشار'
        ordering = ['queue', 'sort_order', 'id']
        indexes = [models.Index(fields=['queue', 'status', 'sort_order'])]

    def __str__(self):
        return f"{self.queue.name} #{self.sort_order} ({self.get_status_display()})"


# ── Inbox & Engagement ────────────────────────────────────────────────────────
