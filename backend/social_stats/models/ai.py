# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""Ai models."""
from django.db import models
from django.contrib.auth.models import User

from social_stats.models.workspaces import Client

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

