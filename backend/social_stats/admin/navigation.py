"""Permission-aware product navigation for the internal backend."""
from django.contrib import admin
from django.urls import reverse


NAVIGATION_GROUPS = (
    ('فضاهای کاری و دسترسی', 'domain', ('client', 'userprofile', 'rolepreset')),
    ('اتصال‌ها و همگام‌سازی', 'hub', ('socialaccount', 'platformcredential', 'synclog')),
    ('محتوا و انتشار', 'edit_calendar', (
        'mediaasset', 'unifiedpost', 'platformpublishlog', 'postqueue', 'queueditem',
        'calendarpost', 'calendarnote', 'postingschedule',
    )),
    ('صندوق پیام و خودکارسازی', 'forum', ('conversation', 'message', 'unifiedreview', 'automationrule')),
    ('آمار و بازگشت سرمایه', 'monitoring', ('dailymetric', 'roisettings', 'roireport')),
    ('تنظیمات و داده‌های مرجع', 'settings', ('sitecontent', 'lookupcollection')),
    ('زمان‌بندی پردازش‌ها', 'schedule', (
        'django_celery_beat.periodictask', 'django_celery_beat.intervalschedule',
        'django_celery_beat.crontabschedule', 'django_celery_beat.clockedschedule',
        'django_celery_beat.solarschedule',
    )),
    ('امنیت و نشست‌ها', 'shield', (
        'axes.accessattempt', 'axes.accessfailurelog', 'axes.accesslog',
        'token_blacklist.outstandingtoken', 'token_blacklist.blacklistedtoken',
    )),
    ('کاربران و گروه‌ها', 'manage_accounts', ('auth.user', 'auth.group')),
)


def sidebar_navigation(request):
    """Apply the same model-admin checks as the linked list pages."""
    registry = {
        model._meta.label_lower: model_admin
        for model, model_admin in admin.site._registry.items()
    }
    groups = []
    for title, icon, model_names in NAVIGATION_GROUPS:
        items = []
        for name in model_names:
            label = name if '.' in name else f'social_stats.{name}'
            model_admin = registry.get(label)
            if model_admin is None or not model_admin.has_module_permission(request):
                continue
            if not model_admin.has_view_or_change_permission(request):
                continue
            opts = model_admin.model._meta
            items.append({
                'title': str(opts.verbose_name_plural),
                'icon': icon,
                'link': reverse(f'admin:{opts.app_label}_{opts.model_name}_changelist'),
            })
        if items:
            groups.append({'title': title, 'separator': True, 'collapsible': True, 'items': items})
    return groups
