from django.core.management.base import BaseCommand, CommandError
from social_stats.platforms.conformance import registered_conformance_errors
from social_stats.platforms.provider_registry import iter_providers


class Command(BaseCommand):
    help = 'Check registered provider manifest, lifecycle and publishing contracts offline.'

    def handle(self, *args, **options):
        errors = registered_conformance_errors()
        if errors:
            raise CommandError('\n'.join(errors))
        self.stdout.write(
            self.style.SUCCESS(
                f'Provider conformance valid ({len(iter_providers())} providers).'
            )
        )
