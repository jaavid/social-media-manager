"""Generate the offline browser catalogue from public provider manifests."""
import json
from pathlib import Path
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from social_stats.platform_registry import public_registry, frontend_metadata, markdown_matrix


def snapshot():
    return json.dumps(public_registry(), ensure_ascii=False, indent=2) + '\n'


def snapshot_path():
    return Path(settings.BASE_DIR).parent / 'frontend/src/services/platformCatalogue.generated.json'


class Command(BaseCommand):
    help = 'Export the public platform catalogue; --check detects frontend drift.'

    def add_arguments(self, parser):
        parser.add_argument('--check', action='store_true')

    def handle(self, *args, **options):
        root = Path(settings.BASE_DIR).parent
        docs_path = root / 'docs/PLATFORM_SUPPORT.md'
        docs = docs_path.read_text()
        start_marker = '<!-- platform-matrix:start -->'
        end_marker = '<!-- platform-matrix:end -->'
        before, remaining = docs.split(start_marker, 1)
        _, after = remaining.split(end_marker, 1)
        outputs = {
            snapshot_path(): snapshot(),
            root / 'frontend/src/services/platformCapabilities.json': json.dumps(frontend_metadata(), ensure_ascii=False, indent=2) + '\n',
            docs_path: before + start_marker + '\n' + markdown_matrix() + '\n' + end_marker + after,
        }
        for path, expected in outputs.items():
            if options['check']:
                if not path.exists() or path.read_text() != expected:
                    raise CommandError('Platform catalogue drift: run export_platform_catalogue')
            else:
                path.write_text(expected)
        self.stdout.write(self.style.SUCCESS('Platform catalogue is synchronized.'))
