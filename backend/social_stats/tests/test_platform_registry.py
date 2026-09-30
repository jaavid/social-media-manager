from django.test import SimpleTestCase

from social_stats.admin import PlatformCredentialAdminForm
from social_stats.models import PlatformCredential
from social_stats.platforms.registry import PLATFORM_REGISTRY


class PlatformRegistryTests(SimpleTestCase):
    def test_active_platforms_are_available_in_model_and_admin_choices(self):
        active_keys = {platform.key for platform in PLATFORM_REGISTRY if platform.is_active}
        model_keys = {
            value for value, _label in PlatformCredential._meta.get_field('platform').choices
        }

        form = PlatformCredentialAdminForm()
        admin_keys = {
            value
            for group_label, group_choices in form.fields['platform'].choices
            if group_label
            for value, _label in group_choices
        }

        self.assertTrue(active_keys)
        self.assertLessEqual(active_keys, model_keys)
        self.assertLessEqual(active_keys, admin_keys)

    def test_registry_keys_are_unique(self):
        keys = [platform.key for platform in PLATFORM_REGISTRY]
        self.assertEqual(len(keys), len(set(keys)))
