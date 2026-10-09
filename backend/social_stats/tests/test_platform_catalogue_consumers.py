"""New providers flow through calendar and offline browser metadata without local lists."""
import json
from dataclasses import replace
from types import SimpleNamespace
from django.test import SimpleTestCase
from rest_framework.exceptions import ValidationError
from social_stats.platforms import provider_registry as registry
from social_stats.platforms.catalogue import platform_metadata, platform_keys, writing_guidance
from social_stats.serializers.calendar import CalendarPostSerializer, PostingScheduleSerializer
from social_stats.management.commands.export_platform_catalogue import snapshot, snapshot_path
from .test_provider_conformance import FixtureRegistration


class BuiltinCatalogueTests(SimpleTestCase):
    def test_bale_calendar_and_brand_metadata(self):
        serializer = CalendarPostSerializer()
        self.assertEqual(serializer.validate_platform('bale'), 'bale')
        self.assertEqual(PostingScheduleSerializer().validate_platform('telegram'), 'telegram')
        self.assertEqual(serializer.get_platform_color(SimpleNamespace(platform='bale')), '#00A884')
        self.assertEqual(serializer.get_platform_icon(SimpleNamespace(platform='facebook')), '📘')
        with self.assertRaises(ValidationError):
            serializer.validate_platform('eitaa')  # planned support is not enabled
        with self.assertRaises(ValidationError):
            serializer.validate_platform('unknown')

    def test_offline_snapshot_matches_live_public_catalogue(self):
        self.assertEqual(snapshot_path().read_text(), snapshot())
        payload = json.loads(snapshot())
        self.assertIn('eitaa', {p['key'] for p in payload['platforms']})
        self.assertIn('bale', writing_guidance('caption'))


class AddedProviderTests(FixtureRegistration, SimpleTestCase):
    def test_new_supported_provider_enters_calendar_without_serializer_edits(self):
        manifest = self.provider.manifest
        registry._MANIFESTS[manifest.key] = replace(manifest,
            support={**manifest.support, 'scheduling': 'supported'}, brand_color='#123456')
        self.assertIn(manifest.key, platform_keys('scheduling'))
        self.assertEqual(platform_metadata()[manifest.key]['color'], '#123456')
        for serializer in (CalendarPostSerializer(), PostingScheduleSerializer()):
            self.assertEqual(serializer.fields['platform'].run_validation(manifest.key), manifest.key)
            self.assertEqual(serializer.validate_platform(manifest.key), manifest.key)
        self.assertIn(manifest.key, {p['key'] for p in json.loads(snapshot())['platforms']})
