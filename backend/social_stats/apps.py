from django.apps import AppConfig


class SocialStatsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'social_stats'
    verbose_name = 'مدیریت شبکه‌های اجتماعی'

    def ready(self):
        from . import signals  # noqa: F401
