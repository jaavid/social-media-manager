# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""Brand voice models."""
from django.db import models

from social_stats.models.workspaces import Client

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


