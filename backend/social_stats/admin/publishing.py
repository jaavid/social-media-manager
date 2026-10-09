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
    MediaAsset, UnifiedPost, PlatformPublishLog, PostQueue, QueuedItem,
)


from .shared import WorkspaceLabelsMixin, OperationalReadOnlyAdmin

@admin.register(MediaAsset)
class MediaAssetAdmin(OperationalReadOnlyAdmin):
    list_display = ['file', 'workspace_column', 'social_account', 'mime_type', 'file_size', 'folder', 'is_used', 'created_at']
    list_filter = ['client__organization', 'client', 'social_account__platform', 'social_account', 'mime_type', 'is_used']
    list_select_related = ['client__organization', 'social_account']
    search_fields = ['client__company', 'file', 'alt_text', 'folder']
    autocomplete_fields = ['client']
    raw_id_fields = ['uploaded_by']
    readonly_fields = ['created_at']


@admin.register(UnifiedPost)
class UnifiedPostAdmin(OperationalReadOnlyAdmin):
    list_display = ['title', 'workspace_column', 'status', 'media_type', 'scheduled_at', 'published_at']
    list_filter = ['status', 'media_type']
    search_fields = ['client__company', 'title', 'content']
    list_select_related = ['client']
    date_hierarchy = 'created_at'


@admin.register(PlatformPublishLog)
class PlatformPublishLogAdmin(OperationalReadOnlyAdmin):
    list_display = ['unified_post', 'platform', 'social_account', 'status', 'attempted_at', 'completed_at']
    list_filter = ['platform', 'status']
    search_fields = ['unified_post__client__company', 'unified_post__title', 'platform_post_id', 'error_message']
    list_select_related = ['unified_post__client', 'social_account']
    date_hierarchy = 'attempted_at'


@admin.register(PostQueue)
class PostQueueAdmin(WorkspaceLabelsMixin, ModelAdmin):
    list_display = ['name', 'workspace_column', 'queue_strategy', 'is_active', 'last_dispatched_at']
    list_filter = ['is_active', 'queue_strategy']
    search_fields = ['client__company', 'name']
    autocomplete_fields = ['client']
    readonly_fields = ['last_dispatched_at', 'created_at', 'updated_at']


@admin.register(QueuedItem)
class QueuedItemAdmin(OperationalReadOnlyAdmin):
    list_display = ['queue', 'sort_order', 'status', 'unified_post', 'used_at']
    list_filter = ['status']
    search_fields = ['queue__client__company', 'queue__name', 'content']
    list_select_related = ['queue__client', 'unified_post__client']

