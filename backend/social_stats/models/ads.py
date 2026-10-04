# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""Advertising models."""
from django.db import models
from django.contrib.auth.models import User


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

