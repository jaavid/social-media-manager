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
app = Celery('dashboard')
app.config_from_object('django.conf:settings', namespace='CELERY')

# Celery autodiscovery imports each Django app's tasks.py. Composer scheduler
# tasks live in social_stats.scheduler, so import that module explicitly or
# beat will publish task names the worker never registers.
app.conf.imports = (
    'social_stats.scheduler',
)

app.autodiscover_tasks()
