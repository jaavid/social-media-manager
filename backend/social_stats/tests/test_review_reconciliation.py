"""Public, transport-free verification of historical registry loading findings."""
import threading
from unittest.mock import patch
from django.test import SimpleTestCase, override_settings
from social_stats.platforms import provider_registry as registry


@override_settings(PLATFORM_PROVIDER_MODULES=('public_fixture_provider',))
class HistoricalRegistryLoading(SimpleTestCase):
    def setUp(self):
        with override_settings(PLATFORM_PROVIDER_MODULES=()):
            registry._autoload()
        self.providers = dict(registry._PROVIDERS)
        self.manifests = dict(registry._MANIFESTS)
        self.loaded = registry._LOADED
        registry._PROVIDERS.clear()
        registry._MANIFESTS.clear()
        registry._LOADED = False

    def tearDown(self):
        registry._PROVIDERS.clear()
        registry._PROVIDERS.update(self.providers)
        registry._MANIFESTS.clear()
        registry._MANIFESTS.update(self.manifests)
        registry._LOADED = self.loaded

    def complete_import(self):
        registry._PROVIDERS.update(self.providers)
        registry._MANIFESTS.update(self.manifests)

    def test_concurrent_first_requests_wait_for_the_complete_catalogue(self):
        entered, release, second_started, second_done = (threading.Event() for _ in range(4))
        results, failures = [], []
        def import_provider(_name):
            entered.set()
            if not release.wait(5):
                raise RuntimeError('Public import fixture was not released')
            self.complete_import()
        def request(second=False):
            if second:
                second_started.set()
            try:
                results.append(registry.get_provider('telegram').manifest.key)
            except Exception as error:
                failures.append(type(error).__name__)
            finally:
                if second:
                    second_done.set()
        with patch.object(registry, 'discover_modules', return_value=()), patch.object(registry.importlib, 'import_module', side_effect=import_provider):
            first = threading.Thread(target=request)
            second = threading.Thread(target=request, args=(True,))
            first.start()
            try:
                self.assertTrue(entered.wait(5))
                second.start()
                self.assertTrue(second_started.wait(5))
                self.assertFalse(second_done.wait(.05), 'Second request exposed a partial catalogue')
            finally:
                release.set()
                first.join(5)
                if second.ident is not None:
                    second.join(5)
            self.assertFalse(first.is_alive())
            self.assertFalse(second.is_alive())
        self.assertEqual(failures, [])
        self.assertEqual(results, ['telegram', 'telegram'])

    def test_import_failure_does_not_poison_the_next_catalogue_request(self):
        calls = 0
        def import_provider(_name):
            nonlocal calls
            calls += 1
            if calls == 1:
                raise ImportError('Public provider fixture failure')
            self.complete_import()
        with patch.object(registry, 'discover_modules', return_value=()), patch.object(registry.importlib, 'import_module', side_effect=import_provider):
            with self.assertRaises(ImportError):
                registry.get_provider('telegram')
            self.assertEqual(registry.get_provider('telegram').manifest.key, 'telegram')
        self.assertEqual(calls, 2)
