# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
from unfold.admin import ModelAdmin
from django.contrib import admin
from social_stats.models import (
    Conversation, Message, UnifiedReview,
)


from .shared import WorkspaceLabelsMixin, OperationalReadOnlyAdmin

@admin.register(Conversation)
class ConversationAdmin(WorkspaceLabelsMixin, ModelAdmin):
    list_display = ['contact_name', 'workspace_column', 'platform', 'type', 'assigned_to', 'is_resolved', 'last_message_at']
    list_filter = ['platform', 'type', 'is_resolved', 'is_archived', 'is_starred']
    search_fields = ['client__company', 'contact_name', 'contact_handle', 'last_message_preview']
    list_select_related = ['client', 'assigned_to']
    raw_id_fields = ['assigned_to']
    # Provider identities and message counters are maintained by sync services.
    readonly_fields = [
        field.name for field in Conversation._meta.fields
        if field.name not in {'assigned_to', 'is_starred', 'is_archived', 'is_resolved', 'tags'}
    ]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Message)
class MessageAdmin(OperationalReadOnlyAdmin):
    list_display = ['conversation', 'direction', 'author_name', 'sent_at', 'read_at']
    list_filter = ['direction', 'sentiment']
    search_fields = ['conversation__client__company', 'author_name', 'content', 'platform_message_id']
    list_select_related = ['conversation__client']


@admin.register(UnifiedReview)
class UnifiedReviewAdmin(OperationalReadOnlyAdmin):
    list_display = ['reviewer_name', 'workspace_column', 'platform', 'rating', 'status', 'replied_at']
    list_filter = ['platform', 'rating', 'status', 'sentiment']
    search_fields = ['client__company', 'reviewer_name', 'comment', 'reply_text']
    list_select_related = ['client']

