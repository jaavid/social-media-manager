# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""Activity models."""
from django.db import models
from django.contrib.auth.models import User

from social_stats.models.workspaces import Client

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


