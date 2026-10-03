# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
from django import forms
from django.contrib import admin
from django.db import models
from .rbac_models import RolePreset
from .models import (
    Client, UserProfile, SocialAccount, PlatformCredential, DailyMetric, SyncLog,
    ROISettings, ROIReport,
    CalendarPost, CalendarNote, PostingSchedule, SiteContent, LookupCollection, LookupItem,
    MediaAsset, UnifiedPost, PlatformPublishLog, PostQueue, QueuedItem,
    Conversation, Message, UnifiedReview, AutomationRule,
)
from .platforms.registry import PLATFORMS_BY_KEY, PLATFORM_REGISTRY, grouped_platform_choices

admin.site.site_header = 'مدیریت سامانه شبکه‌های اجتماعی'
admin.site.site_title = 'مدیریت بک‌اند'
admin.site.index_title = 'مدیریت اطلاعات و تنظیمات'


class WorkspaceLabelsMixin:
    """Use product vocabulary for workspace relations without renaming DB fields."""
    formfield_overrides = {
        models.TextField: {'widget': forms.Textarea(attrs={'rows': 4, 'class': 'vLargeTextField admin-textarea'})},
        models.JSONField: {'widget': forms.Textarea(attrs={'rows': 6, 'class': 'vLargeTextField admin-json', 'spellcheck': 'false'})},
    }

    class Media:
        css = {'all': ('social_stats/admin/forms.css',)}

    def get_fieldsets(self, request, obj=None):
        groups = getattr(self, 'field_groups', None)
        if not groups:
            return super().get_fieldsets(request, obj)
        remaining = list(self.get_fields(request, obj))
        fieldsets = []
        for title, fields, collapse in groups:
            selected = [field for field in fields if field in remaining]
            if not selected:
                continue
            remaining = [field for field in remaining if field not in selected]
            options = {'fields': selected}
            if collapse:
                options['classes'] = ['collapse']
            fieldsets.append((title, options))
        if remaining:
            fieldsets.append(('سایر تنظیمات', {'fields': remaining}))
        return fieldsets

    @admin.display(description='فضای کاری', ordering='client__company')
    def workspace_column(self, obj):
        return obj.client

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.remote_field.model is Client:
            kwargs.setdefault('label', 'فضای کاری')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


class PlatformCredentialAdminForm(forms.ModelForm):
    class Meta:
        model = PlatformCredential
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['platform'].choices = grouped_platform_choices()


class PlatformCategoryFilter(admin.SimpleListFilter):
    title = 'دسته پلتفرم'
    parameter_name = 'platform_category'

    def lookups(self, request, model_admin):
        categories = {}
        for platform in PLATFORM_REGISTRY:
            categories.setdefault(platform.category, platform.category_title_fa)
        return categories.items()

    def queryset(self, request, queryset):
        if not self.value():
            return queryset
        keys = [p.key for p in PLATFORM_REGISTRY if p.category == self.value()]
        return queryset.filter(platform__in=keys)

@admin.register(Client)
class ClientAdmin(WorkspaceLabelsMixin, admin.ModelAdmin):
    list_display = ['company', 'name', 'email', 'is_active', 'created_at']
    search_fields = ['company', 'name', 'email']
    list_filter = ['is_active', 'onboarding_complete', 'requires_approval']
    readonly_fields = ['created_at']
    field_groups = [
        ('فضای کاری و اطلاعات تماس', ['company', 'name', 'email', 'phone', 'whatsapp_number', 'website', 'logo', 'is_active'], False),
        ('پروفایل برند', ['business_category', 'business_subcategories', 'brand_description', 'usp', 'brand_tone', 'profile_image'], False),
        ('مخاطبان هدف', ['target_audience', 'gender', 'business_location', 'target_locations'], True),
        ('انتشار و دسترسی', ['timezone', 'requires_approval', 'onboarding_complete', 'whatsapp_enabled', 'features_enabled', 'owner_user', 'ownership_type', 'created_via'], False),
        ('اشتراک و بازار خدمات', ['subscription_plan', 'display_name', 'industry', 'location_city', 'location_country', 'is_discoverable_in_marketplace'], True),
        ('ربات و کنترل پردازش', ['bot_enabled', 'bot_max_msgs_per_minute', 'bot_max_msgs_per_conv', 'bot_spam_threshold', 'meta_pixel_id', 'meta_capi_test_code', 'is_processing_paused'], True),
        ('دارایی‌ها و سوابق', ['gmb_url', 'brand_assets', 'product_images', 'created_at'], True),
    ]

@admin.register(UserProfile)
class UserProfileAdmin(WorkspaceLabelsMixin, admin.ModelAdmin):
    list_display = ['user', 'role', 'workspace_column']
    list_filter = ['role', 'email_verified', 'account_type']
    search_fields = ['user__username', 'user__email', 'client__company']
    autocomplete_fields = ['client', 'assigned_clients', 'default_workspace']
    raw_id_fields = ['user', 'agency', 'primary_agency']
    readonly_fields = ['created_at']

@admin.register(PlatformCredential)
class CredentialAdmin(WorkspaceLabelsMixin, admin.ModelAdmin):
    form = PlatformCredentialAdminForm
    list_display = ['workspace_column', 'platform_title', 'platform_category', 'connection_status', 'connected_at', 'expires_at']
    list_filter = [PlatformCategoryFilter, 'platform', 'is_active']
    readonly_fields = ['connected_at', 'updated_at']
    search_fields = ['client__company', 'page_name', 'channel_name', 'organization_name']
    list_select_related = ['client', 'social_account']
    autocomplete_fields = ['client', 'social_account']
    field_groups = [
        ('اتصال', ['client', 'platform', 'social_account', 'auth_method', 'is_active'], False),
        ('اطلاعات احراز هویت OAuth', ['access_token', 'refresh_token', 'token_type', 'expires_at', 'scope'], True),
        ('شناسه‌های پلتفرم', ['platform_user_id', 'page_id', 'page_name', 'instagram_account_id', 'channel_id', 'channel_name', 'organization_id', 'organization_name', 'gmb_account_id', 'gmb_location_id'], True),
        ('سوابق', ['connected_at', 'updated_at'], True),
    ]

    @admin.display(description='وضعیت اتصال')
    def connection_status(self, obj):
        return {
            'not_connected': 'متصل نشده',
            'expired': 'منقضی شده',
            'active': 'فعال',
        }.get(obj.status, obj.status)

    @admin.display(description='پلتفرم', ordering='platform')
    def platform_title(self, obj):
        platform = PLATFORMS_BY_KEY.get(obj.platform)
        return platform.title_fa if platform else obj.platform

    @admin.display(description='دسته')
    def platform_category(self, obj):
        platform = PLATFORMS_BY_KEY.get(obj.platform)
        return platform.category_title_fa if platform else '—'


@admin.register(SocialAccount)
class SocialAccountAdmin(WorkspaceLabelsMixin, admin.ModelAdmin):
    list_display = ['display_name', 'workspace_column', 'platform', 'external_id', 'is_active', 'updated_at']
    list_filter = [PlatformCategoryFilter, 'platform', 'is_active']
    search_fields = ['display_name', 'username', 'external_id', 'client__company']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(DailyMetric)
class DailyMetricAdmin(WorkspaceLabelsMixin, admin.ModelAdmin):
    list_display = ['workspace_column', 'platform', 'date', 'impressions', 'reach', 'clicks']
    list_filter = ['platform']
    date_hierarchy = 'date'

@admin.register(SyncLog)
class SyncLogAdmin(WorkspaceLabelsMixin, admin.ModelAdmin):
    list_display = ['workspace_column', 'platform', 'status', 'records_synced', 'started_at']
    list_filter = ['platform', 'status']


@admin.register(ROISettings)
class ROISettingsAdmin(WorkspaceLabelsMixin, admin.ModelAdmin):
    list_display  = ['workspace_column', 'total_budget_display', 'avg_sale_value', 'conversion_rate', 'updated_at']
    search_fields = ['client__company']

    def total_budget_display(self, obj):
        return f"{obj.currency_symbol}{obj.total_budget:,.2f}"
    total_budget_display.short_description = 'بودجه کل'


@admin.register(ROIReport)
class ROIReportAdmin(WorkspaceLabelsMixin, admin.ModelAdmin):
    list_display   = ['workspace_column', 'month', 'year', 'total_investment', 'estimated_revenue', 'roi_percentage', 'generated_at']
    list_filter    = ['year', 'month']
    date_hierarchy = 'generated_at'
    search_fields  = ['client__company']


@admin.register(CalendarPost)
class CalendarPostAdmin(WorkspaceLabelsMixin, admin.ModelAdmin):
    list_display    = ['workspace_column', 'platform', 'status', 'post_type', 'title', 'scheduled_at', 'published_at', 'impressions', 'likes']
    list_filter     = ['platform', 'status', 'post_type']
    search_fields   = ['client__company', 'title', 'caption']
    date_hierarchy  = 'published_at'
    readonly_fields = ['impressions', 'reach', 'likes', 'comments', 'shares', 'saves', 'video_views', 'engagement_rate', 'created_at', 'updated_at']
    raw_id_fields   = ['client', 'post_metric', 'created_by']


@admin.register(CalendarNote)
class CalendarNoteAdmin(WorkspaceLabelsMixin, admin.ModelAdmin):
    list_display  = ['workspace_column', 'date', 'title', 'is_client_visible', 'created_at']
    list_filter   = ['is_client_visible']
    search_fields = ['client__company', 'title', 'note']
    raw_id_fields = ['client', 'created_by']


@admin.register(PostingSchedule)
class PostingScheduleAdmin(WorkspaceLabelsMixin, admin.ModelAdmin):
    list_display  = ['workspace_column', 'platform', 'day_of_week', 'hour', 'minute', 'is_active']
    list_filter   = ['platform', 'is_active']
    search_fields = ['client__company']
    raw_id_fields = ['client']


@admin.register(SiteContent)
class SiteContentAdmin(WorkspaceLabelsMixin, admin.ModelAdmin):
    list_display = ['key', 'title', 'is_public', 'last_updated', 'updated_at']
    list_filter = ['is_public']
    search_fields = ['key', 'title']


class LookupItemInline(WorkspaceLabelsMixin, admin.TabularInline):
    model = LookupItem
    extra = 0


@admin.register(LookupCollection)
class LookupCollectionAdmin(WorkspaceLabelsMixin, admin.ModelAdmin):
    list_display = ['key', 'title', 'is_public', 'updated_at']
    search_fields = ['key', 'title']
    list_filter = ['is_public']
    inlines = [LookupItemInline]

# Data-driven role defaults; existing organization memberships can opt in.


@admin.register(RolePreset)
class RolePresetAdmin(WorkspaceLabelsMixin, admin.ModelAdmin):
    list_display = ('key', 'label')
    search_fields = ('key', 'label')


class OperationalReadOnlyAdmin(WorkspaceLabelsMixin, admin.ModelAdmin):
    """Inspect service-owned records; transitions belong to the frontend workflows."""
    actions = None

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(MediaAsset)
class MediaAssetAdmin(WorkspaceLabelsMixin, admin.ModelAdmin):
    list_display = ['file', 'workspace_column', 'mime_type', 'folder', 'is_used', 'created_at']
    list_filter = ['mime_type', 'is_used']
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
class PostQueueAdmin(WorkspaceLabelsMixin, admin.ModelAdmin):
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


@admin.register(Conversation)
class ConversationAdmin(WorkspaceLabelsMixin, admin.ModelAdmin):
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


@admin.register(AutomationRule)
class AutomationRuleAdmin(WorkspaceLabelsMixin, admin.ModelAdmin):
    list_display = ['name', 'workspace_column', 'trigger_type', 'action_type', 'is_active', 'run_count', 'last_run_at']
    list_filter = ['is_active', 'trigger_type', 'action_type']
    search_fields = ['client__company', 'name']
    autocomplete_fields = ['client']
    raw_id_fields = ['created_by']
    readonly_fields = ['run_count', 'last_run_at', 'created_at', 'updated_at']
