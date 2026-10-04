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
    AutomationRule,
)


from .shared import WorkspaceLabelsMixin

@admin.register(AutomationRule)
class AutomationRuleAdmin(WorkspaceLabelsMixin, ModelAdmin):
    list_display = ['name', 'workspace_column', 'trigger_type', 'action_type', 'is_active', 'run_count', 'last_run_at']
    list_filter = ['is_active', 'trigger_type', 'action_type']
    search_fields = ['client__company', 'name']
    autocomplete_fields = ['client']
    raw_id_fields = ['created_by']
    readonly_fields = ['run_count', 'last_run_at', 'created_at', 'updated_at']

