"""Operator-only plan assignment; no caller-controlled public billing mutation."""
from django.core.management.base import BaseCommand, CommandError

from social_stats.billing_plans import PLANS
from social_stats.entitlements import locked_organization, subscription_for
from social_stats.models import Organization


class Command(BaseCommand):
    help = 'Assign an organization plan without changing membership or ownership.'

    def add_arguments(self, parser):
        parser.add_argument('organization_id', type=int)
        parser.add_argument('plan', choices=[p for p in PLANS if PLANS[p]['side'] == 'organization'])

    def handle(self, *args, **options):
        try:
            with locked_organization(options['organization_id']) as organization:
                sub = subscription_for(organization)
                sub.plan = options['plan']
                sub.save(update_fields=['plan', 'updated_at'])
        except Organization.DoesNotExist as exc:
            raise CommandError('Organization does not exist') from exc
        self.stdout.write(self.style.SUCCESS(
            f"Organization {organization.pk}: {sub.plan} ({sub.status})"
        ))
