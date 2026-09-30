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

from social_stats.bot_channel_views import bot_channel_connection, bot_channel_status

urlpatterns = [
    # Keep Django's framework admin outside the SPA namespace. The React app
    # owns /admin/*, while the internal Django admin lives at /django-admin/*.
    path('django-admin/', admin.site.urls),
    path('api/bot-channels/<int:client_id>/status/', bot_channel_status),
    path('api/bot-channels/<int:client_id>/<str:platform>/', bot_channel_connection),
    path('api/egress/', include('social_stats.egress_urls')),
    path('api/', include('social_stats.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
