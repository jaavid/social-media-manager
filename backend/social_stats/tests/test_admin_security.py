"""Unfold's runtime CSP requirements must stay inside the backend admin."""
from types import SimpleNamespace

from django.http import HttpResponse
from django.test import RequestFactory, SimpleTestCase, override_settings

from social_stats.security.middleware import SecurityHeadersMiddleware


@override_settings(DEBUG=False, CSP_UPGRADE_INSECURE_REQUESTS=False)
@override_settings(STORAGES={
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
})
class BackendAdminCSPTests(SimpleTestCase):
    def response(self, path, namespace='admin', content_type='text/html'):
        request = RequestFactory().get(path)
        request.resolver_match = SimpleNamespace(namespace=namespace)
        return SecurityHeadersMiddleware(
            lambda request: HttpResponse('<html></html>', content_type=content_type)
        )(request)

    def test_unfold_pages_allow_expression_evaluation_but_not_inline_scripts(self):
        for path in ('/backend/login/', '/backend/social_stats/client/'):
            with self.subTest(path=path):
                response = self.response(path)
                policy = response['Content-Security-Policy']
                script = next(part for part in policy.split('; ') if part.startswith('script-src '))
                self.assertIn("'unsafe-eval'", script)
                self.assertNotIn("'unsafe-inline'", script)
                self.assertIn("object-src 'none'", policy)
                self.assertIn("frame-ancestors 'none'", policy)

    def test_other_routes_and_admin_json_keep_strict_script_policy(self):
        for path, namespace, content_type in (
            ('/api/workspaces/', '', 'application/json'),
            ('/admin/', '', 'text/html'),
            ('/backend-tools/', '', 'text/html'),
            ('/backend/not-an-admin-view/', '', 'text/html'),
            ('/backend/autocomplete/', 'admin', 'application/json'),
        ):
            with self.subTest(path=path):
                response = self.response(path, namespace, content_type)
                self.assertNotIn("'unsafe-eval'", response['Content-Security-Policy'])

    def test_csp_overrides_and_existing_response_headers_are_preserved(self):
        with override_settings(CONTENT_SECURITY_POLICY={'connect-src': ["'self'", 'https://api.example.test']}):
            response = self.response('/backend/')
            self.assertIn('https://api.example.test', response['Content-Security-Policy'])
        request = RequestFactory().get('/backend/')
        request.resolver_match = SimpleNamespace(namespace='admin')
        response = SecurityHeadersMiddleware(lambda request: HttpResponse(
            '<html></html>', headers={'Content-Security-Policy': "default-src 'none'"},
        ))(request)
        self.assertEqual(response['Content-Security-Policy'], "default-src 'none'")

    def test_real_admin_login_response_has_compatible_csp(self):
        response = self.client.get('/backend/login/')
        self.assertEqual(response.status_code, 200)
        self.assertIn("'unsafe-eval'", response['Content-Security-Policy'])
