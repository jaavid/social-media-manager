# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""Calendar models."""
from django.db import models
from django.contrib.auth.models import User
from social_stats.platforms.registry import PLATFORM_CHOICES

from social_stats.models.workspaces import Client

POST_TYPE_CHOICES = [
    ('image',    'تصویر'),
    ('video',    'ویدئو'),
    ('reel',     'ریل'),
    ('story',    'استوری'),
    ('carousel', 'چنداسلایدی'),
    ('text',     'متن'),
    ('article',  'مقاله'),
    ('short',    'ویدئوی کوتاه'),
]

CALENDAR_STATUS_CHOICES = [
    ('published', 'منتشر شده'),
    ('scheduled', 'زمان‌بندی شده'),
    ('draft',     'پیش‌نویس'),
    ('failed',    'ناموفق'),
]


class CalendarPost(models.Model):
    client      = models.ForeignKey(Client, verbose_name='فضای کاری', on_delete=models.CASCADE, related_name='calendar_posts')
    platform    = models.CharField(verbose_name='پلتفرم', max_length=30, choices=PLATFORM_CHOICES)
    post_type   = models.CharField(verbose_name='نوع پست', max_length=20, choices=POST_TYPE_CHOICES, default='image')
    status      = models.CharField(verbose_name='وضعیت', max_length=20, choices=CALENDAR_STATUS_CHOICES, default='draft')
    title       = models.CharField(verbose_name='عنوان', max_length=200, blank=True)
    caption     = models.TextField(verbose_name='متن کپشن', blank=True)
    hashtags    = models.TextField(verbose_name='هشتگ‌ها', blank=True)
    media_url   = models.URLField(verbose_name='نشانی رسانه', blank=True)
    post_url    = models.URLField(verbose_name='نشانی پست', blank=True)
    scheduled_at  = models.DateTimeField(verbose_name='زمان انتشار برنامه‌ریزی‌شده', null=True, blank=True)
    published_at  = models.DateTimeField(verbose_name='زمان انتشار', null=True, blank=True)
    post_metric   = models.OneToOneField(
        'PostMetric', verbose_name='آمار پست', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='calendar_post'
    )

    # Performance snapshot
    impressions     = models.BigIntegerField(verbose_name='تعداد نمایش', default=0)
    reach           = models.BigIntegerField(verbose_name='دسترسی (تعداد مخاطبان یکتا)', default=0)
    likes           = models.BigIntegerField(verbose_name='تعداد پسندیدن', default=0)
    comments        = models.BigIntegerField(verbose_name='تعداد دیدگاه', default=0)
    shares          = models.BigIntegerField(verbose_name='تعداد اشتراک‌گذاری', default=0)
    saves           = models.BigIntegerField(verbose_name='تعداد ذخیره', default=0)
    video_views     = models.BigIntegerField(verbose_name='تعداد بازدید ویدئو', default=0)
    engagement_rate = models.DecimalField(verbose_name='نرخ تعامل (درصد)', max_digits=8, decimal_places=4, default=0)

    # Meta
    created_by  = models.ForeignKey(User, verbose_name='ایجادکننده', on_delete=models.SET_NULL, null=True, blank=True, related_name='created_calendar_posts')
    created_at  = models.DateTimeField(verbose_name='زمان ایجاد', auto_now_add=True)
    updated_at  = models.DateTimeField(verbose_name='آخرین ویرایش', auto_now=True)
    external_id = models.CharField(verbose_name='شناسه در پلتفرم', max_length=300, blank=True)
    notes       = models.TextField(verbose_name='یادداشت‌ها', blank=True)

    class Meta:
        verbose_name_plural = 'پست‌های تقویم محتوا'
        verbose_name = 'پست تقویم محتوا'
        ordering = ['-scheduled_at', '-published_at']

    def __str__(self):
        return f"{self.client.company} | {self.platform} | {self.get_status_display()} | {self.title or self.caption[:40]}"

    @property
    def best_time(self):
        return self.scheduled_at or self.published_at


class CalendarNote(models.Model):
    client            = models.ForeignKey(Client, verbose_name='فضای کاری', on_delete=models.CASCADE, related_name='calendar_notes')
    date              = models.DateField(verbose_name='تاریخ', )
    title             = models.CharField(verbose_name='عنوان', max_length=200)
    note              = models.TextField(verbose_name='یادداشت', blank=True)
    color             = models.CharField(verbose_name='رنگ', max_length=7, default='#2563EB')
    is_client_visible = models.BooleanField(verbose_name='قابل مشاهده برای اعضای فضای کاری', default=False)
    created_by        = models.ForeignKey(User, verbose_name='ایجادکننده', on_delete=models.SET_NULL, null=True, blank=True, related_name='created_calendar_notes')
    created_at        = models.DateTimeField(verbose_name='زمان ایجاد', auto_now_add=True)

    class Meta:
        verbose_name_plural = 'یادداشت‌های تقویم'
        verbose_name = 'یادداشت تقویم'
        ordering = ['date', 'id']

    def __str__(self):
        return f"{self.client.company} | {self.date} | {self.title}"


class PostingSchedule(models.Model):
    client      = models.ForeignKey(Client, verbose_name='فضای کاری', on_delete=models.CASCADE, related_name='posting_schedules')
    platform    = models.CharField(verbose_name='پلتفرم', max_length=30, choices=PLATFORM_CHOICES)
    day_of_week = models.IntegerField(help_text='شماره روز هفته: دوشنبه ۰، سه‌شنبه ۱، چهارشنبه ۲، پنجشنبه ۳، جمعه ۴، شنبه ۵، یکشنبه ۶.', verbose_name='روز هفته', )   # 0=Monday … 6=Sunday
    hour        = models.IntegerField(verbose_name='ساعت', )
    minute      = models.IntegerField(verbose_name='دقیقه', default=0)
    is_active   = models.BooleanField(verbose_name='فعال', default=True)
    note        = models.CharField(verbose_name='یادداشت', max_length=100, blank=True)

    class Meta:
        verbose_name_plural = 'زمان‌بندی‌های انتشار'
        verbose_name = 'زمان‌بندی انتشار'
        unique_together = ('client', 'platform', 'day_of_week', 'hour', 'minute')
        ordering = ['platform', 'day_of_week', 'hour']

    def __str__(self):
        days = ['دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه', 'یکشنبه']
        return f"{self.client.company} | {self.platform} | {days[self.day_of_week]} {self.hour:02d}:{self.minute:02d}"


# ── Access Management ─────────────────────────────────────────────────────────

