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
    DailyMetric, SyncLog,
    ROISettings, ROIReport,
)


from .shared import WorkspaceLabelsMixin

@admin.register(DailyMetric)
class DailyMetricAdmin(WorkspaceLabelsMixin, ModelAdmin):
    list_display = ['workspace_column', 'platform', 'date', 'impressions', 'reach', 'clicks']
    list_filter = ['platform']
    date_hierarchy = 'date'


@admin.register(SyncLog)
class SyncLogAdmin(WorkspaceLabelsMixin, ModelAdmin):
    list_display = ['workspace_column', 'platform', 'status', 'records_synced', 'started_at']
    list_filter = ['platform', 'status']


@admin.register(ROISettings)
class ROISettingsAdmin(WorkspaceLabelsMixin, ModelAdmin):
    list_display  = ['workspace_column', 'total_budget_display', 'avg_sale_value', 'conversion_rate', 'updated_at']
    search_fields = ['client__company']

    def total_budget_display(self, obj):
        return f"{obj.currency_symbol}{obj.total_budget:,.2f}"
    total_budget_display.short_description = 'بودجه کل'


@admin.register(ROIReport)
class ROIReportAdmin(WorkspaceLabelsMixin, ModelAdmin):
    list_display   = ['workspace_column', 'month', 'year', 'total_investment', 'estimated_revenue', 'roi_percentage', 'generated_at']
    list_filter    = ['year', 'month']
    date_hierarchy = 'generated_at'
    search_fields  = ['client__company']

