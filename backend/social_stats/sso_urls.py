from django.urls import path

from .oidc_sso import oidc_sso_callback, oidc_sso_config, oidc_sso_start


urlpatterns = [
    path('', oidc_sso_config, name='oidc_sso_config'),
    path('start/', oidc_sso_start, name='oidc_sso_start'),
    path('callback/', oidc_sso_callback, name='oidc_sso_callback'),
]
