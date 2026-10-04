# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""Whatsapp models."""
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta

from social_stats.models.workspaces import Client

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
