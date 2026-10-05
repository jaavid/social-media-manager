"""Unfold styling for Celery Beat, retaining its forms, schedules and actions."""
from django.contrib import admin
from django.utils.html import format_html
from django_celery_beat import admin as beat_admin
from django_celery_beat.models import (
    ClockedSchedule, CrontabSchedule, IntervalSchedule, PeriodicTask, SolarSchedule,
)
from unfold.admin import ModelAdmin, TabularInline
from unfold.widgets import UnfoldAdminSelectWidget, UnfoldAdminTextInputWidget


class TaskSelectWidget(UnfoldAdminSelectWidget, beat_admin.TaskSelectWidget):
    pass


class PeriodicTaskForm(beat_admin.PeriodicTaskForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['task'].widget = UnfoldAdminTextInputWidget()
        self.fields['regtask'].widget = TaskSelectWidget()


class PeriodicTaskInline(beat_admin.PeriodicTaskInline, TabularInline):
    """Keep schedule/task associations read-only as in Celery Beat."""


for model in (PeriodicTask, IntervalSchedule, CrontabSchedule, SolarSchedule, ClockedSchedule):
    admin.site.unregister(model)


@admin.register(PeriodicTask)
class PeriodicTaskAdmin(beat_admin.PeriodicTaskAdmin, ModelAdmin):
    form = PeriodicTaskForm
    change_form_template = 'admin/social_stats/periodic_task_change_form.html'

    @admin.display(description='توضیح زمان‌بندی کرون‌تب')
    def crontab_translation(self, obj):
        description = obj.crontab.human_readable if obj and obj.crontab_id else '—'
        return format_html('<span id="crontab-description">{}</span>', description)


@admin.register(IntervalSchedule)
class IntervalScheduleAdmin(beat_admin.IntervalScheduleAdmin, ModelAdmin):
    inlines = [PeriodicTaskInline]


@admin.register(CrontabSchedule)
class CrontabScheduleAdmin(beat_admin.CrontabScheduleAdmin, ModelAdmin):
    inlines = [PeriodicTaskInline]


@admin.register(SolarSchedule)
class SolarScheduleAdmin(beat_admin.SolarScheduleAdmin, ModelAdmin):
    inlines = [PeriodicTaskInline]


@admin.register(ClockedSchedule)
class ClockedScheduleAdmin(beat_admin.ClockedScheduleAdmin, ModelAdmin):
    inlines = [PeriodicTaskInline]
