# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""Workspaces models."""
import uuid
from django.db import models
from django.db import transaction, router
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta


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
    organization = models.ForeignKey(
        'social_stats.Organization', verbose_name='سازمان', on_delete=models.PROTECT,
        related_name='workspaces', editable=False,
    )
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

    def save(self, *args, **kwargs):
        # Every creation path (signup, imports, admin and legacy helpers) must
        # establish a tenant. Never group rows by email, agency or staff access.
        using = kwargs.get('using') or router.db_for_write(type(self), instance=self)
        with transaction.atomic(using=using):
            original = None
            if self.pk is not None:
                original = type(self).objects.using(using).filter(pk=self.pk).values_list(
                    'organization_id', flat=True,
                ).first()
            if original is not None and original != self.organization_id:
                from django.core.exceptions import ValidationError

                raise ValidationError('Workspace tenant cannot be changed in place')
            if original is None and not self.organization_id:
                from .organizations import Organization

                self.organization = Organization.objects.using(using).create(
                    name=self.company, owner_user_id=self.owner_user_id,
                )
            super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.company} ({self.name})"

    class Meta:
        ordering = ['company']
        verbose_name = 'فضای کاری'
        verbose_name_plural = 'فضاهای کاری'


# ── Competitors ───────────────────────────────────────────────────────────────


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
        from social_stats.authorization import accessible_workspaces
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
            owner_user=user,
            ownership_type='end_user_owned',
            created_via='end_user_signup',
        )
        profile.client = client
        profile.save(update_fields=['client'])
        return client


# ── OAuth Credentials per client per platform ─────────────────────────────────
