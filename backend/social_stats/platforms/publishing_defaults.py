"""Builtin publishing compatibility policies. Feature code consumes manifests."""

PLATFORM_LIMITS: dict[str, dict] = {
    'facebook': {
        'image': {'max_bytes': 10 * 1024 * 1024,        'allowed_mime': {'image/jpeg', 'image/png', 'image/gif'}},
        'video': {'max_bytes': 4 * 1024 * 1024 * 1024,  'max_seconds': 240 * 60, 'allowed_mime': {'video/mp4', 'video/quicktime'}},
    },
    'instagram': {
        # IG Feed
        'image': {'max_bytes': 8 * 1024 * 1024, 'allowed_mime': {'image/jpeg'},
                  'aspect_min': 4 / 5, 'aspect_max': 1.91, 'min_width': 320, 'max_width': 1440},
        'video': {'max_bytes': 1024 * 1024 * 1024, 'max_seconds': 60, 'allowed_mime': {'video/mp4', 'video/quicktime'},
                  'aspect_min': 4 / 5, 'aspect_max': 16 / 9},
        'reel':  {'max_bytes': 1024 * 1024 * 1024, 'max_seconds': 90, 'allowed_mime': {'video/mp4'},
                  'aspect_target': 9 / 16},
        'story': {'max_bytes': 100 * 1024 * 1024, 'max_seconds': 60, 'allowed_mime': {'video/mp4', 'image/jpeg'},
                  'aspect_target': 9 / 16},
    },
    'youtube': {
        'video': {'max_bytes': 256 * 1024 * 1024 * 1024, 'max_seconds': 12 * 3600,
                  'allowed_mime': {'video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm'}},
        'reel':  {'max_bytes': 256 * 1024 * 1024, 'max_seconds': 60, 'allowed_mime': {'video/mp4'},
                  'aspect_target': 9 / 16},
    },
    'linkedin': {
        'image': {'max_bytes': 5 * 1024 * 1024, 'allowed_mime': {'image/jpeg', 'image/png'}},
        'video': {'max_bytes': 5 * 1024 * 1024 * 1024, 'max_seconds': 10 * 60,
                  'allowed_mime': {'video/mp4', 'video/quicktime'}},
    },
    'google_my_business': {
        'image': {'max_bytes': 5 * 1024 * 1024, 'allowed_mime': {'image/jpeg', 'image/png'},
                  'min_width': 250, 'min_height': 250},
        'video': {'max_bytes': 100 * 1024 * 1024, 'max_seconds': 30, 'allowed_mime': {'video/mp4'}},
    },
}


# Existing publisher modes and text limits, kept at their provider boundary.
MODES = {
    'facebook': ('text', 'image', 'video', 'carousel', 'reel'),
    'instagram': ('image', 'video', 'carousel', 'reel', 'story'),
    'linkedin': ('text', 'image', 'video', 'carousel'),
    'youtube': ('video', 'reel'),
    'google_my_business': ('text', 'image'),
    'telegram': ('text', 'image', 'video', 'carousel', 'album', 'rich', 'poll'),
    'bale': ('text', 'image', 'video', 'carousel'),
}
TEXT_LIMITS = {'facebook': 63206, 'instagram': 2200, 'linkedin': 3000,
               'youtube': 5000, 'google_my_business': 1500, 'telegram': 4096, 'bale': 4096}


def builtin_modes(manifest):
    from .manifest import Capability, PublishingMode
    result = {}
    for mode in MODES.get(manifest.key, ()):
        capability = 'publish_' + ('video' if mode in ('video', 'reel') else
                                   'text' if mode in ('text', 'rich', 'poll') else 'image')
        policy = manifest.capability(capability)
        rules = PLATFORM_LIMITS.get(manifest.key, {}).get(mode, {})
        extension = 'telegram_composer' if manifest.key == 'telegram' else ''
        result[mode] = PublishingMode(capability, Capability(
            status=policy.status, media_types=(mode,), scopes=policy.scopes,
            max_characters=1024 if manifest.key in ('telegram', 'bale') and mode in ('image', 'video', 'carousel', 'album') else TEXT_LIMITS[manifest.key],
            min_items=1 if mode in ('image', 'video', 'carousel', 'reel', 'story') else None,
            max_items=10 if mode in ('carousel', 'album') else 1 if mode in ('image', 'video', 'reel', 'story') else None,
            max_bytes=rules.get('max_bytes'), mime_types=tuple(sorted(rules.get('allowed_mime', ()))),
            max_seconds=rules.get('max_seconds'), aspect_min=rules.get('aspect_min'),
            aspect_max=rules.get('aspect_max'), max_width=rules.get('max_width'), min_width=rules.get('min_width'), min_height=rules.get('min_height'),
        ), extension)
    return result
