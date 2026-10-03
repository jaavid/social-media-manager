# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
import uuid
from django.db import models
from django.db import transaction
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from .fields import EncryptedTextField
from .platforms.registry import PLATFORM_CHOICES

ROLE_CHOICES = [
    ('superadmin', 'مدیر کل'),
    ('staff',      'کارمند'),
    ('client',     'عضو فضای کاری'),
]

SYNC_STATUS = [
    ('pending', 'در انتظار'),
    ('running', 'در حال اجرا'),
    ('success', 'موفق'),
    ('failed',  'ناموفق'),
]


# ── Client (Company) ──────────────────────────────────────────────────────────
class Client(models.Model):
    name       = models.CharField(verbose_name='نام مسئول تماس', max_length=200)
    company    = models.CharField(verbose_name='نام کسب‌وکار', max_length=200)
    email      = models.EmailField(verbose_name='ایمیل', unique=True)
    phone      = models.CharField(verbose_name='شماره تلفن', max_length=30, blank=True)
    whatsapp_number = models.CharField(verbose_name='شماره واتس‌اپ', max_length=30, blank=True)
    website    = models.URLField(verbose_name='نشانی وب‌سایت', blank=True)
    gmb_url    = models.URLField(verbose_name='نشانی پروفایل کسب‌وکار در گوگل', blank=True, help_text='نشانی پروفایل کسب‌وکار در گوگل.')
    logo       = models.ImageField(verbose_name='لوگو', upload_to='logos/', blank=True, null=True)
    is_active  = models.BooleanField(verbose_name='فعال', default=True)
    created_at = models.DateTimeField(verbose_name='زمان ایجاد', auto_now_add=True)

    # Business Profile Fields
    business_category = models.CharField(verbose_name='دسته کسب‌وکار', max_length=100, blank=True, help_text='برای مثال: فروشگاه، خدمات یا صنایع الکترونیک.')
    business_subcategories = models.JSONField(verbose_name='زیر‌دسته‌های کسب‌وکار', default=list, blank=True, help_text='فهرست زیر‌دسته‌ها در قالب JSON؛ برای مثال: ["پوشاک", "کفش"].')
    brand_description = models.TextField(verbose_name='توضیحات برند', blank=True)
    usp = models.TextField(verbose_name='مزیت‌های رقابتی برند', blank=True, help_text='ویژگی‌هایی که برند را از رقبا متمایز می‌کنند.')
    brand_tone = models.CharField(verbose_name='لحن برند', max_length=50, blank=True, choices=[
        ('professional', 'حرفه‌ای'),
        ('casual', 'خودمانی'),
        ('funny', 'طنز'),
        ('inspirational', 'الهام‌بخش'),
        ('urgent', 'فوری'),
        ('friendly', 'دوستانه'),
    ])
    target_audience = models.TextField(verbose_name='مخاطبان هدف', blank=True)
    gender = models.CharField(verbose_name='جنسیت مخاطبان', max_length=20, blank=True, choices=[
        ('all', 'همه'),
        ('male', 'مرد'),
        ('female', 'زن'),
        ('non_binary', 'غیردودویی'),
        ('unspecified', 'مشخص نشده'),
    ])
    business_location = models.CharField(verbose_name='موقعیت کسب‌وکار', max_length=200, blank=True)
    target_locations = models.JSONField(verbose_name='موقعیت‌های جغرافیایی هدف', default=list, blank=True, help_text='فهرست کشورها یا شهرهای هدف در قالب JSON.')
    brand_assets = models.JSONField(verbose_name='دارایی‌های برند', default=dict, blank=True, help_text='اطلاعات دارایی‌های برند در قالب JSON، مانند نشانی لوگو و اطلاعات تماس.')
    profile_image = models.ImageField(verbose_name='تصویر پروفایل', upload_to='profile_images/', blank=True, null=True)
    product_images = models.JSONField(verbose_name='تصاویر محصولات', default=list, blank=True, help_text='فهرست نشانی تصاویر محصولات در قالب JSON.')

    # Onboarding status
    onboarding_complete = models.BooleanField(verbose_name='راه‌اندازی اولیه تکمیل شده', default=False)

    # WhatsApp module toggle (Pinbot integration)
    whatsapp_enabled = models.BooleanField(verbose_name='واتس‌اپ فعال', default=False)

    # Per-client feature flags for the unified control center.
    # Example: {"composer": true, "scheduler": true, "inbox": true,
    #           "reviews": true, "video_studio": false, "automations": true,
    #           "ai_studio": true, "audience": true, "competitors": true}
    features_enabled = models.JSONField(help_text='مجوز قابلیت‌ها در قالب JSON؛ برای مثال: {"composer": true, "scheduler": true}.', verbose_name='قابلیت‌های فعال', default=dict, blank=True)

    # When True, all UnifiedPost rows go to status='pending_approval' before
    # publishing — used by hospitals / large brands for compliance review.
    requires_approval = models.BooleanField(verbose_name='انتشار نیازمند تأیید', default=False)

    # IANA timezone for accurate scheduled-post timing per client.
    timezone = models.CharField(help_text='نام استاندارد منطقه زمانی؛ برای مثال: Asia/Tehran.', verbose_name='منطقه زمانی', max_length=64, blank=True, default='')

    # ── Marketplace ownership ────────────────────────────────────
    # Who owns this workspace? Existing rows backfill to 'agency_owned' so the
    # legacy agency-managed flow stays untouched. End-user self-signups create
    # rows with 'end_user_owned' + owner_user set.
    owner_user = models.ForeignKey(
        User, verbose_name='کاربر مالک', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='owned_workspaces',
    )
    OWNERSHIP_TYPES = [
        ('end_user_owned', 'متعلق به کاربر نهایی'),
        ('agency_owned',   'متعلق به آژانس'),
        ('orphaned',       'بدون مالک'),
    ]
    ownership_type = models.CharField(verbose_name='نوع مالکیت', max_length=20, choices=OWNERSHIP_TYPES, default='agency_owned')
    CREATED_VIA_CHOICES = [
        ('end_user_signup', 'ثبت‌نام مستقیم کاربر'),
        ('agency_invite',   'ایجاد توسط آژانس'),
        ('marketplace',     'اتصال از بازار خدمات'),
    ]
    created_via = models.CharField(verbose_name='روش ایجاد', max_length=20, choices=CREATED_VIA_CHOICES, default='agency_invite')

    # ── Subscription / plan ──────────────────────────────────────────────────
    SUBSCRIPTION_PLANS = [
        ('free',           'رایگان'),
        ('pro',            'حرفه‌ای'),
        ('premium',        'ویژه'),
        ('agency_managed', 'مدیریت‌شده توسط آژانس'),
    ]
    subscription_plan = models.CharField(verbose_name='طرح اشتراک', max_length=20, choices=SUBSCRIPTION_PLANS, default='free')

    # ── Marketplace listing profile ──────────────────────────────────────────
    display_name                  = models.CharField(verbose_name='نام نمایشی', max_length=200, blank=True)
    industry                      = models.CharField(verbose_name='حوزه فعالیت', max_length=50,  blank=True)
    location_city                 = models.CharField(verbose_name='شهر', max_length=100, blank=True)
    location_country              = models.CharField(help_text='کد دوحرفی کشور؛ برای مثال: IR.', verbose_name='کد کشور', max_length=2,   blank=True)
    is_discoverable_in_marketplace = models.BooleanField(verbose_name='قابل نمایش در بازار خدمات', default=False)

    # ── Meta Conversions API (— CTWA bot builder) ───────────────────
    # When set, lead-capture pushes a 'Lead' event to Meta so CTWA ads can
    # optimize on real conversions. Test code is for sandbox testing only.
    meta_pixel_id        = models.CharField(verbose_name='شناسه پیکسل متا', max_length=50, blank=True)
    meta_capi_test_code  = models.CharField(verbose_name='کد آزمایش API تبدیل متا', max_length=30, blank=True)

    # ── — bot safety controls ───────────────────────────────────────
    bot_enabled                = models.BooleanField(verbose_name='ربات فعال', default=True)   # workspace kill switch
    bot_max_msgs_per_minute    = models.IntegerField(verbose_name='حداکثر پیام ربات به هر مخاطب در دقیقه', default=20)     # per-contact rate limit
    bot_max_msgs_per_conv      = models.IntegerField(verbose_name='حداکثر پیام ربات در هر گفتگو', default=200)    # break runaway loops
    bot_spam_threshold         = models.IntegerField(verbose_name='آستانه امتیاز هرزنامه', default=5)      # auto-end at this score

    # ── — GDPR/DPDP "right to restrict processing" toggle ────────────
    # When True: batch sync fan-outs skip this client, AI calls fail with a
    # clear error (503 via AIError), and composer create/schedule/publish
    # return 423. The user can still log in to view existing data.
    is_processing_paused = models.BooleanField(help_text='با فعال شدن، همگام‌سازی، درخواست‌های هوش مصنوعی و ایجاد یا انتشار پست متوقف می‌شود.', verbose_name='پردازش داده‌ها متوقف شده', default=False)

    def __str__(self):
        return f"{self.company} ({self.name})"

    class Meta:
        ordering = ['company']
        verbose_name = 'فضای کاری'
        verbose_name_plural = 'فضاهای کاری'


# ── Competitors ───────────────────────────────────────────────────────────────
class Competitor(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='competitors')
    name = models.CharField(max_length=200)
    social_links = models.JSONField(default=dict, blank=True, help_text="Dict of platform -> URL")
    created_at = models.DateTimeField(auto_now_add=True)

    # Per-platform public handles for snapshot scraping
    # Example: {"facebook": "@nike", "instagram": "@nike", "youtube": "UC...", "linkedin": "nike"}
    public_handles = models.JSONField(default=dict, blank=True, help_text="Dict of platform -> public handle/id")

    # Time series of follower counts per platform: {"facebook": [{"date": "2026-05-01", "n": 12345}, ...]}
    follower_history = models.JSONField(default=dict, blank=True)

    last_synced_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.client.company} - {self.name}"

    class Meta:
        ordering = ['name']


# ── User Profile (roles) ──────────────────────────────────────────────────────
class UserProfile(models.Model):
    user              = models.OneToOneField(User, verbose_name='کاربر', on_delete=models.CASCADE, related_name='profile')
    role              = models.CharField(verbose_name='نقش', max_length=20, choices=ROLE_CHOICES, default='client')
    client            = models.ForeignKey(Client, verbose_name='فضای کاری', null=True, blank=True, on_delete=models.SET_NULL)
    assigned_clients  = models.ManyToManyField(Client, verbose_name='فضاهای کاری تخصیص‌یافته', blank=True, related_name='staff_assigned')
    avatar            = models.ImageField(verbose_name='تصویر کاربر', upload_to='avatars/', blank=True, null=True)
    created_at        = models.DateTimeField(verbose_name='زمان ایجاد', auto_now_add=True)
    terms_accepted    = models.BooleanField(verbose_name='شرایط استفاده پذیرفته شده', default=False)
    terms_accepted_at = models.DateTimeField(verbose_name='زمان پذیرش شرایط استفاده', null=True, blank=True)
    is_self_registered = models.BooleanField(verbose_name='ثبت‌نام توسط خود کاربر', default=False)
    email_verified     = models.BooleanField(verbose_name='ایمیل تأیید شده', default=True)   # False for email/password signups until verified
    agency             = models.ForeignKey(User, verbose_name='کاربر مدیر آژانس', null=True, blank=True, on_delete=models.SET_NULL, related_name='managed_clients')

    # ── Marketplace account type ────────────────────────────────
    # 'legacy' is the default for everyone existing pre-marketplace; the
    # signup flows (end-user vs agency) set the right value going forward.
    ACCOUNT_TYPES = [
        ('end_user',      'کاربر نهایی'),       # B2C, owns one or more workspaces
        ('agency_member', 'عضو آژانس'),  # works at an agency
        ('legacy',        'حساب قدیمی'),         # pre-marketplace, mapped on migration
    ]
    account_type      = models.CharField(verbose_name='نوع حساب', max_length=20, choices=ACCOUNT_TYPES, default='legacy')
    primary_agency    = models.ForeignKey(
        'Agency', verbose_name='آژانس اصلی', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='primary_members',
    )
    default_workspace = models.ForeignKey(
        Client, verbose_name='فضای کاری پیش‌فرض', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='+',
    )

    def __str__(self):
        return f"{self.user.email} ({self.get_role_display()})"

    def can_access_client(self, client_id):
        from .authorization import accessible_workspaces
        try:
            return accessible_workspaces(self.user).filter(pk=int(client_id)).exists()
        except (TypeError, ValueError):
            return False

    class Meta:
        verbose_name = 'پروفایل کاربر'
        verbose_name_plural = 'پروفایل‌های کاربران'


class EmailVerificationToken(models.Model):
    user       = models.OneToOneField(User, on_delete=models.CASCADE, related_name='email_verification')
    token      = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used    = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.pk:
            self.expires_at = timezone.now() + timedelta(hours=24)
        super().save(*args, **kwargs)

    def is_valid(self):
        return not self.is_used and timezone.now() < self.expires_at

    def __str__(self):
        return f"Verification token for {self.user.email}"


class PasswordResetToken(models.Model):
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_resets')
    token      = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used    = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.pk:
            self.expires_at = timezone.now() + timedelta(hours=2)
        super().save(*args, **kwargs)

    def is_valid(self):
        return not self.is_used and timezone.now() < self.expires_at

    def __str__(self):
        return f"Reset token for {self.user.email}"


def ensure_client_profile(profile):
    """
    Ensure client-role users always have a linked Client record.
    This supports direct client signups/social logins in the same way as
    agency-created client accounts.
    """
    if not profile or profile.role != 'client':
        return None
    if profile.client_id:
        return profile.client

    user = profile.user
    email = (user.email or '').strip().lower()
    if not email:
        return None

    with transaction.atomic():
        existing = Client.objects.filter(email__iexact=email).first()
        if existing:
            profile.client = existing
            profile.save(update_fields=['client'])
            return existing

        full_name = (user.get_full_name() or user.username or email.split('@')[0]).strip()
        first_name = (user.first_name or '').strip()
        company = first_name or full_name or email.split('@')[0]

        client = Client.objects.create(
            name=full_name,
            company=company,
            email=email,
        )
        profile.client = client
        profile.save(update_fields=['client'])
        return client


# ── OAuth Credentials per client per platform ─────────────────────────────────
class SocialAccount(models.Model):
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
class DailyMetric(models.Model):
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
ONBOARDING_STEP_CHOICES = [
    ('connect_platform',  'Connect a Platform'),
    ('first_sync',        'Run First Sync'),
    ('set_goals',         'Set Monthly Goals'),
    ('add_credentials',   'Add API Credentials'),
    ('invite_team',       'Invite Team Members'),
    ('configure_alerts',  'Configure Alerts'),
]

ONBOARDING_STEP_DESCRIPTIONS = {
    'connect_platform': 'Connect at least one social media platform via OAuth.',
    'first_sync':       'Run a successful data sync to pull in your first metrics.',
    'set_goals':        'Create at least one monthly performance goal.',
    'add_credentials':  'Add API credentials for manual platform access.',
    'invite_team':      'Invite a team member or verify your account is set up.',
    'configure_alerts': 'Review and configure your smart alert preferences.',
}


class OnboardingStep(models.Model):
    client       = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='onboarding_steps')
    step_key     = models.CharField(max_length=40, choices=ONBOARDING_STEP_CHOICES)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        unique_together = ('client', 'step_key')
        ordering = ['id']

    def __str__(self):
        status = '✓' if self.is_completed else '○'
        return f"{self.client.company} | {status} {self.step_key}"

    def mark_complete(self, user=None):
        if not self.is_completed:
            self.is_completed = True
            self.completed_at = timezone.now()
            self.completed_by = user
            self.save(update_fields=['is_completed', 'completed_at', 'completed_by'])


# ── Signals: auto-create onboarding steps + auto-mark complete ────────────────
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender=Client)
def create_onboarding_steps(sender, instance, created, **kwargs):
    if created:
        for step_key, _ in ONBOARDING_STEP_CHOICES:
            OnboardingStep.objects.get_or_create(client=instance, step_key=step_key)


@receiver(post_save, sender='social_stats.PlatformCredential')
def mark_connect_platform(sender, instance, created, **kwargs):
    if created:
        OnboardingStep.objects.filter(
            client=instance.client, step_key='connect_platform', is_completed=False
        ).update(is_completed=True, completed_at=timezone.now())
        OnboardingStep.objects.filter(
            client=instance.client, step_key='add_credentials', is_completed=False
        ).update(is_completed=True, completed_at=timezone.now())


@receiver(post_save, sender='social_stats.SyncLog')
def mark_first_sync(sender, instance, **kwargs):
    if instance.status == 'success' and instance.client_id:
        OnboardingStep.objects.filter(
            client=instance.client, step_key='first_sync', is_completed=False
        ).update(is_completed=True, completed_at=timezone.now())


@receiver(post_save, sender='social_stats.ClientGoal')
def mark_set_goals(sender, instance, created, **kwargs):
    if created:
        OnboardingStep.objects.filter(
            client=instance.client, step_key='set_goals', is_completed=False
        ).update(is_completed=True, completed_at=timezone.now())


# ── ROI Settings ──────────────────────────────────────────────────────────────
class ROISettings(models.Model):
    client              = models.OneToOneField(Client, verbose_name='فضای کاری', on_delete=models.CASCADE, related_name='roi_settings')
    facebook_budget     = models.DecimalField(verbose_name='بودجه فیسبوک', max_digits=10, decimal_places=2, default=0)
    instagram_budget    = models.DecimalField(verbose_name='بودجه اینستاگرام', max_digits=10, decimal_places=2, default=0)
    youtube_budget      = models.DecimalField(verbose_name='بودجه یوتیوب', max_digits=10, decimal_places=2, default=0)
    linkedin_budget     = models.DecimalField(verbose_name='بودجه لینکدین', max_digits=10, decimal_places=2, default=0)
    gmb_budget          = models.DecimalField(verbose_name='بودجه کسب‌وکار گوگل', max_digits=10, decimal_places=2, default=0)
    agency_fee          = models.DecimalField(verbose_name='حق‌الزحمه آژانس', max_digits=10, decimal_places=2, default=0)
    avg_sale_value      = models.DecimalField(verbose_name='میانگین ارزش هر فروش', max_digits=10, decimal_places=2, default=0)
    conversion_rate     = models.DecimalField(verbose_name='نرخ تبدیل کلیک به سرنخ (درصد)', max_digits=5, decimal_places=2, default=2.5)
    lead_to_sale_rate   = models.DecimalField(verbose_name='نرخ تبدیل سرنخ به فروش (درصد)', max_digits=5, decimal_places=2, default=20.0)
    currency            = models.CharField(verbose_name='کد ارز', max_length=10, default='USD')
    currency_symbol     = models.CharField(verbose_name='نماد ارز', max_length=5, default='$')
    monthly_revenue_goal = models.DecimalField(verbose_name='هدف درآمد ماهانه', max_digits=12, decimal_places=2, default=0)
    monthly_leads_goal  = models.IntegerField(verbose_name='هدف تعداد سرنخ ماهانه', default=0)
    updated_at          = models.DateTimeField(verbose_name='آخرین ویرایش', auto_now=True)

    def __str__(self):
        return f"تنظیمات بازگشت سرمایه — {self.client.company}"

    @property
    def total_budget(self):
        return (self.facebook_budget + self.instagram_budget + self.youtube_budget +
                self.linkedin_budget + self.gmb_budget + self.agency_fee)

    class Meta:
        verbose_name = 'تنظیمات بازگشت سرمایه'
        verbose_name_plural = 'تنظیمات بازگشت سرمایه'


# ── ROI Report ────────────────────────────────────────────────────────────────
class ROIReport(models.Model):
    client            = models.ForeignKey(Client, verbose_name='فضای کاری', on_delete=models.CASCADE, related_name='roi_reports')
    month             = models.IntegerField(verbose_name='ماه', )
    year              = models.IntegerField(verbose_name='سال', )
    total_investment  = models.DecimalField(verbose_name='مجموع سرمایه‌گذاری', max_digits=12, decimal_places=2, default=0)
    agency_fee        = models.DecimalField(verbose_name='حق‌الزحمه آژانس', max_digits=10, decimal_places=2, default=0)
    total_clicks      = models.BigIntegerField(verbose_name='مجموع کلیک‌ها', default=0)
    total_impressions = models.BigIntegerField(verbose_name='مجموع نمایش‌ها', default=0)
    total_reach       = models.BigIntegerField(verbose_name='مجموع دسترسی مخاطبان', default=0)
    website_clicks    = models.BigIntegerField(verbose_name='تعداد کلیک وب‌سایت', default=0)
    estimated_leads   = models.IntegerField(verbose_name='تعداد سرنخ تخمینی', default=0)
    estimated_sales   = models.IntegerField(verbose_name='تعداد فروش تخمینی', default=0)
    estimated_revenue = models.DecimalField(verbose_name='درآمد تخمینی', max_digits=14, decimal_places=2, default=0)
    roi_percentage    = models.DecimalField(verbose_name='بازگشت سرمایه (درصد)', max_digits=10, decimal_places=2, default=0)
    cost_per_click    = models.DecimalField(verbose_name='هزینه هر کلیک', max_digits=10, decimal_places=4, default=0)
    cost_per_lead     = models.DecimalField(verbose_name='هزینه هر سرنخ', max_digits=10, decimal_places=4, default=0)
    cost_per_sale     = models.DecimalField(verbose_name='هزینه هر فروش', max_digits=10, decimal_places=4, default=0)
    platform_breakdown = models.JSONField(verbose_name='تفکیک آمار پلتفرم‌ها', default=dict)
    generated_at      = models.DateTimeField(verbose_name='زمان تولید گزارش', auto_now_add=True)

    class Meta:
        verbose_name_plural = 'گزارش‌های بازگشت سرمایه'
        verbose_name = 'گزارش بازگشت سرمایه'
        unique_together = ('client', 'month', 'year')
        ordering = ['-year', '-month']

    def __str__(self):
        return f"گزارش بازگشت سرمایه — {self.client.company} {self.month}/{self.year}"


# ── Sync Log ──────────────────────────────────────────────────────────────────
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

PERMISSION_CATEGORY_CHOICES = [
    ('pages',    'Pages'),
    ('sections', 'Sections'),
    ('actions',  'Actions'),
    ('data',     'Data'),
]

ALL_PERMISSIONS = [
    # Dashboard
    ('dashboard.view',               'View Dashboard',                'See the main dashboard page',                          'pages',    True,  True,  10),
    ('dashboard.kpi_cards',          'See KPI Cards',                 'View stat cards at top of dashboard',                  'sections', True,  True,  11),
    ('dashboard.charts',             'See Charts',                    'View charts and graphs',                               'sections', True,  True,  12),
    ('dashboard.platform_tabs',      'Platform Tabs',                 'Switch between platforms',                             'sections', True,  True,  13),
    ('dashboard.date_range',         'Change Date Range',             'Modify date range filter',                             'actions',  True,  True,  14),
    ('dashboard.posts_table',        'Recent Posts Table',            'See recent posts section',                             'sections', True,  True,  15),
    ('dashboard.platform_breakdown', 'Platform Breakdown',            'See platform breakdown table',                         'sections', True,  True,  16),
    ('dashboard.sync_now',           'Sync Now Button',               'Trigger manual sync',                                  'actions',  True,  False, 17),
    ('dashboard.export_pdf',         'Export PDF',                    'Export dashboard as PDF report',                       'actions',  True,  True,  18),
    # Analytics
    ('analytics.view',               'View Analytics',                'Access analytics page',                                'pages',    True,  True,  20),
    ('analytics.impressions',        'Impressions Data',              'See impressions metrics',                              'data',     True,  True,  21),
    ('analytics.reach',              'Reach Data',                    'See reach metrics',                                    'data',     True,  True,  22),
    ('analytics.engagement',         'Engagement Data',               'See engagement metrics',                               'data',     True,  True,  23),
    ('analytics.video_views',        'Video Views Data',              'See video view counts',                                'data',     True,  True,  24),
    ('analytics.followers',          'Followers Data',                'See follower counts',                                  'data',     True,  True,  25),
    ('analytics.website_clicks',     'Website Clicks',                'See website click data',                               'data',     True,  True,  26),
    ('analytics.phone_calls',        'Phone Calls',                   'See phone call data (GMB)',                            'data',     True,  False, 27),
    ('analytics.direction_requests', 'Direction Requests',            'See direction requests (GMB)',                         'data',     True,  False, 28),
    # Calendar
    ('calendar.view',                'View Calendar',                 'Access content calendar page',                         'pages',    True,  True,  30),
    ('calendar.month_view',          'Month View',                    'See monthly calendar grid',                            'sections', True,  True,  31),
    ('calendar.list_view',           'List View',                     'See list view of posts',                               'sections', True,  True,  32),
    ('calendar.stats_view',          'Stats View',                    'See posting stats',                                    'sections', True,  False, 33),
    ('calendar.create_post',         'Create Posts',                  'Schedule new posts',                                   'actions',  True,  False, 34),
    ('calendar.edit_post',           'Edit Posts',                    'Edit existing calendar posts',                         'actions',  True,  False, 35),
    ('calendar.delete_post',         'Delete Posts',                  'Delete calendar posts',                                'actions',  True,  False, 36),
    ('calendar.add_notes',           'Add Notes',                     'Add calendar notes',                                   'actions',  True,  False, 37),
    ('calendar.view_notes',          'View Notes',                    'See calendar notes',                                   'sections', True,  True,  38),
    ('calendar.best_times',          'Best Posting Times',            'See recommended posting times',                        'sections', True,  False, 39),
    # ROI
    ('roi.view',                     'View ROI Calculator',           'Access ROI calculator page',                           'pages',    True,  True,  40),
    ('roi.view_results',             'See ROI Results',               'View calculated ROI results',                          'sections', True,  True,  41),
    ('roi.edit_settings',            'Edit ROI Settings',             'Modify budgets and conversion rates',                  'actions',  True,  False, 42),
    ('roi.view_history',             'ROI History',                   'View past ROI reports',                                'sections', True,  True,  43),
    ('roi.export',                   'Export ROI Report',             'Download ROI as PDF',                                  'actions',  True,  False, 44),
    # Reports
    ('reports.view',                 'View Reports',                  'Access reports page',                                  'pages',    True,  True,  50),
    ('reports.download_pdf',         'Download PDF',                  'Download report PDFs',                                 'actions',  True,  True,  51),
    ('reports.view_history',         'Report History',                'See past generated reports',                           'sections', True,  True,  52),
    ('reports.schedule',             'Schedule Reports',              'Configure automated report delivery',                  'actions',  True,  False, 53),
    # Alerts
    ('alerts.view',                  'View Alerts',                   'Access alerts page',                                   'pages',    True,  False, 60),
    ('alerts.mark_read',             'Mark Alerts Read',              'Dismiss and mark alerts as read',                      'actions',  True,  False, 61),
    ('alerts.configure',             'Configure Alerts',              'Set up alert rules and thresholds',                    'actions',  True,  False, 62),
    # Reviews
    ('reviews.view',                 'View Reviews',                  'Access reviews page',                                  'pages',    True,  False, 70),
    ('reviews.reply',                'Reply to Reviews',              'Post replies to Google reviews',                       'actions',  True,  False, 71),
    ('reviews.view_stats',           'Review Statistics',             'See review rating analytics',                          'sections', True,  False, 72),
    # Settings
    ('settings.view',                'View Settings',                 'Access settings page',                                 'pages',    True,  True,  80),
    ('settings.connect_accounts',    'Connect Accounts',              'Link social media accounts via OAuth',                 'actions',  True,  True,  81),
    ('settings.disconnect_accounts', 'Disconnect Accounts',           'Unlink connected accounts',                            'actions',  True,  False, 82),
    ('settings.view_credentials',    'View Connected Status',         'See which platforms are connected',                    'sections', True,  True,  83),
    # Billing
    ('billing.view',                 'View Billing',                  'Access billing page',                                  'pages',    True,  False, 90),
    ('billing.view_invoices',        'View Invoices',                 'See invoice history',                                  'sections', True,  False, 91),
    ('billing.download_invoices',    'Download Invoices',             'Download invoice PDFs',                                'actions',  True,  False, 92),
    # Data
    ('data.view_all_clients',        'View All Clients',              'Access data for all clients',                          'data',     True,  False, 100),
    ('data.view_assigned_clients',   'View Assigned Clients',         'Access data only for assigned clients',                'data',     True,  False, 101),
    ('data.view_own_client',         'View Own Client Data',          'Access own client data only',                          'data',     False, True,  102),
    ('data.impressions',             'Impressions Numbers',           'See impressions figures',                              'data',     True,  True,  103),
    ('data.revenue_data',            'Revenue / ROI Numbers',         'See financial and ROI data',                           'data',     True,  False, 104),
    ('data.competitor_data',         'Competitor Data',               'Access competitor benchmarks',                         'data',     True,  False, 105),
]

# Page groupings for the UI
PERMISSION_PAGE_GROUPS = {
    'dashboard': {'label': 'Dashboard',         'icon': '📊', 'prefix': 'dashboard.'},
    'analytics': {'label': 'Analytics',         'icon': '📈', 'prefix': 'analytics.'},
    'calendar':  {'label': 'Content Calendar',  'icon': '📅', 'prefix': 'calendar.'},
    'roi':       {'label': 'ROI Calculator',    'icon': '💰', 'prefix': 'roi.'},
    'reports':   {'label': 'Reports',           'icon': '📄', 'prefix': 'reports.'},
    'alerts':    {'label': 'Alerts',            'icon': '🔔', 'prefix': 'alerts.'},
    'reviews':   {'label': 'Reviews',           'icon': '⭐', 'prefix': 'reviews.'},
    'settings':  {'label': 'Settings',          'icon': '⚙️', 'prefix': 'settings.'},
    'billing':   {'label': 'Billing',           'icon': '💳', 'prefix': 'billing.'},
    'data':      {'label': 'Data Access',       'icon': '🗄️', 'prefix': 'data.'},
    'whatsapp':  {'label': 'WhatsApp',          'icon': '💬', 'prefix': 'whatsapp.'},
    'composer':      {'label': 'Composer',          'icon': '✍️', 'prefix': 'composer.'},
    'inbox':         {'label': 'Inbox',             'icon': '📥', 'prefix': 'inbox.'},
    'video_studio':  {'label': 'Video Studio',      'icon': '🎬', 'prefix': 'video.'},
    'automations':   {'label': 'Automations',       'icon': '⚡', 'prefix': 'automations.'},
    'ai_studio':     {'label': 'AI Studio',         'icon': '✨', 'prefix': 'ai.'},
    'audience':      {'label': 'Audience Insights', 'icon': '👥', 'prefix': 'audience.'},
    'competitors':   {'label': 'Competitors',       'icon': '🏆', 'prefix': 'competitors.'},
    'audit':         {'label': 'Audit Log',         'icon': '📜', 'prefix': 'audit.'},
    # CTWA Bot Builder
    'bot_flows':     {'label': 'Bot Flows',         'icon': '🤖', 'prefix': 'bot.'},
    'leads':         {'label': 'Leads',             'icon': '👥', 'prefix': 'leads.'},
    'ctwa':          {'label': 'CTWA Campaigns',    'icon': '📣', 'prefix': 'ctwa.'},
}


class Permission(models.Model):
    code             = models.CharField(max_length=100, unique=True)
    label            = models.CharField(max_length=200)
    description      = models.CharField(max_length=300, blank=True)
    category         = models.CharField(max_length=20, choices=PERMISSION_CATEGORY_CHOICES, default='pages')
    page             = models.CharField(max_length=50, blank=True)
    is_default_staff  = models.BooleanField(default=False)
    is_default_client = models.BooleanField(default=False)
    sort_order        = models.IntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'code']

    def __str__(self):
        return f"{self.code} — {self.label}"


class RolePermission(models.Model):
    role       = models.CharField(max_length=20, choices=[('staff','Staff'),('client','Client')])
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE, related_name='role_permissions')
    is_granted = models.BooleanField(default=True)

    class Meta:
        unique_together = ('role', 'permission')

    def __str__(self):
        return f"{self.role} | {self.permission.code} | {'✓' if self.is_granted else '✗'}"


class UserPermission(models.Model):
    user_profile = models.ForeignKey('UserProfile', on_delete=models.CASCADE, related_name='permission_overrides')
    permission   = models.ForeignKey(Permission, on_delete=models.CASCADE, related_name='user_overrides')
    is_granted   = models.BooleanField()
    granted_by   = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='granted_permissions')
    granted_at   = models.DateTimeField(auto_now_add=True)
    note         = models.CharField(max_length=300, blank=True)

    class Meta:
        unique_together = ('user_profile', 'permission')

    def __str__(self):
        return f"{self.user_profile.user.email} | {self.permission.code} | {'✓' if self.is_granted else '✗'}"


class StaffClientAssignment(models.Model):
    staff_profile = models.ForeignKey('UserProfile', on_delete=models.CASCADE, related_name='client_assignments')
    client        = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='staff_assignments')
    assigned_by   = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='made_assignments')
    assigned_at   = models.DateTimeField(auto_now_add=True)
    can_edit      = models.BooleanField(default=False)
    can_sync      = models.BooleanField(default=True)
    can_export    = models.BooleanField(default=True)
    note          = models.CharField(max_length=300, blank=True)

    class Meta:
        unique_together = ('staff_profile', 'client')

    def __str__(self):
        return f"{self.staff_profile.user.email} → {self.client.company}"


class ClientPageConfig(models.Model):
    client               = models.OneToOneField(Client, on_delete=models.CASCADE, related_name='page_config')
    portal_title         = models.CharField(max_length=200, default='My Dashboard')
    show_platform_tabs   = models.BooleanField(default=True)
    show_date_picker     = models.BooleanField(default=True)
    show_export_button   = models.BooleanField(default=True)
    show_sync_button     = models.BooleanField(default=False)
    show_posts_section   = models.BooleanField(default=True)
    show_reviews_section = models.BooleanField(default=False)
    show_roi_section     = models.BooleanField(default=False)
    show_calendar        = models.BooleanField(default=False)
    default_platform     = models.CharField(max_length=30, default='all')
    default_date_range   = models.IntegerField(default=30)
    custom_logo_url      = models.URLField(blank=True)
    custom_accent_color  = models.CharField(max_length=7, default='#2563EB')
    welcome_message      = models.TextField(blank=True)
    updated_at           = models.DateTimeField(auto_now=True)
    updated_by           = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='updated_portal_configs')

    def __str__(self):
        return f"Portal config — {self.client.company}"


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
INVITATION_STATUS_CHOICES = [
    ('pending',   'Pending'),
    ('accepted',  'Accepted'),
    ('rejected',  'Rejected'),
    ('cancelled', 'Cancelled'),
    ('expired',   'Expired'),
]

class ClientInvitation(models.Model):
    invited_by    = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invitations')
    client_user   = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='received_invitations')
    client_email  = models.EmailField()
    client_record = models.ForeignKey(Client, null=True, blank=True, on_delete=models.SET_NULL, related_name='invitations')
    token         = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    status        = models.CharField(max_length=20, choices=INVITATION_STATUS_CHOICES, default='pending')
    message       = models.TextField(blank=True)
    invited_at    = models.DateTimeField(auto_now_add=True)
    responded_at  = models.DateTimeField(null=True, blank=True)
    expires_at    = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-invited_at']

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return self.status == 'pending' and timezone.now() > self.expires_at

    def __str__(self):
        return f"Invitation from {self.invited_by.email} to {self.client_email} ({self.status})"


# ── Notification ──────────────────────────────────────────────────────────────
NOTIF_TYPE_CHOICES = [
    ('invitation_received',  'Invitation Received'),
    ('invitation_accepted',  'Invitation Accepted'),
    ('invitation_rejected',  'Invitation Rejected'),
    ('invitation_cancelled', 'Invitation Cancelled'),
    # Marketplace
    ('manage_request_received',  'Manage Request Received'),
    ('manage_request_accepted',  'Manage Request Accepted'),
    ('manage_request_declined',  'Manage Request Declined'),
    ('manage_request_cancelled', 'Manage Request Cancelled'),
    ('system',                   'System'),
]

class Notification(models.Model):
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    client     = models.ForeignKey('Client', on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    notif_type = models.CharField(max_length=30, choices=NOTIF_TYPE_CHOICES, default='system')
    title      = models.CharField(max_length=200)
    body       = models.TextField(blank=True)
    data       = models.JSONField(default=dict, blank=True)
    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'client', '-created_at']),
        ]

    def __str__(self):
        return f"{self.user.email} — {self.title}"


# ── WhatsApp (Pinbot integration) ─────────────────────────────────────────────

WA_QUALITY_CHOICES = [
    ('GREEN',   'Green'),
    ('YELLOW',  'Yellow'),
    ('RED',     'Red'),
    ('UNKNOWN', 'Unknown'),
]

WA_TIER_CHOICES = [
    ('TIER_1K',       '1,000 / 24h'),
    ('TIER_10K',      '10,000 / 24h'),
    ('TIER_100K',     '100,000 / 24h'),
    ('TIER_UNLIMITED','Unlimited'),
]

WA_OPT_IN_CHOICES = [
    ('pending',    'Pending'),
    ('opted_in',   'Opted In'),
    ('opted_out',  'Opted Out'),
]

WA_TEMPLATE_CATEGORY_CHOICES = [
    ('marketing',      'Marketing'),
    ('utility',        'Utility'),
    ('authentication', 'Authentication'),
]

WA_TEMPLATE_TYPE_CHOICES = [
    ('text',     'Text'),
    ('image',    'Image'),
    ('video',    'Video'),
    ('document', 'Document'),
    ('location', 'Location'),
    ('carousel', 'Carousel'),
    ('coupon',   'Coupon'),
    ('mpm',      'Multi-Product Message'),
    ('lto',      'Limited-Time Offer'),
]

WA_TEMPLATE_STATUS_CHOICES = [
    ('draft',    'Draft'),
    ('pending',  'Pending'),
    ('approved', 'Approved'),
    ('rejected', 'Rejected'),
    ('paused',   'Paused'),
]

WA_CAMPAIGN_STATUS_CHOICES = [
    ('draft',     'Draft'),
    ('scheduled', 'Scheduled'),
    ('running',   'Running'),
    ('completed', 'Completed'),
    ('failed',    'Failed'),
    ('cancelled', 'Cancelled'),
    ('paused',    'Paused'),
]

WA_MESSAGE_STATUS_CHOICES = [
    ('queued',    'Queued'),
    ('sent',      'Sent'),
    ('delivered', 'Delivered'),
    ('read',      'Read'),
    ('failed',    'Failed'),
]

WA_DIRECTION_CHOICES = [
    ('outbound', 'Outbound'),
    ('inbound',  'Inbound'),
]


class WhatsAppAccount(models.Model):
    """Pinbot WABA (WhatsApp Business Account) configured per Client."""
    client            = models.OneToOneField(Client, on_delete=models.CASCADE, related_name='whatsapp_account')
    waba_id           = models.CharField(max_length=100)
    phone_number_id   = models.CharField(max_length=100)
    phone_number      = models.CharField(max_length=30, blank=True)
    api_key_encrypted = models.BinaryField(blank=True, null=True)
    display_name      = models.CharField(max_length=200, blank=True)
    is_active         = models.BooleanField(default=True)
    quality_rating    = models.CharField(max_length=10, choices=WA_QUALITY_CHOICES, default='UNKNOWN')
    messaging_tier    = models.CharField(max_length=20, choices=WA_TIER_CHOICES, default='TIER_1K')
    last_synced_at    = models.DateTimeField(null=True, blank=True)
    created_at        = models.DateTimeField(auto_now_add=True)
    updated_at        = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.client.company} — WhatsApp ({self.phone_number or self.phone_number_id})"

    # ── api_key encryption (Fernet via settings.WHATSAPP_ENCRYPTION_KEY) ──
    @property
    def api_key(self):
        if not self.api_key_encrypted:
            return ''
        from cryptography.fernet import Fernet
        from django.conf import settings
        key = settings.WHATSAPP_ENCRYPTION_KEY
        if not key:
            return ''
        f = Fernet(key.encode() if isinstance(key, str) else key)
        try:
            return f.decrypt(bytes(self.api_key_encrypted)).decode()
        except Exception:
            return ''

    @api_key.setter
    def api_key(self, value):
        if not value:
            self.api_key_encrypted = b''
            return
        from cryptography.fernet import Fernet
        from django.conf import settings
        key = settings.WHATSAPP_ENCRYPTION_KEY
        if not key:
            raise ValueError('WHATSAPP_ENCRYPTION_KEY is not configured')
        f = Fernet(key.encode() if isinstance(key, str) else key)
        self.api_key_encrypted = f.encrypt(value.encode())


class WhatsAppContact(models.Model):
    client          = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='whatsapp_contacts')
    phone           = models.CharField(max_length=20, db_index=True)
    name            = models.CharField(max_length=200, blank=True)
    email           = models.EmailField(blank=True)
    tags            = models.JSONField(default=list, blank=True)
    custom_fields   = models.JSONField(default=dict, blank=True)
    opt_in_status   = models.CharField(max_length=20, choices=WA_OPT_IN_CHOICES, default='pending')
    opt_in_source   = models.CharField(max_length=100, blank=True)
    opt_in_at       = models.DateTimeField(null=True, blank=True)
    opt_in_evidence = models.JSONField(default=dict, blank=True)
    opt_out_at      = models.DateTimeField(null=True, blank=True)
    opt_out_keyword = models.CharField(max_length=40, blank=True)  # what they typed to opt out
    last_message_at = models.DateTimeField(null=True, blank=True)
    last_inbound_at = models.DateTimeField(null=True, blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('client', 'phone')
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['client', 'opt_in_status']),
        ]

    def __str__(self):
        return f"{self.name or self.phone} ({self.client.company})"

    @property
    def within_24h_window(self):
        """True if a free-form (non-template) message can be sent right now."""
        if not self.last_inbound_at:
            return False
        return (timezone.now() - self.last_inbound_at) < timedelta(hours=24)


class WhatsAppContactList(models.Model):
    client      = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='whatsapp_lists')
    name        = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    contacts    = models.ManyToManyField(WhatsAppContact, related_name='lists', blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.client.company})"


class WhatsAppTemplate(models.Model):
    client             = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='whatsapp_templates')
    name               = models.CharField(max_length=100, help_text='Lowercase slug-like, e.g. order_confirmation')
    category           = models.CharField(max_length=20, choices=WA_TEMPLATE_CATEGORY_CHOICES, default='marketing')
    language           = models.CharField(max_length=20, default='en_US')
    template_type      = models.CharField(max_length=20, choices=WA_TEMPLATE_TYPE_CHOICES, default='text')
    header             = models.JSONField(default=dict, blank=True)
    body               = models.TextField()
    footer             = models.CharField(max_length=200, blank=True)
    buttons            = models.JSONField(default=list, blank=True)
    pinbot_template_id = models.CharField(max_length=200, blank=True)
    status             = models.CharField(max_length=20, choices=WA_TEMPLATE_STATUS_CHOICES, default='draft')
    rejection_reason   = models.TextField(blank=True)
    variables_count    = models.IntegerField(default=0)
    created_by         = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_wa_templates')
    created_at         = models.DateTimeField(auto_now_add=True)
    updated_at         = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('client', 'name', 'language')
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.name} ({self.language}) — {self.client.company}"

    def save(self, *args, **kwargs):
        # Auto-calculate variable count from body placeholders {{1}}, {{2}}, ...
        import re
        if self.body:
            placeholders = re.findall(r'\{\{(\d+)\}\}', self.body)
            self.variables_count = len(set(placeholders))
        super().save(*args, **kwargs)


class WhatsAppCampaign(models.Model):
    client             = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='whatsapp_campaigns')
    name               = models.CharField(max_length=200)
    template           = models.ForeignKey(WhatsAppTemplate, on_delete=models.PROTECT, related_name='campaigns')
    contact_list       = models.ForeignKey(WhatsAppContactList, on_delete=models.PROTECT, related_name='campaigns')
    template_variables = models.JSONField(default=dict, blank=True, help_text='Mapping of {{n}} → value or {{n}} → contact field')
    scheduled_at       = models.DateTimeField(null=True, blank=True)
    started_at         = models.DateTimeField(null=True, blank=True)
    completed_at       = models.DateTimeField(null=True, blank=True)
    status             = models.CharField(max_length=20, choices=WA_CAMPAIGN_STATUS_CHOICES, default='draft')
    total_count        = models.IntegerField(default=0)
    sent_count         = models.IntegerField(default=0)
    delivered_count    = models.IntegerField(default=0)
    read_count         = models.IntegerField(default=0)
    failed_count       = models.IntegerField(default=0)
    created_by         = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_wa_campaigns')
    created_at         = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.status}) — {self.client.company}"

    @property
    def progress_percent(self):
        if not self.total_count:
            return 0
        terminal = self.delivered_count + self.read_count + self.failed_count
        return int(round((terminal / self.total_count) * 100))


class WhatsAppMessage(models.Model):
    client            = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='whatsapp_messages')
    campaign          = models.ForeignKey(WhatsAppCampaign, on_delete=models.SET_NULL, null=True, blank=True, related_name='messages')
    contact           = models.ForeignKey(WhatsAppContact, on_delete=models.CASCADE, related_name='messages')
    pinbot_message_id = models.CharField(max_length=200, blank=True, db_index=True)
    direction         = models.CharField(max_length=10, choices=WA_DIRECTION_CHOICES, default='outbound')
    message_type      = models.CharField(max_length=30, default='text')
    payload           = models.JSONField(default=dict, blank=True)
    status            = models.CharField(max_length=15, choices=WA_MESSAGE_STATUS_CHOICES, default='queued')
    error_code        = models.CharField(max_length=50, blank=True)
    error_message     = models.TextField(blank=True)
    sent_at           = models.DateTimeField(null=True, blank=True)
    delivered_at      = models.DateTimeField(null=True, blank=True)
    read_at           = models.DateTimeField(null=True, blank=True)
    created_at        = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['client', '-created_at']),
            models.Index(fields=['campaign', 'status']),
            models.Index(fields=['contact', '-created_at']),
        ]

    def __str__(self):
        return f"{self.direction} → {self.contact.phone} | {self.status}"


class AdsWaitlist(models.Model):
    """Email signups for the upcoming Ads module."""
    email      = models.EmailField()
    source     = models.CharField(max_length=50, blank=True, help_text='Where the signup came from')
    user       = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='ads_waitlist')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['email'])]

    def __str__(self):
        return f"{self.email} ({self.created_at:%Y-%m-%d})"


class WhatsAppWebhookLog(models.Model):
    client     = models.ForeignKey(Client, on_delete=models.SET_NULL, null=True, blank=True, related_name='whatsapp_webhooks')
    event_type = models.CharField(max_length=100, default='unknown')
    payload    = models.JSONField(default=dict, blank=True)
    processed  = models.BooleanField(default=False)
    error      = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['processed', '-created_at']),
        ]

    def __str__(self):
        return f"{self.event_type} | {'✓' if self.processed else '○'} | {self.created_at:%Y-%m-%d %H:%M}"


# ══════════════════════════════════════════════════════════════════════════════
# UNIFIED CONTROL CENTER — Composer + Inbox + Engagement + Automation
# ══════════════════════════════════════════════════════════════════════════════

# ── Choice tuples ─────────────────────────────────────────────────────────────
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

CONVERSATION_TYPE_CHOICES = [
    ('comment',  'دیدگاه'),
    ('dm',       'پیام مستقیم'),
    ('mention',  'اشاره به حساب'),
    ('review',   'نظر مشتری'),
]

MESSAGE_DIRECTION_CHOICES = [
    ('inbound',  'دریافتی'),
    ('outbound', 'ارسالی'),
]

SENTIMENT_CHOICES = [
    ('positive', 'مثبت'),
    ('neutral',  'خنثی'),
    ('negative', 'منفی'),
    ('unknown',  'نامشخص'),
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

REVIEW_STATUS_CHOICES = [
    ('new',     'جدید'),
    ('replied', 'پاسخ داده شده'),
    ('flagged', 'علامت‌گذاری شده'),
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

AUTOMATION_ACTION_CHOICES = [
    ('auto_reply',     'پاسخ خودکار'),
    ('ai_smart_reply', 'پاسخ هوشمند با هوش مصنوعی'),
    ('notify',         'ارسال اعلان'),
    ('assign',         'تخصیص به کاربر'),
    ('add_tag',        'افزودن برچسب'),
    ('webhook',        'فراخوانی وب‌هوک'),
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
        unique_together = ('unified_post', 'platform')
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
class BrandVoiceProfile(models.Model):
    """Per-client brand voice trained from sample posts; used by AI prompts."""
    TRAINING_STATUS_CHOICES = [
        ('pending',  'Pending'),
        ('training', 'Training'),
        ('ready',    'Ready'),
        ('failed',   'Failed'),
    ]
    EMOJI_USAGE_CHOICES = [
        ('heavy',    'Heavy'),
        ('moderate', 'Moderate'),
        ('minimal',  'Minimal'),
        ('none',     'None'),
    ]

    client            = models.OneToOneField(Client, on_delete=models.CASCADE, related_name='brand_voice')
    sample_posts      = models.JSONField(default=list, blank=True, help_text='List of sample post strings')
    voice_summary     = models.TextField(blank=True, help_text='AI-generated summary of brand voice')
    tone_descriptors  = models.JSONField(default=list, blank=True, help_text='["friendly", "concise", "expert"]')

    # Vocabulary controls
    forbidden_words   = models.JSONField(default=list, blank=True, help_text='Words/phrases to avoid')
    preferred_words   = models.JSONField(default=list, blank=True, help_text='Brand vocabulary to favour')
    style_rules       = models.JSONField(default=list, blank=True)

    # Audience + content fences (added AI infra)
    target_audience   = models.TextField(blank=True)
    prohibited_topics = models.JSONField(default=list, blank=True)
    emoji_usage       = models.CharField(max_length=10, choices=EMOJI_USAGE_CHOICES, default='moderate', blank=True)
    hashtag_style     = models.CharField(max_length=30, blank=True,
                                         help_text='e.g. "minimal", "grouped-at-end", "inline"')

    # Training pipeline state
    training_status   = models.CharField(max_length=10, choices=TRAINING_STATUS_CHOICES, default='pending')
    training_error    = models.CharField(max_length=500, blank=True)
    last_trained_at   = models.DateTimeField(null=True, blank=True)
    created_at        = models.DateTimeField(auto_now_add=True)
    updated_at        = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Brand voice — {self.client.company}"


class AIReplyTemplate(models.Model):
    """Reusable reply template (with optional AI-personalization)."""
    client            = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='ai_reply_templates')
    name              = models.CharField(max_length=200)
    trigger_keywords  = models.JSONField(default=list, blank=True, help_text='Keywords this template responds to')
    reply_text        = models.TextField()
    platforms         = models.JSONField(default=list, blank=True)
    is_ai_dynamic     = models.BooleanField(default=False, help_text='If True, AI personalizes per message')
    use_count         = models.IntegerField(default=0)
    is_active         = models.BooleanField(default=True)
    created_at        = models.DateTimeField(auto_now_add=True)
    updated_at        = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-use_count', 'name']

    def __str__(self):
        return f"{self.client.company} — {self.name}"


class AutomationRule(models.Model):
    """IF (trigger + filters) THEN action — runs on inbox/engagement events."""
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
class CompetitorSnapshot(models.Model):
    """Daily metric snapshot of a competitor on one platform."""
    competitor       = models.ForeignKey(Competitor, on_delete=models.CASCADE, related_name='snapshots')
    platform         = models.CharField(max_length=30, choices=PLATFORM_CHOICES)
    date             = models.DateField()
    followers        = models.BigIntegerField(default=0)
    posts_count      = models.IntegerField(default=0)
    engagement_rate  = models.FloatField(default=0)
    avg_likes        = models.FloatField(default=0)
    avg_comments     = models.FloatField(default=0)
    sample_top_posts = models.JSONField(default=list, blank=True, help_text='Top public posts captured for this snapshot')
    raw              = models.JSONField(default=dict, blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('competitor', 'platform', 'date')
        ordering = ['-date']
        indexes = [
            models.Index(fields=['competitor', 'platform', '-date']),
        ]

    def __str__(self):
        return f"{self.competitor.name} | {self.platform} | {self.date}"


# ══════════════════════════════════════════════════════════════════════════════

ACTION_RESULT_CHOICES = [
    ('success', 'Success'),
    ('failed',  'Failed'),
    ('partial', 'Partial'),
]


class ActionLog(models.Model):
    """
    Append-only record of every write action Social Stats performs against a
    platform on behalf of a client. Used for compliance review and the
    "what did SocialStats do for me?" page.
    """
    actor       = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                     related_name='action_logs')
    client      = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='action_logs')
    action      = models.CharField(max_length=80, db_index=True,
                                    help_text='e.g. composer.publish, inbox.reply, automation.fired')
    object_type = models.CharField(max_length=80, blank=True, help_text='e.g. UnifiedPost, Conversation')
    object_id   = models.CharField(max_length=80, blank=True)
    platform    = models.CharField(max_length=30, blank=True)
    result      = models.CharField(max_length=20, choices=ACTION_RESULT_CHOICES, default='success')
    details     = models.JSONField(default=dict, blank=True)
    error       = models.TextField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['client', '-created_at']),
            models.Index(fields=['client', 'action', '-created_at']),
            models.Index(fields=['actor', '-created_at']),
        ]

    def __str__(self):
        actor = self.actor.email if self.actor_id else 'system'
        return f'{actor} | {self.action} | {self.result} | {self.created_at:%Y-%m-%d %H:%M}'


SMART_NOTIFICATION_EVENT_CHOICES = [
    ('viral_post',        'Viral post'),
    ('engagement_drop',   'Engagement drop'),
    ('negative_cluster',  'Negative-sentiment cluster'),
    ('follower_milestone', 'Follower milestone'),
    ('best_time_window',  'Best-time-to-post window'),
    ('mention',           'Mention or tag'),
    ('token_expiring',    'Token expiring soon'),
    ('publish_failed',    'Publish failed'),
    ('post_published',    'Post published'),
    ('approval_pending',  'Post needs approval'),
    ('inbox_message',     'New inbound message'),
    ('inbox_review',      'New review'),
    # Marketplace
    ('manage_request_received', 'Agency wants to manage your account'),
    ('agency_invite_received',  'Client invited your agency'),
    ('relation_terminated',     'Agency relationship ended'),
    ('approval_requested',      'Action needs your approval'),
    ('approval_decided',        'Your approval request was decided'),
    ('new_review_received',     'New review left for your agency'),
    ('review_response',         'Agency replied to your review'),
    ('marketplace_inquiry',     'Marketplace inquiry'),
    # CTWA bot builder
    ('bot_handoff',          'Bot handed a conversation to you'),
    ('bot_lead_captured',    'New CTWA lead captured'),
    ('bot_ai_takeover',      'AI chat took over a conversation'),
    ('invitation_received',     'Invitation to manage an account'),
    ('invitation_accepted',     'Your invitation was accepted'),
    ('invitation_rejected',     'Your invitation was rejected'),
    ('invitation_cancelled',    'Invitation was cancelled'),
    ('agency_invite_accepted',  'Agency accepted your invitation'),
    ('agency_invite_declined',  'Agency declined your invitation'),
    ('manage_request_accepted', 'Your manage request was accepted'),
    ('manage_request_declined', 'Your manage request was declined'),
    ('manage_request_cancelled', 'Manage request was cancelled'),
    ('permission_changed', 'A client updated your permissions'),
    ('relation_paused',    'A client paused your access'),
    ('relation_resumed',   'A client resumed your access'),
    ('agency_disconnected',     'A client disconnected from your agency'),
    ('client_account_deleted',  'A client deleted their account'),
    ('client_joined',           'Your invited client joined Social Stats'),
]

NOTIFICATION_CHANNEL_CHOICES = [
    ('in_app',  'In-app'),
    ('email',   'Email'),
    ('whatsapp','WhatsApp'),
    ('browser', 'Browser push'),
]


class NotificationPreference(models.Model):
    """
    Per-user opt-in/out matrix. Default policy: in_app=True, others=False
    until explicitly opted in.
    """
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notification_prefs')
    event_type = models.CharField(max_length=40, choices=SMART_NOTIFICATION_EVENT_CHOICES)
    channel    = models.CharField(max_length=20, choices=NOTIFICATION_CHANNEL_CHOICES)
    enabled    = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'event_type', 'channel')
        ordering = ['user', 'event_type', 'channel']

    def __str__(self):
        return f'{self.user.email} | {self.event_type} | {self.channel} | {self.enabled}'


# ════════════════════════════════════════════════════════════════════════
# AI Infrastructure — added in the AI build-out
# ════════════════════════════════════════════════════════════════════════


class AIUsageLog(models.Model):
    """One row per AI request — used for cost analytics, audit, dedup signals."""
    STATUS_CHOICES = [
        ("success",       "Success"),
        ("error",         "Error"),
        ("rate_limited",  "Rate limited"),
        ("budget_capped", "Budget capped"),
    ]

    client          = models.ForeignKey(Client, on_delete=models.CASCADE,
                                         related_name="ai_usage_logs", null=True, blank=True)
    user            = models.ForeignKey(User,   on_delete=models.SET_NULL,
                                         related_name="ai_usage_logs", null=True, blank=True)
    feature         = models.CharField(max_length=60,
                                       help_text="caption | reply_suggest | chat | sentiment | …")
    model           = models.CharField(max_length=80)
    input_tokens    = models.IntegerField(default=0)
    output_tokens   = models.IntegerField(default=0)
    total_cost_usd  = models.DecimalField(max_digits=12, decimal_places=6, default=0)
    request_id      = models.CharField(max_length=120, blank=True, help_text="Anthropic request id")
    prompt_hash     = models.CharField(max_length=64, blank=True, help_text="For dedup analytics")
    cached          = models.BooleanField(default=False)
    request_payload = models.JSONField(default=dict, blank=True, help_text="Sanitised request preview")
    response_summary = models.TextField(blank=True, help_text="First ~200 chars of response")
    duration_ms     = models.IntegerField(default=0)
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default="success")
    error_message   = models.CharField(max_length=1000, blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["client", "-created_at"]),
            models.Index(fields=["user",   "-created_at"]),
            models.Index(fields=["feature", "-created_at"]),
            models.Index(fields=["prompt_hash"]),
        ]

    def __str__(self):
        return f"{self.feature} | {self.model} | {self.created_at:%Y-%m-%d %H:%M}"


class AIConversation(models.Model):
    """A chat thread between a user and Social Stats."""
    CONTEXT_CHOICES = [
        ("general",         "General"),
        ("client_specific", "Client-specific"),
        ("data_query",      "Data query"),
    ]

    client           = models.ForeignKey(Client, on_delete=models.CASCADE,
                                          related_name="ai_conversations", null=True, blank=True)
    user             = models.ForeignKey(User,   on_delete=models.CASCADE,
                                          related_name="ai_conversations")
    title            = models.CharField(max_length=200, blank=True,
                                         help_text="Auto-generated from first user message")
    context_type     = models.CharField(max_length=20, choices=CONTEXT_CHOICES, default="general")
    pinned_resources = models.JSONField(default=list, blank=True,
                                         help_text="References to specific posts/campaigns/data")
    archived         = models.BooleanField(default=False)
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["user", "archived", "-updated_at"]),
            models.Index(fields=["client", "-updated_at"]),
        ]

    def __str__(self):
        return f"{self.user.email} | {self.title or self.context_type}"


class AIMessage(models.Model):
    """One message inside an AIConversation."""
    ROLE_CHOICES = [
        ("user",      "User"),
        ("assistant", "Assistant"),
        ("system",    "System"),
    ]
    FEEDBACK_CHOICES = [
        ("positive", "Positive"),
        ("negative", "Negative"),
    ]

    conversation = models.ForeignKey(AIConversation, on_delete=models.CASCADE, related_name="messages")
    role         = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content      = models.TextField()
    attachments  = models.JSONField(default=list, blank=True,
                                     help_text="[{type, url, name}] image/file refs")
    tool_calls   = models.JSONField(default=list, blank=True,
                                     help_text="Anthropic tool-use blocks emitted by assistant")
    tool_results = models.JSONField(default=list, blank=True,
                                     help_text="Results returned to assistant for follow-up")
    model_used   = models.CharField(max_length=80, blank=True)
    tokens_used  = models.IntegerField(default=0)
    cost_usd     = models.DecimalField(max_digits=10, decimal_places=6, default=0)
    feedback     = models.CharField(max_length=10, choices=FEEDBACK_CHOICES, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    edited_at    = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["conversation", "created_at"]),
        ]

    def __str__(self):
        return f"{self.role} | {self.content[:50]}"


class AIScheduledRun(models.Model):
    """A recurring AI analysis (e.g. weekly report, daily competitor check)."""
    FEATURE_CHOICES = [
        ("weekly_report",    "Weekly report"),
        ("monthly_report",   "Monthly report"),
        ("competitor_check", "Competitor check"),
        ("trend_radar",      "Trend radar"),
        ("crisis_scan",      "Crisis scan"),
        ("daily_briefing",   "Daily briefing"),
        ("custom",           "Custom"),
    ]
    STATUS_CHOICES = [
        ("never_run", "Never run"),
        ("running",   "Running"),
        ("success",   "Success"),
        ("failed",    "Failed"),
    ]

    client          = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="ai_scheduled_runs")
    feature         = models.CharField(max_length=40, choices=FEATURE_CHOICES)
    schedule_rule   = models.CharField(max_length=200, blank=True,
                                        help_text="iCal RRULE or human-readable cadence")
    is_active       = models.BooleanField(default=True)
    last_run_at     = models.DateTimeField(null=True, blank=True)
    last_run_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="never_run")
    last_result     = models.JSONField(default=dict, blank=True)
    config          = models.JSONField(default=dict, blank=True, help_text="Per-feature parameters")
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        unique_together = ("client", "feature")

    def __str__(self):
        return f"{self.client.company} | {self.feature} | {self.last_run_status}"


class AITrainedAsset(models.Model):
    """RAG-style indexed asset for retrieval (post snippets, brand docs, FAQ)."""
    ASSET_TYPE_CHOICES = [
        ("post",     "Post"),
        ("article",  "Article"),
        ("document", "Document"),
        ("website",  "Website"),
        ("faq",      "FAQ"),
        ("brand",    "Brand guideline"),
    ]

    client     = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="ai_trained_assets")
    asset_type = models.CharField(max_length=20, choices=ASSET_TYPE_CHOICES)
    source_id  = models.CharField(max_length=120, blank=True,
                                   help_text="External id (post id, doc id) for de-dup")
    content    = models.TextField()
    embedding  = models.JSONField(default=list, blank=True,
                                   help_text="Vector — empty until RAG is enabled")
    metadata   = models.JSONField(default=dict, blank=True)
    indexed_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["client", "asset_type", "-updated_at"]),
            models.Index(fields=["client", "source_id"]),
        ]

    def __str__(self):
        return f"{self.client.company} | {self.asset_type} | {self.source_id or self.id}"


# ── Marketplace(two-sided platform) ──────────────────────────────
# Models live in marketplace_models.py for readability; re-exported here so
# Django picks them up under the social_stats app label.
from .marketplace_models import (  # noqa: E402,F401
    AGENCY_CLIENT_PERMISSIONS,
    Agency,
    AgencyMembership,
    AgencyClientRelation,
    ApprovalRequest,
    ActivityLog,
    AgencyReview,
    ManageRequest,
    AgencyInviteFromUser,
    Subscription,
    Invoice,
    Dispute,
)

# ── CTWA Bot Builder(bot/lead funnel) ─────────────────────────────
from .bot_models import (  # noqa: E402,F401
    NODE_TYPES,
    BotFlow,
    BotConversation,
    BotConversationStep,
    Lead,
    LeadActivity,
    BotFlowTemplate,
    CTWACampaign,
)

# ── security build-out — active session tracking ──────────────────────
from .security.sessions import UserSession  # noqa: E402,F401

# ── security build-out — MFA ──────────────────────────────────────────
from .security.mfa import UserMFA  # noqa: E402,F401

# ── security build-out — API keys ─────────────────────────────────────
from .security.api_keys import APIKey  # noqa: E402,F401

# ── security build-out — webhook replay protection ────────────────────
from .security.webhook_replay import WebhookEvent  # noqa: E402,F401

# ── security build-out — security audit log ───────────────────────────
from .security.audit import SecurityAuditLog  # noqa: E402,F401

# ── security build-out — privacy / data-subject rights ────────────────
from .security.privacy_models import (  # noqa: E402,F401
    DataExportRequest, AccountDeletionRequest, UserConsent,
)

# ── security build-out — Meta/Google platform compliance ─────────────
from .security.platform_compliance import PlatformDataDeletionRequest  # noqa: E402,F401

# ── central event bus ──────────────────────────────────
from .events.models import EventLog  # noqa: E402,F401

from .rbac_models import (  # noqa: E402,F401
    RolePreset, WorkspaceMemberPolicy, SocialAccountPermissionOverride,
)
