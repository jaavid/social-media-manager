"""Style django-axes admin while retaining its audit and reset behavior."""
from axes import admin as axes_admin
from axes.models import AccessAttempt, AccessFailureLog, AccessLog
from django.contrib import admin
from unfold.admin import ModelAdmin


for model in (AccessAttempt, AccessFailureLog, AccessLog):
    admin.site.unregister(model)


@admin.register(AccessAttempt)
class AccessAttemptAdmin(axes_admin.AccessAttemptAdmin, ModelAdmin):
    pass


@admin.register(AccessLog)
class AccessLogAdmin(axes_admin.AccessLogAdmin, ModelAdmin):
    pass


@admin.register(AccessFailureLog)
class AccessFailureLogAdmin(axes_admin.AccessFailureLogAdmin, ModelAdmin):
    pass
