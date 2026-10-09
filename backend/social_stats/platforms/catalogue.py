"""Derived presentation and capability views of the validated registry."""
from .provider_registry import iter_manifests


def platform_metadata():
    return {item.key: {'label': item.title_en, 'label_fa': item.title_fa,
                       'color': item.brand_color or '#64748B', 'icon': item.display_icon}
            for item in iter_manifests()}


def platform_keys(capability=None):
    return [item.key for item in iter_manifests()
            if capability is None or item.support.get(capability) in ('supported', 'beta')]


def writing_guidance(kind):
    guidance = {}
    for item in iter_manifests():
        if not any(item.support.get(key) in ('supported', 'beta')
                   for key in ('publish_text', 'publish_image', 'publish_video')):
            continue
        hint = getattr(item, f'{kind}_guidance')
        limits = [mode.constraints.max_characters for mode in item.publishing().values()
                  if mode.constraints.max_characters]
        fallback = f'{item.title_en}: write concise, audience-appropriate content.'
        if limits:
            fallback += f' Keep text within {max(limits)} characters.'
        guidance[item.key] = hint or fallback
    return guidance
