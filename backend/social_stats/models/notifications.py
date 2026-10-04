# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""Notifications models."""
import uuid
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta

from social_stats.models.workspaces import Client

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

