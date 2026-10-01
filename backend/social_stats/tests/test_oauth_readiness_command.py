import json
from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import SimpleTestCase, override_settings

from social_stats.management.commands.check_oauth_readiness import google_readiness


class OAuthReadinessCommandTests(SimpleTestCase):
    @override_settings(
        GOOGLE_CLIENT_ID='client-id-that-must-not-leak',
        GOOGLE_CLIENT_SECRET='super-secret-that-must-not-leak',
        GOOGLE_REDIRECT_URI='https://social.example.com/api/oauth/google/callback/',
    )
    def test_google_readiness_reports_configuration_without_secret_values(self):
        report = google_readiness()

        self.assertTrue(report['youtube']['configured'])
        self.assertEqual(report['youtube']['missing'], [])
        self.assertEqual(
            report['youtube']['redirect_uri'],
            'https://social.example.com/api/oauth/google/callback/',
        )

        serialized = json.dumps(report)
        self.assertNotIn('client-id-that-must-not-leak', serialized)
        self.assertNotIn('super-secret-that-must-not-leak', serialized)

    @override_settings(
        GOOGLE_CLIENT_ID='',
        GOOGLE_CLIENT_SECRET='',
        GOOGLE_REDIRECT_URI='',
    )
    def test_google_readiness_lists_missing_setting_names(self):
        report = google_readiness()

        self.assertFalse(report['youtube']['configured'])
        self.assertEqual(
            report['youtube']['missing'],
            ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'],
        )

    @override_settings(
        GOOGLE_CLIENT_ID='safe-client-id',
        GOOGLE_CLIENT_SECRET='safe-client-secret',
        GOOGLE_REDIRECT_URI='https://social.example.com/api/oauth/google/callback/',
    )
    def test_json_output_never_prints_credentials(self):
        stdout = StringIO()
        call_command('check_oauth_readiness', '--json', stdout=stdout)
        output = stdout.getvalue()

        self.assertNotIn('safe-client-id', output)
        self.assertNotIn('safe-client-secret', output)
        payload = json.loads(output)
        self.assertTrue(payload['youtube']['configured'])

    @override_settings(
        GOOGLE_CLIENT_ID='',
        GOOGLE_CLIENT_SECRET='',
        GOOGLE_REDIRECT_URI='',
    )
    def test_strict_mode_fails_when_not_ready(self):
        with self.assertRaises(CommandError):
            call_command('check_oauth_readiness', '--strict', stdout=StringIO())
