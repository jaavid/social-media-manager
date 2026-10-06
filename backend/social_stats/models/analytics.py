# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""Analytics models."""
import uuid
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from social_stats.platforms.registry import PLATFORM_CHOICES

from social_stats.models.workspaces import Client
from social_stats.models.accounts import SocialAccount

class DailyMetric(models.Model):
    provider_metrics = models.JSONField(default=None, null=True, blank=True, verbose_name='شاخص‌های دریافت‌شده از سرویس')
    client    = models.ForeignKey(Client, verbose_name='فضای کاری', on_delete=models.CASCADE, related_name='metrics')
    social_account = models.ForeignKey(SocialAccount, verbose_name='حساب شبکه اجتماعی', on_delete=models.CASCADE, related_name='metrics', null=True, blank=True)
    platform  = models.CharField(verbose_name='پلتفرم', max_length=30, choices=PLATFORM_CHOICES)
    date      = models.DateField(verbose_name='تاریخ', )

    # Universal metrics
    impressions  = models.BigIntegerField(verbose_name='تعداد نمایش', default=0)
    reach        = models.BigIntegerField(verbose_name='دسترسی (تعداد مخاطبان یکتا)', default=0)
    clicks       = models.BigIntegerField(verbose_name='تعداد کلیک', default=0)
    likes        = models.BigIntegerField(verbose_name='تعداد پسندیدن', default=0)
    comments     = models.BigIntegerField(verbose_name='تعداد دیدگاه', default=0)
    shares       = models.BigIntegerField(verbose_name='تعداد اشتراک‌گذاری', default=0)
    saves        = models.BigIntegerField(verbose_name='تعداد ذخیره', default=0)
    video_views  = models.BigIntegerField(verbose_name='تعداد بازدید ویدئو', default=0)
    followers    = models.BigIntegerField(verbose_name='تعداد دنبال‌کنندگان', default=0)
    profile_views= models.BigIntegerField(verbose_name='تعداد بازدید پروفایل', default=0)

    # Google / Ads specific
    sessions             = models.BigIntegerField(verbose_name='تعداد نشست وب‌سایت', default=0)
    users                = models.BigIntegerField(verbose_name='تعداد کاربران وب‌سایت', default=0)
    page_views           = models.BigIntegerField(verbose_name='تعداد بازدید صفحه', default=0)
    website_clicks       = models.BigIntegerField(verbose_name='تعداد کلیک وب‌سایت', default=0)
    direction_requests   = models.BigIntegerField(verbose_name='تعداد درخواست مسیریابی', default=0)
    phone_calls          = models.BigIntegerField(verbose_name='تعداد تماس تلفنی', default=0)

    # GMB-specific extended metrics
    maps_impressions     = models.BigIntegerField(verbose_name='تعداد نمایش در نقشه گوگل', default=0)   # impressions on Google Maps
    search_impressions   = models.BigIntegerField(verbose_name='تعداد نمایش در جستجوی گوگل', default=0)   # impressions on Google Search
    photo_views          = models.BigIntegerField(verbose_name='تعداد بازدید تصاویر', default=0)   # business photo views
    business_conversations = models.BigIntegerField(verbose_name='تعداد گفتگوهای کسب‌وکار', default=0) # messages/Q&A

    # YouTube-specific
    watch_time_minutes  = models.BigIntegerField(verbose_name='مدت تماشای ویدئو (دقیقه)', default=0)   # estimatedMinutesWatched
    avg_view_duration   = models.FloatField(verbose_name='میانگین مدت تماشا (ثانیه)', default=0)        # averageViewDuration (seconds)
    subscribers_lost    = models.BigIntegerField(verbose_name='تعداد مشترکان ازدست‌رفته', default=0)   # subscribersLost

    # Facebook-specific
    followers_lost      = models.BigIntegerField(verbose_name='تعداد دنبال‌کنندگان ازدست‌رفته فیسبوک', default=0)   # page_fan_removes (unfollows)
    negative_feedback   = models.BigIntegerField(verbose_name='تعداد بازخوردهای منفی', default=0)   # page_negative_feedback (hides/spam)
    fb_video_views      = models.BigIntegerField(verbose_name='تعداد بازدید ویدئوی فیسبوک', default=0)   # page_video_views
    fb_video_watch_time = models.BigIntegerField(verbose_name='مدت تماشای ویدئوی فیسبوک (ثانیه)', default=0)   # page_video_view_time (ms → seconds)
    reactions           = models.JSONField(verbose_name='واکنش‌ها', default=dict, blank=True)  # {like,love,haha,wow,sad,angry}

    # Instagram-specific
    accounts_engaged    = models.BigIntegerField(verbose_name='تعداد حساب‌های تعامل‌کننده', default=0)   # accounts that engaged
    total_interactions  = models.BigIntegerField(verbose_name='مجموع تعاملات', default=0)   # likes+comments+shares+saves
    email_contacts      = models.BigIntegerField(verbose_name='تعداد کلیک دکمه ایمیل', default=0)   # email button clicks
    phone_call_clicks   = models.BigIntegerField(verbose_name='تعداد کلیک دکمه تماس', default=0)   # call button clicks
    direction_clicks    = models.BigIntegerField(verbose_name='تعداد کلیک دکمه مسیریابی', default=0)   # get directions clicks
    ig_followers_lost   = models.BigIntegerField(verbose_name='تعداد دنبال‌کنندگان ازدست‌رفته اینستاگرام', default=0)   # unfollows

    # Calculated
    engagement_rate = models.FloatField(verbose_name='نرخ تعامل (درصد)', default=0)
    ctr             = models.FloatField(verbose_name='نرخ کلیک (درصد)', default=0)

    synced_at = models.DateTimeField(verbose_name='زمان همگام‌سازی', auto_now=True)

    class Meta:
        verbose_name_plural = 'آمارهای روزانه'
        verbose_name = 'آمار روزانه'
        unique_together = ('client', 'platform', 'social_account', 'date')
        ordering = ['-date']
        indexes = [
            models.Index(fields=['client', 'platform', 'date']),
        ]

    def __str__(self):
        return f"{self.client.company} | {self.platform} | {self.date}"


# ── Per-Post Metrics (Instagram / Facebook) ───────────────────────────────────
class PostMetric(models.Model):
    client        = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='post_metrics')
    social_account = models.ForeignKey(SocialAccount, on_delete=models.CASCADE, related_name='post_metrics', null=True, blank=True)
    platform      = models.CharField(max_length=30, choices=PLATFORM_CHOICES)
    post_id       = models.CharField(max_length=300)
    post_url      = models.TextField(blank=True)
    post_type     = models.CharField(max_length=50, blank=True)
    caption       = models.TextField(blank=True)
    thumbnail_url = models.TextField(blank=True)
    published_at  = models.DateTimeField(null=True, blank=True)

    impressions  = models.BigIntegerField(default=0)
    reach        = models.BigIntegerField(default=0)
    clicks       = models.BigIntegerField(default=0)
    likes        = models.BigIntegerField(default=0)
    comments     = models.BigIntegerField(default=0)
    shares       = models.BigIntegerField(default=0)
    saves        = models.BigIntegerField(default=0)
    video_views  = models.BigIntegerField(default=0)

    synced_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('client', 'platform', 'social_account', 'post_id')
        ordering = ['-published_at']


# ── GMB Business Info (synced from Business Information API) ──────────────────
class GMBBusinessInfo(models.Model):
    client          = models.OneToOneField(Client, on_delete=models.CASCADE, related_name='gmb_info')
    business_name   = models.CharField(max_length=300, blank=True)
    address         = models.TextField(blank=True)
    phone           = models.CharField(max_length=50, blank=True)
    website         = models.URLField(blank=True)
    category        = models.CharField(max_length=200, blank=True)       # primary category
    additional_categories = models.JSONField(default=list, blank=True)   # extra categories
    description     = models.TextField(blank=True)
    opening_date    = models.DateField(null=True, blank=True)
    is_verified     = models.BooleanField(default=False)
    is_open         = models.BooleanField(default=True)                  # currently open?
    regular_hours   = models.JSONField(default=dict, blank=True)         # {MON: [{open:'09:00',close:'17:00'}]}
    special_hours   = models.JSONField(default=list, blank=True)         # holiday hours
    profile_photo_url  = models.URLField(blank=True)
    cover_photo_url    = models.URLField(blank=True)
    maps_url           = models.URLField(blank=True)
    place_id           = models.CharField(max_length=200, blank=True)
    latitude           = models.FloatField(null=True, blank=True)
    longitude          = models.FloatField(null=True, blank=True)
    # Aggregate review stats (refreshed on each sync)
    avg_rating         = models.FloatField(default=0)
    total_reviews      = models.IntegerField(default=0)
    synced_at          = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.client.company} — GMB Info"


# ── GMB Reviews (synced via Account Management API) ───────────────────────────
class GMBReview(models.Model):
    client          = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='gmb_reviews')
    review_id       = models.CharField(max_length=300, unique=True)
    reviewer_name   = models.CharField(max_length=200, blank=True)
    reviewer_photo  = models.URLField(blank=True)
    rating          = models.PositiveSmallIntegerField(default=5)        # 1–5
    comment         = models.TextField(blank=True)
    owner_reply     = models.TextField(blank=True)
    reply_updated_at = models.DateTimeField(null=True, blank=True)
    published_at    = models.DateTimeField(null=True, blank=True)
    synced_at       = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-published_at']
        indexes = [models.Index(fields=['client', 'published_at'])]

    def __str__(self):
        return f"{self.client.company} — ★{self.rating} by {self.reviewer_name}"


GOAL_METRIC_CHOICES = [
    ('impressions',    'Impressions'),
    ('reach',          'Reach'),
    ('clicks',         'Clicks'),
    ('likes',          'Likes'),
    ('followers',      'Followers'),
    ('video_views',    'Video Views'),
    ('website_clicks', 'Website Clicks'),
    ('phone_calls',    'Phone Calls'),
]

GOAL_PLATFORM_CHOICES = PLATFORM_CHOICES + [('all', 'All Platforms')]


# ── Monthly Goals ─────────────────────────────────────────────────────────────
class ClientGoal(models.Model):
    client       = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='goals')
    platform     = models.CharField(max_length=30, choices=GOAL_PLATFORM_CHOICES)
    metric       = models.CharField(max_length=30, choices=GOAL_METRIC_CHOICES)
    target_value = models.BigIntegerField()
    month        = models.PositiveSmallIntegerField()   # 1–12
    year         = models.PositiveSmallIntegerField()
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('client', 'platform', 'metric', 'month', 'year')
        ordering = ['-year', '-month', 'platform', 'metric']

    def __str__(self):
        return f"{self.client.company} | {self.platform} | {self.metric} | {self.month}/{self.year}"


ALERT_TYPE_CHOICES = [
    ('token_expired',      'Token Expired'),
    ('sync_failed',        'Sync Failed'),
    ('reach_drop',         'Reach Drop'),
    ('viral_post',         'Viral Post'),
    ('goal_at_risk',       'Goal At Risk'),
    ('follower_milestone', 'Follower Milestone'),
]


# ── Smart Alerts ──────────────────────────────────────────────────────────────
class Alert(models.Model):
    client     = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='alerts')
    platform   = models.CharField(max_length=30, blank=True)
    alert_type = models.CharField(max_length=30, choices=ALERT_TYPE_CHOICES)
    message    = models.TextField()
    is_read    = models.BooleanField(default=False)
    dedup_key  = models.CharField(max_length=200, blank=True)  # prevents duplicate alerts per day
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.client.company} | {self.alert_type} | {self.created_at:%Y-%m-%d}"


# ── AI Insights ───────────────────────────────────────────────────────────────
class AIInsight(models.Model):
    """
    AI-generated insight for a client. Originally a per-month rollup; extended
    in the AI infra to support feed-style insights with severity,
    confidence, action recommendations, and dismiss/acted-on tracking.

    Two coexisting shapes:
      * Legacy monthly: month + year + content (kept working for existing data)
      * Feed-style: insight_type + confidence_score + data_sources + action_recommended
    """
    SEVERITY_CHOICES = [
        ('low', 'Low'), ('medium', 'Medium'), ('high', 'High'), ('critical', 'Critical'),
    ]

    client            = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='ai_insights')
    month             = models.PositiveSmallIntegerField(null=True, blank=True)
    year              = models.PositiveSmallIntegerField(null=True, blank=True)
    content           = models.TextField()

    # Feed-style fields — added AI infra
    title             = models.CharField(max_length=200, blank=True)
    insight_type      = models.CharField(max_length=60, blank=True,
                                         help_text='engagement_trend, competitor_alert, best_time_shift, etc.')
    severity          = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='medium', blank=True)
    confidence_score  = models.FloatField(default=0.0,
                                          help_text='0.0-1.0 — how certain Claude is about this insight')
    data_sources      = models.JSONField(default=list, blank=True,
                                         help_text='Brief description of what was analysed')
    action_recommended = models.TextField(blank=True)
    dismissed         = models.BooleanField(default=False)
    acted_upon        = models.BooleanField(default=False)
    expires_at        = models.DateTimeField(null=True, blank=True)
    generated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-generated_at']
        indexes = [
            models.Index(fields=['client', '-generated_at']),
            models.Index(fields=['client', 'dismissed', '-generated_at']),
            models.Index(fields=['insight_type']),
        ]

    def __str__(self):
        if self.title:
            return f"{self.client.company} | {self.title}"
        return f"{self.client.company} | {self.month}/{self.year}"


# ── Weekly Top Posts ──────────────────────────────────────────────────────────
class WeeklyTopPost(models.Model):
    client      = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='weekly_top_posts')
    platform    = models.CharField(max_length=30, choices=PLATFORM_CHOICES)
    post_metric = models.ForeignKey('PostMetric', on_delete=models.CASCADE, null=True, blank=True)
    week_start  = models.DateField()   # Monday of the scored week
    score       = models.FloatField(default=0)
    rank        = models.PositiveSmallIntegerField(default=1)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('client', 'platform', 'week_start', 'rank')
        ordering = ['-week_start', 'platform', 'rank']

    def __str__(self):
        return f"{self.client.company} | {self.platform} | {self.week_start} | #{self.rank}"


# ── Shareable Public Reports ──────────────────────────────────────────────────
class SharedReport(models.Model):
    client      = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='shared_reports')
    token       = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_by  = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    date_from   = models.DateField()
    date_until  = models.DateField()
    social_account_ids = models.JSONField(default=None, null=True, blank=True)
    platforms   = models.JSONField(default=list)        # e.g. ['facebook', 'instagram']
    is_password_protected = models.BooleanField(default=False)
    password_hash         = models.CharField(max_length=128, blank=True)
    expires_at    = models.DateTimeField(null=True, blank=True)
    view_count    = models.PositiveIntegerField(default=0)
    last_viewed_at= models.DateTimeField(null=True, blank=True)
    is_active     = models.BooleanField(default=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.client.company} | {self.token}"

    @property
    def is_expired(self):
        if not self.expires_at:
            return False
        return timezone.now() > self.expires_at

    def set_password(self, raw_password):
        from django.contrib.auth.hashers import make_password
        self.password_hash = make_password(raw_password)

    def verify_password(self, raw_password):
        from django.contrib.auth.hashers import check_password
        return check_password(raw_password, self.password_hash)


# ── Client Onboarding Checklist ───────────────────────────────────────────────
