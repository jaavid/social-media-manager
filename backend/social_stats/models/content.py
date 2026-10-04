# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""Content models."""
from django.db import models
from django.contrib.auth.models import User
from social_stats.platforms.registry import PLATFORM_CHOICES

from social_stats.models.workspaces import Client

class CaptionRequest(models.Model):
    TONE_CHOICES = [
        ('professional', 'Professional'),
        ('casual', 'Casual'),
        ('funny', 'Funny'),
        ('inspirational', 'Inspirational'),
        ('urgent', 'Urgent'),
        ('friendly', 'Friendly'),
    ]
    POST_TYPE_CHOICES = [
        ('promotion', 'Promotion'),
        ('announcement', 'Announcement'),
        ('educational', 'Educational'),
        ('behind_scenes', 'Behind the Scenes'),
        ('product', 'Product Showcase'),
        ('event', 'Event'),
        ('tip', 'Tip & Advice'),
    ]

    client             = models.ForeignKey('Client', on_delete=models.CASCADE, related_name='caption_requests')
    topic              = models.TextField()
    tone               = models.CharField(max_length=20, choices=TONE_CHOICES, default='professional')
    post_type          = models.CharField(max_length=20, choices=POST_TYPE_CHOICES, default='promotion')
    platforms          = models.JSONField(default=list)
    keywords           = models.TextField(blank=True, default='')
    call_to_action     = models.CharField(max_length=200, blank=True, default='')
    generated_captions = models.JSONField(default=dict)
    created_at         = models.DateTimeField(auto_now_add=True)
    created_by         = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.client.company} – {self.topic[:50]}"


# ── AI Post Ideas Generator ────────────────────────────────────────────────────

BUSINESS_TYPE_CHOICES = [
    ('restaurant',   'Restaurant'),
    ('retail',       'Retail'),
    ('healthcare',   'Healthcare'),
    ('fitness',      'Fitness'),
    ('real_estate',  'Real Estate'),
    ('education',    'Education'),
    ('tech',         'Tech'),
    ('beauty',       'Beauty'),
    ('legal',        'Legal'),
    ('finance',      'Finance'),
    ('other',        'Other'),
]


class PostIdeaSet(models.Model):
    client          = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='post_idea_sets')
    month           = models.IntegerField()
    year            = models.IntegerField()
    business_type   = models.CharField(max_length=50, choices=BUSINESS_TYPE_CHOICES)
    location        = models.CharField(max_length=200, blank=True)
    upcoming_events = models.TextField(blank=True)
    target_audience = models.CharField(max_length=300, blank=True)
    platforms       = models.JSONField(default=list)
    ideas           = models.JSONField(default=dict)   # raw AI response
    posts_per_week  = models.IntegerField(default=5)
    generated_at    = models.DateTimeField(auto_now_add=True)
    generated_by    = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='generated_idea_sets')

    class Meta:
        ordering = ['-generated_at']

    def __str__(self):
        import calendar
        month_name = calendar.month_name[self.month]
        return f"{self.client.company} | {month_name} {self.year}"


class PostIdea(models.Model):
    idea_set             = models.ForeignKey(PostIdeaSet, on_delete=models.CASCADE, related_name='post_ideas')
    week_number          = models.IntegerField()
    day_of_week          = models.CharField(max_length=20)
    scheduled_date       = models.DateField(null=True, blank=True)
    platform             = models.CharField(max_length=30)
    post_type            = models.CharField(max_length=30)
    topic                = models.CharField(max_length=500)
    caption_hint         = models.TextField()
    hashtag_hints        = models.JSONField(default=list)
    best_time            = models.CharField(max_length=50, blank=True)
    notes                = models.TextField(blank=True)
    is_approved          = models.BooleanField(default=False)
    is_added_to_calendar = models.BooleanField(default=False)
    converted_post       = models.ForeignKey(
        'CalendarPost', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='post_idea_source'
    )

    class Meta:
        ordering = ['scheduled_date', 'week_number', 'id']

    def __str__(self):
        return f"{self.idea_set.client.company} | {self.scheduled_date or self.day_of_week} | {self.topic[:50]}"


# ── AI Hashtag Research Tool ───────────────────────────────────────────────────

class HashtagSet(models.Model):
    PLATFORM_CHOICES = PLATFORM_CHOICES

    client      = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='hashtag_sets')
    niche       = models.CharField(max_length=200)
    location    = models.CharField(max_length=200, blank=True)
    platform    = models.CharField(max_length=30, choices=PLATFORM_CHOICES)
    hashtags    = models.JSONField(default=dict)   # full AI response
    saved_sets  = models.JSONField(default=list)   # [{name, tags, platform, created_at}]
    generated_at = models.DateTimeField(auto_now_add=True)
    generated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='generated_hashtag_sets'
    )

    class Meta:
        ordering = ['-generated_at']

    def __str__(self):
        return f"{self.client.company} | {self.niche} | {self.platform}"


class SiteContent(models.Model):
    key = models.SlugField(verbose_name='کلید', max_length=120, unique=True)
    title = models.CharField(verbose_name='عنوان', max_length=255)
    effective_date = models.DateField(verbose_name='تاریخ اجرا', null=True, blank=True)
    last_updated = models.DateField(verbose_name='تاریخ آخرین بازنگری', null=True, blank=True)
    content = models.JSONField(verbose_name='محتوا', default=dict, blank=True)
    is_public = models.BooleanField(verbose_name='عمومی', default=True)
    created_at = models.DateTimeField(verbose_name='زمان ایجاد', auto_now_add=True)
    updated_at = models.DateTimeField(verbose_name='آخرین ویرایش', auto_now=True)

    class Meta:
        ordering = ['key']
        verbose_name = 'محتوای سایت'
        verbose_name_plural = 'محتواهای سایت'

    def __str__(self):
        return f"{self.key} — {self.title}"


class LookupCollection(models.Model):
    key = models.SlugField(verbose_name='کلید', max_length=120, unique=True)
    title = models.CharField(verbose_name='عنوان', max_length=255)
    is_public = models.BooleanField(verbose_name='عمومی', default=True)
    created_at = models.DateTimeField(verbose_name='زمان ایجاد', auto_now_add=True)
    updated_at = models.DateTimeField(verbose_name='آخرین ویرایش', auto_now=True)

    class Meta:
        verbose_name_plural = 'مجموعه‌های داده مرجع'
        verbose_name = 'مجموعه داده مرجع'
        ordering = ['key']

    def __str__(self):
        return self.title


class LookupItem(models.Model):
    collection = models.ForeignKey(LookupCollection, verbose_name='مجموعه داده مرجع', on_delete=models.CASCADE, related_name='items')
    key = models.CharField(verbose_name='کلید', max_length=120)
    label = models.CharField(verbose_name='عنوان نمایشی', max_length=255)
    value = models.CharField(verbose_name='مقدار', max_length=255, blank=True)
    parent_key = models.CharField(verbose_name='کلید والد', max_length=120, blank=True)
    sort_order = models.PositiveIntegerField(verbose_name='ترتیب نمایش', default=0)
    is_active = models.BooleanField(verbose_name='فعال', default=True)
    metadata = models.JSONField(verbose_name='اطلاعات تکمیلی', default=dict, blank=True)

    class Meta:
        verbose_name_plural = 'گزینه‌های داده مرجع'
        verbose_name = 'گزینه داده مرجع'
        ordering = ['collection__key', 'sort_order', 'label']
        unique_together = [('collection', 'key')]

    def __str__(self):
        return f"{self.collection.key} — {self.label}"


# ── Client Invitation ─────────────────────────────────────────────────────────
