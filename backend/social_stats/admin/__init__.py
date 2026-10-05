# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""Django autodiscovers these domain-specific admin registrations."""
from django.contrib import admin
from .accounts import PlatformCredentialAdminForm  # noqa: F401
from . import accounts  # noqa: F401
from . import workspaces  # noqa: F401
from . import analytics  # noqa: F401
from . import calendar  # noqa: F401
from . import content  # noqa: F401
from . import publishing  # noqa: F401
from . import inbox  # noqa: F401
from . import automation  # noqa: F401
from . import auth  # noqa: F401
from . import integrations  # noqa: F401

admin.site.site_header = 'مدیریت سامانه شبکه‌های اجتماعی'
admin.site.site_title = 'مدیریت بک‌اند'
admin.site.index_title = 'مدیریت اطلاعات و تنظیمات'
