"""Fail deployment when platform capability surfaces drift or lack dependencies."""
import importlib
import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from social_stats.egress.registry import SERVICES
from social_stats.platform_registry import (
    CAPABILITIES, CAPABILITY_STATUSES, ENABLED_STATUSES, PLATFORMS,
    frontend_metadata, markdown_matrix,
)
from social_stats.publishers.base import BasePublisher, get_publisher


PUBLISH_METHODS = {
    'publish_text': 'publish_text',
    'publish_image': 'publish_image',
    'publish_video': 'publish_video',
}


def _import_path(path):
    module, name = path.rsplit('.', 1)
    return getattr(importlib.import_module(module), name)


def configuration_errors(base_dir=None):
    """Return every registry/dependency inconsistency, without failing fast."""
    errors = []
    root = Path(base_dir or settings.BASE_DIR).parent
    for key, definition in PLATFORMS.items():
        if set(definition.capabilities) != set(CAPABILITIES):
            errors.append(f'{key}: capability keys do not match the schema')
        invalid = set(definition.capabilities.values()) - CAPABILITY_STATUSES
        if invalid:
            errors.append(f'{key}: invalid statuses: {sorted(invalid)}')

        active_publish = [c for c in PUBLISH_METHODS if definition.capabilities[c] in ENABLED_STATUSES]
        if active_publish:
            if not definition.publisher:
                errors.append(f'{key}: publishing enabled without publisher metadata')
            else:
                try:
                    expected = _import_path(definition.publisher)
                    publisher = get_publisher(key)
                    if not isinstance(publisher, expected):
                        errors.append(f'{key}: publisher registry points to {type(publisher).__name__}')
                    for capability in active_publish:
                        method = PUBLISH_METHODS[capability]
                        if getattr(type(publisher), method) is getattr(BasePublisher, method):
                            errors.append(f'{key}: {capability} declared but {method} is not implemented')
                except Exception as exc:
                    errors.append(f'{key}: publisher unavailable ({exc})')

        if definition.capabilities['connection'] in ENABLED_STATUSES:
            if not definition.connection_handler:
                errors.append(f'{key}: connection enabled without handler')
            else:
                try:
                    _import_path(definition.connection_handler)
                except Exception as exc:
                    errors.append(f'{key}: connection handler unavailable ({exc})')
            if not definition.egress_service or definition.egress_service not in SERVICES:
                errors.append(f'{key}: connection enabled without registered egress service')

    metadata_path = root / 'frontend/src/services/platformCapabilities.json'
    try:
        actual = json.loads(metadata_path.read_text(encoding='utf-8'))
        if actual != frontend_metadata():
            errors.append(f'frontend metadata differs from registry: {metadata_path}')
    except (OSError, ValueError) as exc:
        errors.append(f'frontend metadata unreadable: {exc}')

    docs_path = root / 'docs/PLATFORM_SUPPORT.md'
    try:
        docs = docs_path.read_text(encoding='utf-8')
        documented = docs.split('<!-- platform-matrix:start -->', 1)[1].split(
            '<!-- platform-matrix:end -->', 1)[0].strip()
        if documented != markdown_matrix():
            errors.append(f'platform support matrix differs from registry: {docs_path}')
    except (OSError, IndexError) as exc:
        errors.append(f'platform support matrix unreadable: {exc}')
    return errors


class Command(BaseCommand):
    help = 'Validate platform registry, publishers, egress, handlers, and frontend metadata.'

    def handle(self, *args, **options):
        errors = configuration_errors()
        if errors:
            raise CommandError('\n'.join(f'- {error}' for error in errors))
        self.stdout.write(self.style.SUCCESS(f'Platform configuration valid ({len(PLATFORMS)} platforms).'))
