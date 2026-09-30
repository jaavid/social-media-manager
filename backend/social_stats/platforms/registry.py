"""Canonical platform catalogue.

Keep platform-facing metadata here rather than scattering slightly different
choice lists throughout models, forms, and services.  The registry is an
ordered tuple so generated choices remain stable across migrations.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class PlatformDefinition:
    key: str
    title_fa: str
    title_en: str
    category: str
    category_title_fa: str
    auth_type: str
    capabilities: frozenset[str]
    output_service: str
    status: str

    @property
    def is_active(self):
        return self.status == 'active'


def _capabilities(*values):
    return frozenset(values)


PLATFORM_REGISTRY = (
    PlatformDefinition('facebook', 'فیس‌بوک', 'Facebook', 'social_network', 'شبکه‌های اجتماعی', 'oauth2', _capabilities('publish_text', 'publish_image', 'publish_video', 'analytics', 'inbox', 'comments', 'oauth'), 'facebook', 'active'),
    PlatformDefinition('instagram', 'اینستاگرام', 'Instagram', 'social_network', 'شبکه‌های اجتماعی', 'oauth2', _capabilities('publish_image', 'publish_video', 'analytics', 'inbox', 'comments', 'oauth'), 'instagram', 'active'),
    PlatformDefinition('linkedin', 'لینکدین', 'LinkedIn', 'social_network', 'شبکه‌های اجتماعی', 'oauth2', _capabilities('publish_text', 'publish_image', 'publish_video', 'analytics', 'comments', 'oauth'), 'linkedin', 'active'),
    PlatformDefinition('tiktok', 'تیک‌تاک', 'TikTok', 'social_network', 'شبکه‌های اجتماعی', 'oauth2', _capabilities('publish_video', 'analytics', 'comments', 'oauth'), 'tiktok', 'experimental'),
    PlatformDefinition('telegram', 'تلگرام', 'Telegram', 'messaging', 'پیام‌رسان‌ها', 'bot_token', _capabilities('publish_text', 'publish_image', 'publish_video', 'comments'), 'telegram', 'active'),
    PlatformDefinition('bale', 'بله', 'Bale', 'messaging', 'پیام‌رسان‌ها', 'bot_token', _capabilities('publish_text', 'publish_image', 'publish_video'), 'bale', 'active'),
    PlatformDefinition('eitaa', 'ایتا', 'Eitaa', 'messaging', 'پیام‌رسان‌ها', 'bot_token', _capabilities('publish_text', 'publish_image', 'publish_video'), 'eitaa', 'experimental'),
    PlatformDefinition('youtube', 'یوتیوب', 'YouTube', 'video', 'ویدئو', 'oauth2', _capabilities('publish_video', 'analytics', 'comments', 'oauth'), 'youtube', 'active'),
    PlatformDefinition('aparat', 'آپارات', 'Aparat', 'video', 'ویدئو', 'api_key', _capabilities('publish_video', 'analytics', 'comments'), 'aparat', 'experimental'),
    PlatformDefinition('google_my_business', 'نشان تجاری گوگل', 'Google Business Profile', 'local_business', 'کسب‌وکار محلی', 'oauth2', _capabilities('publish_text', 'publish_image', 'analytics', 'reviews', 'oauth'), 'gmb', 'active'),
    PlatformDefinition('neshan', 'نشان', 'Neshan', 'local_business', 'کسب‌وکار محلی', 'api_key', _capabilities('analytics', 'reviews'), 'neshan', 'experimental'),
)

PLATFORMS_BY_KEY = {platform.key: platform for platform in PLATFORM_REGISTRY}
if len(PLATFORMS_BY_KEY) != len(PLATFORM_REGISTRY):
    raise ValueError('Duplicate platform key in PLATFORM_REGISTRY')

PLATFORM_CHOICES = [(platform.key, platform.title_en) for platform in PLATFORM_REGISTRY]
ACTIVE_PLATFORM_CHOICES = [
    (platform.key, platform.title_en) for platform in PLATFORM_REGISTRY if platform.is_active
]


def grouped_platform_choices():
    """Return Django-compatible optgroups, preserving registry order."""
    groups = {}
    for platform in PLATFORM_REGISTRY:
        group = f'{platform.category_title_fa} / {platform.category.replace("_", " ").title()}'
        groups.setdefault(group, []).append((platform.key, f'{platform.title_fa} / {platform.title_en}'))
    return [(title, choices) for title, choices in groups.items()]
