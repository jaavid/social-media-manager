# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dashboard.settings')
app = Celery('dashboard', task_cls='social_stats.task_observability:CorrelatedTask')

# Register logging/publication/lifecycle signals before worker initialization.
import social_stats.task_observability  # noqa: E402,F401
app.config_from_object('django.conf:settings', namespace='CELERY')

# Celery autodiscovery imports each Django app's tasks.py. A number of Social
# Stats tasks intentionally live in feature-specific modules instead. Every
# module referenced directly by beat or by `.delay()` must therefore be loaded
# at worker startup; otherwise Celery accepts the message and then discards it
# as an "unregistered task".
app.conf.imports = (
    'social_stats.scheduler',
    'social_stats.inbox_tasks',
    'social_stats.security.tasks',
    'social_stats.notification_watchers',
    'social_stats.security.privacy_tasks',
    'social_stats.events.publisher',
)

app.autodiscover_tasks()
