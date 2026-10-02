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
)
from .platforms.registry import PLATFORMS_BY_KEY, PLATFORM_REGISTRY, grouped_platform_choices


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
            fieldsets.append(('Other settings', {'fields': remaining}))
        return fieldsets

    @admin.display(description='Workspace', ordering='client__company')
    def workspace_column(self, obj):
        return obj.client

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.remote_field.model is Client:
            kwargs.setdefault('label', 'Workspace')
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
        ('Workspace and contact', ['company', 'name', 'email', 'phone', 'whatsapp_number', 'website', 'logo', 'is_active'], False),
        ('Brand profile', ['business_category', 'business_subcategories', 'brand_description', 'usp', 'brand_tone', 'profile_image'], False),
        ('Audience', ['target_audience', 'gender', 'business_location', 'target_locations'], True),
        ('Publishing and access', ['timezone', 'requires_approval', 'onboarding_complete', 'whatsapp_enabled', 'features_enabled', 'owner_user', 'ownership_type', 'created_via'], False),
        ('Assets and history', ['gmb_url', 'brand_assets', 'product_images', 'created_at'], True),
    ]

@admin.register(UserProfile)
class UserProfileAdmin(WorkspaceLabelsMixin, admin.ModelAdmin):
    list_display = ['user', 'role', 'workspace_column']
    list_filter = ['role']

@admin.register(PlatformCredential)
class CredentialAdmin(WorkspaceLabelsMixin, admin.ModelAdmin):
    form = PlatformCredentialAdminForm
    list_display = ['workspace_column', 'platform_title', 'platform_category', 'status', 'connected_at', 'expires_at']
    list_filter = [PlatformCategoryFilter, 'platform', 'is_active']
    readonly_fields = ['connected_at', 'updated_at']
    search_fields = ['client__company', 'page_name', 'channel_name', 'organization_name']
    list_select_related = ['client', 'social_account']
    autocomplete_fields = ['client', 'social_account']
    field_groups = [
        ('Connection', ['client', 'platform', 'social_account', 'auth_method', 'is_active'], False),
        ('OAuth credentials', ['access_token', 'refresh_token', 'token_type', 'expires_at', 'scope'], True),
        ('Provider identity', ['platform_user_id', 'page_id', 'page_name', 'instagram_account_id', 'channel_id', 'channel_name', 'organization_id', 'organization_name', 'gmb_account_id', 'gmb_location_id'], True),
        ('History', ['connected_at', 'updated_at'], True),
    ]

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
    total_budget_display.short_description = 'Total Budget'


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


class LookupItemInline(admin.TabularInline):
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
class RolePresetAdmin(admin.ModelAdmin):
    list_display = ('key', 'label')
    search_fields = ('key', 'label')
