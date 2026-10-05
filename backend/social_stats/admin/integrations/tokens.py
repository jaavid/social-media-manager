"""Style JWT token administration while retaining the vendor's permission rules."""
from django.contrib import admin
from rest_framework_simplejwt.token_blacklist import admin as jwt_admin
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from unfold.admin import ModelAdmin


admin.site.unregister(OutstandingToken)
admin.site.unregister(BlacklistedToken)


@admin.register(OutstandingToken)
class OutstandingTokenAdmin(jwt_admin.OutstandingTokenAdmin, ModelAdmin):
    pass


@admin.register(BlacklistedToken)
class BlacklistedTokenAdmin(jwt_admin.BlacklistedTokenAdmin, ModelAdmin):
    pass
