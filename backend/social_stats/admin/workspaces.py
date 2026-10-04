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
from social_stats.models.rbac import RolePreset
from social_stats.models import (
    Client, UserProfile,
)


from .shared import WorkspaceLabelsMixin

@admin.register(Client)
class ClientAdmin(WorkspaceLabelsMixin, ModelAdmin):
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
class UserProfileAdmin(WorkspaceLabelsMixin, ModelAdmin):
    list_display = ['user', 'role', 'workspace_column']
    list_filter = ['role', 'email_verified', 'account_type']
    search_fields = ['user__username', 'user__email', 'client__company']
    autocomplete_fields = ['client', 'assigned_clients', 'default_workspace']
    raw_id_fields = ['user', 'agency', 'primary_agency']
    readonly_fields = ['created_at']


@admin.register(RolePreset)
class RolePresetAdmin(WorkspaceLabelsMixin, ModelAdmin):
    list_display = ('key', 'label')
    search_fields = ('key', 'label')

