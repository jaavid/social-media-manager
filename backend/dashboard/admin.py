"""Unfold presentation settings for the internal /backend/ interface."""
# Unfold uses Django model permissions and the existing /backend/ routes.
UNFOLD = {
    'SITE_TITLE': 'مدیریت بک‌اند',
    'SITE_HEADER': 'مدیریت سامانه شبکه‌های اجتماعی',
    'SITE_SUBHEADER': 'فضاهای کاری، محتوا و اتصال‌ها',
    'SHOW_HISTORY': True,
    'SHOW_BACK_BUTTON': True,
    'SITE_SYMBOL': 'monitoring',
    'SITE_URL': '/',
    'SIDEBAR': {
        'show_search': True,
        'show_all_applications': True,
        'navigation': 'social_stats.admin.navigation.sidebar_navigation',
    },
}
