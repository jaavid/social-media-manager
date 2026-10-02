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
from .models import (
    Client, UserProfile, SocialAccount, PlatformCredential, DailyMetric, PostMetric, SyncLog,
    ROISettings, ROIReport,
    CalendarPost, CalendarNote, PostingSchedule, SiteContent, LookupCollection, LookupItem,
)
from .platforms.registry import PLATFORMS_BY_KEY, PLATFORM_REGISTRY, grouped_platform_choices


class WorkspaceLabelsMixin:
    """Use product vocabulary for workspace relations without renaming DB fields."""
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
