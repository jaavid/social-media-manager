# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
from unfold.admin import ModelAdmin, TabularInline
from django.contrib import admin
from social_stats.models import (
    SiteContent, LookupCollection, LookupItem,
)


from .shared import WorkspaceLabelsMixin

@admin.register(SiteContent)
class SiteContentAdmin(WorkspaceLabelsMixin, ModelAdmin):
    list_display = ['key', 'title', 'is_public', 'last_updated', 'updated_at']
    list_filter = ['is_public']
    search_fields = ['key', 'title']


class LookupItemInline(WorkspaceLabelsMixin, TabularInline):
    model = LookupItem
    extra = 0


@admin.register(LookupCollection)
class LookupCollectionAdmin(WorkspaceLabelsMixin, ModelAdmin):
    list_display = ['key', 'title', 'is_public', 'updated_at']
    search_fields = ['key', 'title']
    list_filter = ['is_public']
    inlines = [LookupItemInline]

