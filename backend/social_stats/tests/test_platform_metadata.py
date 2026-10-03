from django.urls import reverse
from rest_framework.test import APISimpleTestCase

from social_stats.platform_registry import CAPABILITIES, CAPABILITY_STATUSES, PLATFORMS, public_registry
from social_stats.platforms.registry import CATEGORY_REGISTRY, PLATFORM_REGISTRY


class PlatformMetadataTests(APISimpleTestCase):
    def test_public_registry_covers_catalogue_in_stable_categories(self):
        payload = public_registry()
        self.assertEqual(
            [item['key'] for item in payload['categories']],
            [
                key for key, _ in sorted(
                    CATEGORY_REGISTRY.items(),
                    key=lambda item: item[1]['order'],
                )
            ],
        )
        self.assertEqual(
            {item['key'] for item in payload['platforms']},
            {item.key for item in PLATFORM_REGISTRY},
        )

        for item in payload['platforms']:
            self.assertTrue(item['titles']['fa'])
            self.assertTrue(item['titles']['en'])
            self.assertIn(item['category'], CATEGORY_REGISTRY)
            self.assertEqual(set(item['capabilities']), set(CAPABILITIES))
            self.assertLessEqual(set(item['capabilities'].values()), CAPABILITY_STATUSES)

    def test_support_registry_never_defines_unknown_platform(self):
        catalogue_keys = {item.key for item in PLATFORM_REGISTRY}
        self.assertLessEqual(set(PLATFORMS), catalogue_keys)

    def test_endpoint_is_public_read_only_and_does_not_expose_internal_fields(self):
        response = self.client.get(reverse('platform_metadata'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), public_registry())
        self.assertEqual(self.client.post(reverse('platform_metadata'), {}).status_code, 405)

        allowed_platform_fields = {
            'key', 'titles', 'category', 'order', 'auth_type',
            'rollout_status', 'capabilities',
            'features',
        }
        for platform in response.json()['platforms']:
            self.assertEqual(set(platform), allowed_platform_fields)

        payload = str(response.json()).lower()
        for forbidden in (
            'secret', 'client_id', 'endpoint', 'publisher',
            'connection_handler', 'egress_service',
        ):
            self.assertNotIn(forbidden, payload)
