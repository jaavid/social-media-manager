# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""Notification preferences models."""
from django.db import models
from django.contrib.auth.models import User


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


