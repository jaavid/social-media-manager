# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""Permissions models."""
from django.db import models
from django.contrib.auth.models import User

from social_stats.models.workspaces import Client

PERMISSION_CATEGORY_CHOICES = [
    ('pages',    'Pages'),
    ('sections', 'Sections'),
    ('actions',  'Actions'),
    ('data',     'Data'),
]

ALL_PERMISSIONS = [
    # Dashboard
    ('dashboard.view',               'View Dashboard',                'See the main dashboard page',                          'pages',    True,  True,  10),
    ('dashboard.kpi_cards',          'See KPI Cards',                 'View stat cards at top of dashboard',                  'sections', True,  True,  11),
    ('dashboard.charts',             'See Charts',                    'View charts and graphs',                               'sections', True,  True,  12),
    ('dashboard.platform_tabs',      'Platform Tabs',                 'Switch between platforms',                             'sections', True,  True,  13),
    ('dashboard.date_range',         'Change Date Range',             'Modify date range filter',                             'actions',  True,  True,  14),
    ('dashboard.posts_table',        'Recent Posts Table',            'See recent posts section',                             'sections', True,  True,  15),
    ('dashboard.platform_breakdown', 'Platform Breakdown',            'See platform breakdown table',                         'sections', True,  True,  16),
    ('dashboard.sync_now',           'Sync Now Button',               'Trigger manual sync',                                  'actions',  True,  False, 17),
    ('dashboard.export_pdf',         'Export PDF',                    'Export dashboard as PDF report',                       'actions',  True,  True,  18),
    # Analytics
    ('analytics.view',               'View Analytics',                'Access analytics page',                                'pages',    True,  True,  20),
    ('analytics.impressions',        'Impressions Data',              'See impressions metrics',                              'data',     True,  True,  21),
    ('analytics.reach',              'Reach Data',                    'See reach metrics',                                    'data',     True,  True,  22),
    ('analytics.engagement',         'Engagement Data',               'See engagement metrics',                               'data',     True,  True,  23),
    ('analytics.video_views',        'Video Views Data',              'See video view counts',                                'data',     True,  True,  24),
    ('analytics.followers',          'Followers Data',                'See follower counts',                                  'data',     True,  True,  25),
    ('analytics.website_clicks',     'Website Clicks',                'See website click data',                               'data',     True,  True,  26),
    ('analytics.phone_calls',        'Phone Calls',                   'See phone call data (GMB)',                            'data',     True,  False, 27),
    ('analytics.direction_requests', 'Direction Requests',            'See direction requests (GMB)',                         'data',     True,  False, 28),
    # Calendar
    ('calendar.view',                'View Calendar',                 'Access content calendar page',                         'pages',    True,  True,  30),
    ('calendar.month_view',          'Month View',                    'See monthly calendar grid',                            'sections', True,  True,  31),
    ('calendar.list_view',           'List View',                     'See list view of posts',                               'sections', True,  True,  32),
    ('calendar.stats_view',          'Stats View',                    'See posting stats',                                    'sections', True,  False, 33),
    ('calendar.create_post',         'Create Posts',                  'Schedule new posts',                                   'actions',  True,  False, 34),
    ('calendar.edit_post',           'Edit Posts',                    'Edit existing calendar posts',                         'actions',  True,  False, 35),
    ('calendar.delete_post',         'Delete Posts',                  'Delete calendar posts',                                'actions',  True,  False, 36),
    ('calendar.add_notes',           'Add Notes',                     'Add calendar notes',                                   'actions',  True,  False, 37),
    ('calendar.view_notes',          'View Notes',                    'See calendar notes',                                   'sections', True,  True,  38),
    ('calendar.best_times',          'Best Posting Times',            'See recommended posting times',                        'sections', True,  False, 39),
    # ROI
    ('roi.view',                     'View ROI Calculator',           'Access ROI calculator page',                           'pages',    True,  True,  40),
    ('roi.view_results',             'See ROI Results',               'View calculated ROI results',                          'sections', True,  True,  41),
    ('roi.edit_settings',            'Edit ROI Settings',             'Modify budgets and conversion rates',                  'actions',  True,  False, 42),
    ('roi.view_history',             'ROI History',                   'View past ROI reports',                                'sections', True,  True,  43),
    ('roi.export',                   'Export ROI Report',             'Download ROI as PDF',                                  'actions',  True,  False, 44),
    # Reports
    ('reports.view',                 'View Reports',                  'Access reports page',                                  'pages',    True,  True,  50),
    ('reports.download_pdf',         'Download PDF',                  'Download report PDFs',                                 'actions',  True,  True,  51),
    ('reports.view_history',         'Report History',                'See past generated reports',                           'sections', True,  True,  52),
    ('reports.schedule',             'Schedule Reports',              'Configure automated report delivery',                  'actions',  True,  False, 53),
    # Alerts
    ('alerts.view',                  'View Alerts',                   'Access alerts page',                                   'pages',    True,  False, 60),
    ('alerts.mark_read',             'Mark Alerts Read',              'Dismiss and mark alerts as read',                      'actions',  True,  False, 61),
    ('alerts.configure',             'Configure Alerts',              'Set up alert rules and thresholds',                    'actions',  True,  False, 62),
    # Reviews
    ('reviews.view',                 'View Reviews',                  'Access reviews page',                                  'pages',    True,  False, 70),
    ('reviews.reply',                'Reply to Reviews',              'Post replies to Google reviews',                       'actions',  True,  False, 71),
    ('reviews.view_stats',           'Review Statistics',             'See review rating analytics',                          'sections', True,  False, 72),
    # Settings
    ('settings.view',                'View Settings',                 'Access settings page',                                 'pages',    True,  True,  80),
    ('settings.connect_accounts',    'Connect Accounts',              'Link social media accounts via OAuth',                 'actions',  True,  True,  81),
    ('settings.disconnect_accounts', 'Disconnect Accounts',           'Unlink connected accounts',                            'actions',  True,  False, 82),
    ('settings.view_credentials',    'View Connected Status',         'See which platforms are connected',                    'sections', True,  True,  83),
    # Billing
    ('billing.view',                 'View Billing',                  'Access billing page',                                  'pages',    True,  False, 90),
    ('billing.view_invoices',        'View Invoices',                 'See invoice history',                                  'sections', True,  False, 91),
    ('billing.download_invoices',    'Download Invoices',             'Download invoice PDFs',                                'actions',  True,  False, 92),
    # Data
    ('data.view_all_clients',        'View All Clients',              'Access data for all clients',                          'data',     True,  False, 100),
    ('data.view_assigned_clients',   'View Assigned Clients',         'Access data only for assigned clients',                'data',     True,  False, 101),
    ('data.view_own_client',         'View Own Client Data',          'Access own client data only',                          'data',     False, True,  102),
    ('data.impressions',             'Impressions Numbers',           'See impressions figures',                              'data',     True,  True,  103),
    ('data.revenue_data',            'Revenue / ROI Numbers',         'See financial and ROI data',                           'data',     True,  False, 104),
    ('data.competitor_data',         'Competitor Data',               'Access competitor benchmarks',                         'data',     True,  False, 105),
]

# Page groupings for the UI
PERMISSION_PAGE_GROUPS = {
    'dashboard': {'label': 'Dashboard',         'icon': '📊', 'prefix': 'dashboard.'},
    'analytics': {'label': 'Analytics',         'icon': '📈', 'prefix': 'analytics.'},
    'calendar':  {'label': 'Content Calendar',  'icon': '📅', 'prefix': 'calendar.'},
    'roi':       {'label': 'ROI Calculator',    'icon': '💰', 'prefix': 'roi.'},
    'reports':   {'label': 'Reports',           'icon': '📄', 'prefix': 'reports.'},
    'alerts':    {'label': 'Alerts',            'icon': '🔔', 'prefix': 'alerts.'},
    'reviews':   {'label': 'Reviews',           'icon': '⭐', 'prefix': 'reviews.'},
    'settings':  {'label': 'Settings',          'icon': '⚙️', 'prefix': 'settings.'},
    'billing':   {'label': 'Billing',           'icon': '💳', 'prefix': 'billing.'},
    'data':      {'label': 'Data Access',       'icon': '🗄️', 'prefix': 'data.'},
    'whatsapp':  {'label': 'WhatsApp',          'icon': '💬', 'prefix': 'whatsapp.'},
    'composer':      {'label': 'Composer',          'icon': '✍️', 'prefix': 'composer.'},
    'inbox':         {'label': 'Inbox',             'icon': '📥', 'prefix': 'inbox.'},
    'video_studio':  {'label': 'Video Studio',      'icon': '🎬', 'prefix': 'video.'},
    'automations':   {'label': 'Automations',       'icon': '⚡', 'prefix': 'automations.'},
    'ai_studio':     {'label': 'AI Studio',         'icon': '✨', 'prefix': 'ai.'},
    'audience':      {'label': 'Audience Insights', 'icon': '👥', 'prefix': 'audience.'},
    'competitors':   {'label': 'Competitors',       'icon': '🏆', 'prefix': 'competitors.'},
    'audit':         {'label': 'Audit Log',         'icon': '📜', 'prefix': 'audit.'},
    # CTWA Bot Builder
    'bot_flows':     {'label': 'Bot Flows',         'icon': '🤖', 'prefix': 'bot.'},
    'leads':         {'label': 'Leads',             'icon': '👥', 'prefix': 'leads.'},
    'ctwa':          {'label': 'CTWA Campaigns',    'icon': '📣', 'prefix': 'ctwa.'},
}


class Permission(models.Model):
    code             = models.CharField(max_length=100, unique=True)
    label            = models.CharField(max_length=200)
    description      = models.CharField(max_length=300, blank=True)
    category         = models.CharField(max_length=20, choices=PERMISSION_CATEGORY_CHOICES, default='pages')
    page             = models.CharField(max_length=50, blank=True)
    is_default_staff  = models.BooleanField(default=False)
    is_default_client = models.BooleanField(default=False)
    sort_order        = models.IntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'code']

    def __str__(self):
        return f"{self.code} — {self.label}"


class RolePermission(models.Model):
    role       = models.CharField(max_length=20, choices=[('staff','Staff'),('client','Client')])
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE, related_name='role_permissions')
    is_granted = models.BooleanField(default=True)

    class Meta:
        unique_together = ('role', 'permission')

    def __str__(self):
        return f"{self.role} | {self.permission.code} | {'✓' if self.is_granted else '✗'}"


class UserPermission(models.Model):
    user_profile = models.ForeignKey('UserProfile', on_delete=models.CASCADE, related_name='permission_overrides')
    permission   = models.ForeignKey(Permission, on_delete=models.CASCADE, related_name='user_overrides')
    is_granted   = models.BooleanField()
    granted_by   = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='granted_permissions')
    granted_at   = models.DateTimeField(auto_now_add=True)
    note         = models.CharField(max_length=300, blank=True)

    class Meta:
        unique_together = ('user_profile', 'permission')

    def __str__(self):
        return f"{self.user_profile.user.email} | {self.permission.code} | {'✓' if self.is_granted else '✗'}"


class StaffClientAssignment(models.Model):
    staff_profile = models.ForeignKey('UserProfile', on_delete=models.CASCADE, related_name='client_assignments')
    client        = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='staff_assignments')
    assigned_by   = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='made_assignments')
    assigned_at   = models.DateTimeField(auto_now_add=True)
    can_edit      = models.BooleanField(default=False)
    can_sync      = models.BooleanField(default=True)
    can_export    = models.BooleanField(default=True)
    note          = models.CharField(max_length=300, blank=True)

    class Meta:
        unique_together = ('staff_profile', 'client')

    def __str__(self):
        return f"{self.staff_profile.user.email} → {self.client.company}"


class ClientPageConfig(models.Model):
    client               = models.OneToOneField(Client, on_delete=models.CASCADE, related_name='page_config')
    portal_title         = models.CharField(max_length=200, default='My Dashboard')
    show_platform_tabs   = models.BooleanField(default=True)
    show_date_picker     = models.BooleanField(default=True)
    show_export_button   = models.BooleanField(default=True)
    show_sync_button     = models.BooleanField(default=False)
    show_posts_section   = models.BooleanField(default=True)
    show_reviews_section = models.BooleanField(default=False)
    show_roi_section     = models.BooleanField(default=False)
    show_calendar        = models.BooleanField(default=False)
    default_platform     = models.CharField(max_length=30, default='all')
    default_date_range   = models.IntegerField(default=30)
    custom_logo_url      = models.URLField(blank=True)
    custom_accent_color  = models.CharField(max_length=7, default='#2563EB')
    welcome_message      = models.TextField(blank=True)
    updated_at           = models.DateTimeField(auto_now=True)
    updated_by           = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='updated_portal_configs')

    def __str__(self):
        return f"Portal config — {self.client.company}"


