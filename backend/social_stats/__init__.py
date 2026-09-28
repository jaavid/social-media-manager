# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================

# Register lightweight providers that are not part of the legacy autoload list.
# These imports only register publisher classes; they do not touch the database.
from .publishers import telegram as _telegram_publisher  # noqa: F401,E402
from .publishers import bale as _bale_publisher  # noqa: F401,E402
