# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
from django import forms
from unfold.admin import ModelAdmin
from django.contrib import admin
from social_stats.models import (
    SocialAccount, PlatformCredential,
)
from social_stats.platforms.registry import PLATFORMS_BY_KEY, PLATFORM_REGISTRY, grouped_platform_choices


from .shared import WorkspaceLabelsMixin

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


@admin.register(SocialAccount)
class SocialAccountAdmin(WorkspaceLabelsMixin, ModelAdmin):
    list_display = ['display_name', 'workspace_column', 'platform', 'external_id', 'is_active', 'updated_at']
    list_filter = [PlatformCategoryFilter, 'platform', 'is_active']
    search_fields = ['display_name', 'username', 'external_id', 'client__company']
    readonly_fields = ['created_at', 'updated_at']



@admin.register(PlatformCredential)
class CredentialAdmin(WorkspaceLabelsMixin, ModelAdmin):
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

