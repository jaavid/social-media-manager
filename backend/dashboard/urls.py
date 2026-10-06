# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from social_stats.views.bot_channel import bot_channel_connection, bot_channel_status
from social_stats.views.platform import platform_metadata
from social_stats.views.connections import connections, connection

urlpatterns = [
    # Keep Django's framework admin outside the SPA namespace. The React app
    # owns /admin/*, while the internal backend/admin interface lives at /backend/*.
    path('backend/', admin.site.urls),
    path('api/workspaces/<int:workspace_id>/connections/', connections),
    path('api/workspaces/<int:workspace_id>/connections/<str:platform>/', connection),
    path('api/platforms/', platform_metadata, name='platform_metadata'),
    path('api/bot-channels/<int:client_id>/status/', bot_channel_status),
    path('api/bot-channels/<int:client_id>/<str:platform>/', bot_channel_connection),
    path('api/egress/', include('social_stats.egress_urls')),
    path('api/auth/sso/', include('social_stats.sso_urls')),
    path('api/', include('social_stats.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
