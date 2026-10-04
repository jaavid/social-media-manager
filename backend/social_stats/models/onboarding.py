# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""Onboarding models."""
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

from social_stats.models.workspaces import Client

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
