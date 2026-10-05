# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
from unfold.admin import ModelAdmin
from unfold.widgets import UnfoldAdminTextareaWidget
from django.contrib import admin
from django.db import models
from social_stats.models import (
    Client,
)


from .filters import domain_filters
from .widgets import AdminJSONWidget


class WorkspaceLabelsMixin:
    """Use product vocabulary for workspace relations without renaming DB fields."""
    list_filter_submit = True
    warn_unsaved_form = True
    fieldsets_as_tabs = False

    def get_list_filter(self, request):
        return domain_filters(self.model, super().get_list_filter(request))

    formfield_overrides = {
        models.TextField: {'widget': UnfoldAdminTextareaWidget(attrs={'rows': 4, 'class': 'vLargeTextField admin-textarea'})},
        models.JSONField: {'widget': AdminJSONWidget(attrs={'rows': 6, 'class': 'vLargeTextField admin-json', 'spellcheck': 'false'})},
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
            if self.fieldsets_as_tabs:
                options['classes'] = ['tab']
            elif collapse:
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


class OperationalReadOnlyAdmin(WorkspaceLabelsMixin, ModelAdmin):
    """Inspect service-owned records; transitions belong to the frontend workflows."""
    actions = None

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

