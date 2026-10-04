"""Contract tests for the canonical platform capability registry."""
from pathlib import Path

from django.test import SimpleTestCase

from social_stats.management.commands.check_platform_config import configuration_errors
from social_stats.platform_registry import (
    CAPABILITIES, CAPABILITY_STATUSES, ENABLED_STATUSES, PLATFORMS,
    frontend_metadata, markdown_matrix,
)


class PlatformCapabilityContractTests(SimpleTestCase):
    def test_active_platform_dependencies_are_complete(self):
        """Every advertised active integration has publisher/egress/handler dependencies."""
        self.assertEqual(configuration_errors(), [])

    def test_every_platform_has_the_complete_status_schema(self):
        for platform in PLATFORMS.values():
            self.assertEqual(set(platform.capabilities), set(CAPABILITIES))
            self.assertLessEqual(set(platform.capabilities.values()), CAPABILITY_STATUSES)

    def test_non_active_capabilities_cannot_be_treated_as_enabled(self):
        self.assertEqual(ENABLED_STATUSES, {'supported', 'beta'})
        self.assertFalse(PLATFORMS['telegram'].enabled('analytics'))
        self.assertFalse(PLATFORMS['bale'].enabled('inbox'))
        self.assertFalse(PLATFORMS['eitaa'].enabled('connection'))
        self.assertFalse(PLATFORMS['aparat'].enabled('publish_video'))

    def test_checked_outputs_are_derived_from_registry(self):
        root = Path(__file__).resolve().parents[3]
        import json
        frontend = json.loads((root / 'frontend/next/src/services/platformCapabilities.json').read_text())
        self.assertEqual(frontend, frontend_metadata())
        docs = (root / 'docs/PLATFORM_SUPPORT.md').read_text()
        documented = docs.split('<!-- platform-matrix:start -->', 1)[1].split(
            '<!-- platform-matrix:end -->', 1)[0].strip()
        self.assertEqual(documented, markdown_matrix())
