# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""Canonical model exports; app label and database tables remain social_stats."""
from social_stats.models.workspaces import (
    ROLE_CHOICES, SYNC_STATUS, Client, UserProfile, EmailVerificationToken, PasswordResetToken, ensure_client_profile,
)
from social_stats.models.accounts import (
    SocialAccount, PlatformCredential, ManualCredentialExtras,
)
from social_stats.models.analytics import (
    DailyMetric, PostMetric, GMBBusinessInfo, GMBReview, GOAL_METRIC_CHOICES, GOAL_PLATFORM_CHOICES, ClientGoal, ALERT_TYPE_CHOICES, Alert, AIInsight, WeeklyTopPost, SharedReport,
)
from social_stats.models.onboarding import (
    ONBOARDING_STEP_CHOICES, ONBOARDING_STEP_DESCRIPTIONS, OnboardingStep,
)
from social_stats.models.roi import (
    ROISettings, ROIReport,
)
from social_stats.models.sync import (
    SyncLog,
)
from social_stats.models.calendar import (
    POST_TYPE_CHOICES, CALENDAR_STATUS_CHOICES, CalendarPost, CalendarNote, PostingSchedule,
)
from social_stats.models.permissions import (
    PERMISSION_CATEGORY_CHOICES, ALL_PERMISSIONS, PERMISSION_PAGE_GROUPS, Permission, RolePermission, UserPermission, StaffClientAssignment, ClientPageConfig,
)
from social_stats.models.content import (
    CaptionRequest, BUSINESS_TYPE_CHOICES, PostIdeaSet, PostIdea, HashtagSet, SiteContent, LookupCollection, LookupItem,
)
from social_stats.models.notifications import (
    INVITATION_STATUS_CHOICES, ClientInvitation, NOTIF_TYPE_CHOICES, Notification,
)
from social_stats.models.whatsapp import (
    WA_QUALITY_CHOICES, WA_TIER_CHOICES, WA_OPT_IN_CHOICES, WA_TEMPLATE_CATEGORY_CHOICES, WA_TEMPLATE_TYPE_CHOICES, WA_TEMPLATE_STATUS_CHOICES, WA_CAMPAIGN_STATUS_CHOICES, WA_MESSAGE_STATUS_CHOICES, WA_DIRECTION_CHOICES, WhatsAppAccount, WhatsAppContact, WhatsAppContactList, WhatsAppTemplate, WhatsAppCampaign, WhatsAppMessage, WhatsAppWebhookLog,
)
from social_stats.models.publishing import (
    UNIFIED_POST_STATUS_CHOICES, UNIFIED_MEDIA_TYPE_CHOICES, PUBLISH_LOG_STATUS_CHOICES, QUEUE_STRATEGY_CHOICES, QUEUED_ITEM_STATUS_CHOICES, MediaAsset, UnifiedPost, PlatformPublishLog, PostEngagement, PostQueue, QueuedItem,
)
from social_stats.models.inbox import (
    CONVERSATION_TYPE_CHOICES, MESSAGE_DIRECTION_CHOICES, SENTIMENT_CHOICES, REVIEW_STATUS_CHOICES, Conversation, Message, UnifiedReview,
)
from social_stats.models.brand_voice import (
    BrandVoiceProfile, AIReplyTemplate,
)
from social_stats.models.automation import (
    AUTOMATION_TRIGGER_CHOICES, AUTOMATION_ACTION_CHOICES, AutomationRule,
)
from social_stats.models.competitors import (
    Competitor, CompetitorSnapshot,
)
from social_stats.models.activity import (
    ACTION_RESULT_CHOICES, ActionLog,
)
from social_stats.models.notification_preferences import (
    SMART_NOTIFICATION_EVENT_CHOICES, NOTIFICATION_CHANNEL_CHOICES, NotificationPreference,
)
from social_stats.models.ai import (
    AIUsageLog, AIConversation, AIMessage, AIScheduledRun, AITrainedAsset,
)
from social_stats.models.telegram import (
    TelegramIntegration, TelegramUpdate, TelegramSuggestion, TelegramCallback, TelegramAssistantLink, TelegramAssistantRun,
)
from social_stats.models.marketplace import (  # noqa: E402,F401
    AGENCY_CLIENT_PERMISSIONS,
    Agency,
    AgencyMembership,
    AgencyClientRelation,
    ApprovalRequest,
    ActivityLog,
    AgencyReview,
    ManageRequest,
    AgencyInviteFromUser,
    Subscription,
    Invoice,
    Dispute,
)

# ── CTWA Bot Builder(bot/lead funnel) ─────────────────────────────
from social_stats.models.bot import (  # noqa: E402,F401
    NODE_TYPES,
    BotFlow,
    BotConversation,
    BotConversationStep,
    Lead,
    LeadActivity,
    BotFlowTemplate,
    CTWACampaign,
)

# ── security build-out — active session tracking ──────────────────────
from social_stats.security.sessions import UserSession  # noqa: E402,F401

# ── security build-out — MFA ──────────────────────────────────────────
from social_stats.security.mfa import UserMFA  # noqa: E402,F401

# ── security build-out — API keys ─────────────────────────────────────
from social_stats.security.api_keys import APIKey  # noqa: E402,F401

# ── security build-out — webhook replay protection ────────────────────
from social_stats.security.webhook_replay import WebhookEvent  # noqa: E402,F401

# ── security build-out — security audit log ───────────────────────────
from social_stats.security.audit import SecurityAuditLog  # noqa: E402,F401

# ── security build-out — privacy / data-subject rights ────────────────
from social_stats.security.privacy_models import (  # noqa: E402,F401
    DataExportRequest, AccountDeletionRequest, UserConsent,
)

# ── security build-out — Meta/Google platform compliance ─────────────
from social_stats.security.platform_compliance import PlatformDataDeletionRequest  # noqa: E402,F401

# ── central event bus ──────────────────────────────────
from social_stats.events.models import EventLog  # noqa: E402,F401

from social_stats.models.rbac import (  # noqa: E402,F401
    RolePreset, WorkspaceMemberPolicy, SocialAccountPermissionOverride,
)

from social_stats.platforms.registry import PLATFORM_CHOICES  # noqa: F401


from .ads import AdsWaitlist

__all__ = [
    'ROLE_CHOICES',
    'SYNC_STATUS',
    'Client',
    'UserProfile',
    'EmailVerificationToken',
    'PasswordResetToken',
    'ensure_client_profile',
    'SocialAccount',
    'PlatformCredential',
    'ManualCredentialExtras',
    'DailyMetric',
    'PostMetric',
    'GMBBusinessInfo',
    'GMBReview',
    'GOAL_METRIC_CHOICES',
    'GOAL_PLATFORM_CHOICES',
    'ClientGoal',
    'ALERT_TYPE_CHOICES',
    'Alert',
    'AIInsight',
    'WeeklyTopPost',
    'SharedReport',
    'ONBOARDING_STEP_CHOICES',
    'ONBOARDING_STEP_DESCRIPTIONS',
    'OnboardingStep',
    'ROISettings',
    'ROIReport',
    'SyncLog',
    'POST_TYPE_CHOICES',
    'CALENDAR_STATUS_CHOICES',
    'CalendarPost',
    'CalendarNote',
    'PostingSchedule',
    'PERMISSION_CATEGORY_CHOICES',
    'ALL_PERMISSIONS',
    'PERMISSION_PAGE_GROUPS',
    'Permission',
    'RolePermission',
    'UserPermission',
    'StaffClientAssignment',
    'ClientPageConfig',
    'CaptionRequest',
    'BUSINESS_TYPE_CHOICES',
    'PostIdeaSet',
    'PostIdea',
    'HashtagSet',
    'SiteContent',
    'LookupCollection',
    'LookupItem',
    'INVITATION_STATUS_CHOICES',
    'ClientInvitation',
    'NOTIF_TYPE_CHOICES',
    'Notification',
    'WA_QUALITY_CHOICES',
    'WA_TIER_CHOICES',
    'WA_OPT_IN_CHOICES',
    'WA_TEMPLATE_CATEGORY_CHOICES',
    'WA_TEMPLATE_TYPE_CHOICES',
    'WA_TEMPLATE_STATUS_CHOICES',
    'WA_CAMPAIGN_STATUS_CHOICES',
    'WA_MESSAGE_STATUS_CHOICES',
    'WA_DIRECTION_CHOICES',
    'WhatsAppAccount',
    'WhatsAppContact',
    'WhatsAppContactList',
    'WhatsAppTemplate',
    'WhatsAppCampaign',
    'WhatsAppMessage',
    'WhatsAppWebhookLog',
    'UNIFIED_POST_STATUS_CHOICES',
    'UNIFIED_MEDIA_TYPE_CHOICES',
    'PUBLISH_LOG_STATUS_CHOICES',
    'QUEUE_STRATEGY_CHOICES',
    'QUEUED_ITEM_STATUS_CHOICES',
    'MediaAsset',
    'UnifiedPost',
    'PlatformPublishLog',
    'PostEngagement',
    'PostQueue',
    'QueuedItem',
    'CONVERSATION_TYPE_CHOICES',
    'MESSAGE_DIRECTION_CHOICES',
    'SENTIMENT_CHOICES',
    'REVIEW_STATUS_CHOICES',
    'Conversation',
    'Message',
    'UnifiedReview',
    'BrandVoiceProfile',
    'AIReplyTemplate',
    'AUTOMATION_TRIGGER_CHOICES',
    'AUTOMATION_ACTION_CHOICES',
    'AutomationRule',
    'CompetitorSnapshot',
    'ACTION_RESULT_CHOICES',
    'ActionLog',
    'SMART_NOTIFICATION_EVENT_CHOICES',
    'NOTIFICATION_CHANNEL_CHOICES',
    'NotificationPreference',
    'AIUsageLog',
    'AIConversation',
    'AIMessage',
    'AIScheduledRun',
    'AITrainedAsset',
    'TelegramIntegration',
    'TelegramUpdate',
    'TelegramSuggestion',
    'TelegramCallback',
    'TelegramAssistantLink',
    'TelegramAssistantRun',
    'AGENCY_CLIENT_PERMISSIONS',
    'Agency',
    'AgencyMembership',
    'AgencyClientRelation',
    'ApprovalRequest',
    'ActivityLog',
    'AgencyReview',
    'ManageRequest',
    'AgencyInviteFromUser',
    'Subscription',
    'Invoice',
    'Dispute',
    'NODE_TYPES',
    'BotFlow',
    'BotConversation',
    'BotConversationStep',
    'Lead',
    'LeadActivity',
    'BotFlowTemplate',
    'CTWACampaign',
    'UserSession',
    'UserMFA',
    'APIKey',
    'WebhookEvent',
    'SecurityAuditLog',
    'DataExportRequest',
    'AccountDeletionRequest',
    'UserConsent',
    'PlatformDataDeletionRequest',
    'EventLog',
    'RolePreset',
    'WorkspaceMemberPolicy',
    'SocialAccountPermissionOverride',
    'PLATFORM_CHOICES',
    'Competitor',
    'AdsWaitlist',
]
