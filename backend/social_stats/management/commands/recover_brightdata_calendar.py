"""Attach existing ready snapshots without submitting new collections."""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from social_stats.brightdata_calendar import download_snapshot, normalize_posts, snapshot_owner
from social_stats.channel_calendar_tasks import sync_calendar_source
from social_stats.instagram_calendar import InstagramReadError
from social_stats.models import CalendarSource


class Command(BaseCommand):
    help = 'Recover ready Bright Data snapshots into matching active Instagram sources in one workspace.'

    def add_arguments(self, parser):
        parser.add_argument('--workspace', type=int, required=True)
        parser.add_argument('--snapshot', action='append', required=True)

    def handle(self, *args, **options):
        plans = []
        seen = set()
        # Validate every snapshot, owner and workspace before changing any state.
        for snapshot in options['snapshot']:
            try:
                rows = download_snapshot(snapshot)
                if rows is None:
                    raise CommandError('Snapshot is still processing; nothing changed.')
                if rows == []:
                    raise CommandError('Snapshot is ready but contains zero posts; nothing can be recovered.')
                if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
                    raise CommandError('Snapshot returned an unexpected response shape; nothing changed.')
                username = snapshot_owner(rows)
                normalize_posts(rows, username)
            except InstagramReadError as error:
                raise CommandError(error.code) from None
            source = CalendarSource.objects.filter(
                client_id=options['workspace'], platform='instagram', username=username, is_active=True,
            ).first()
            if not source or source.pk in seen:
                raise CommandError('No unique active channel in this workspace for the snapshot; nothing changed.')
            seen.add(source.pk)
            plans.append((source.pk, snapshot))

        with transaction.atomic():
            sources = list(CalendarSource.objects.select_for_update().filter(
                pk__in=seen, client_id=options['workspace'], platform='instagram', is_active=True,
            ))
            snapshots = dict(plans)
            if len(sources) != len(plans) or any(
                source.provider_snapshot_id and source.provider_snapshot_id != snapshots[source.pk]
                for source in sources
            ):
                raise CommandError('Channel changed or another collection is active; nothing changed.')
            for source_id, snapshot in plans:
                CalendarSource.objects.filter(pk=source_id).update(
                    provider_snapshot_id=snapshot, provider_started_at=timezone.now(),
                    last_attempt_at=timezone.now(), sync_status='syncing', error_code='',
                )
        for source_id, snapshot in plans:
            try:
                sync_calendar_source.delay(source_id, snapshot_id=snapshot)
            except Exception:
                raise CommandError('Snapshot saved but queue unavailable; rerun this recovery command safely.') from None
            self.stdout.write(f'Queued existing snapshot for source {source_id}; no new collection submitted.')
