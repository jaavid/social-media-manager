# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""Competitors models."""
from django.db import models
from social_stats.platforms.registry import PLATFORM_CHOICES

from .workspaces import Client

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




