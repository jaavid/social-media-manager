"""Exercise the emitted log boundary and actual request/task context lifetime."""
import asyncio
from concurrent.futures import ThreadPoolExecutor
from io import StringIO
import json
import logging
from unittest.mock import patch

from celery import current_app
from django.http import HttpResponse
from django.test import AsyncClient, RequestFactory, SimpleTestCase, override_settings
from django.urls import path

from social_stats.observability import (
    ProductionJSONFormatter, REDACTED, redact, request_id_context, task_id_context,
)
from social_stats.security.middleware import RequestIDMiddleware
from social_stats.task_observability import (
    CorrelatedTask, configure_worker_logging, propagate_request_id,
)


async def async_observed_view(request):
    await asyncio.sleep(0)
    return HttpResponse(request_id_context.get())


urlpatterns = [path('async-context/', async_observed_view)]


class LogPolicyTests(SimpleTestCase):
    def setUp(self):
        self.stream = StringIO()
        self.handler = logging.StreamHandler(self.stream)
        self.handler.setFormatter(ProductionJSONFormatter())
        self.logger = logging.getLogger('observability.regression')
        self.logger.addHandler(self.handler)
        self.logger.setLevel(logging.INFO)
        self.addCleanup(self.logger.removeHandler, self.handler)

    def event(self):
        return json.loads(self.stream.getvalue().splitlines()[-1])

    def test_recursive_fields_and_case_variants_are_redacted_without_mutation(self):
        fields = {
            'Authorization': 'Bearer auth-private',
            'nested': [{'access_token': 'access-private', 'Refresh-Token': 'refresh-private',
                        'CLIENT_SECRET': 'secret-private', 'Api-Key': 'key-private',
                        'password': 'password-private', 'Cookie': 'cookie-private',
                        'code': 'code-private', 'state': 'state-private'}],
            'query_string': 'unrecognized=private', 'args': ['private'],
            'workspace_id': 42, 'provider': 'google',
        }
        self.logger.info('provider_error', extra={'payload': fields})
        event = self.event()
        self.assertEqual(event['fields']['payload']['workspace_id'], 42)
        self.assertEqual(event['fields']['payload']['provider'], 'google')
        self.assertEqual(event['fields']['payload']['nested'][0]['access_token'], REDACTED)
        self.assertNotIn('private', self.stream.getvalue())
        self.assertEqual(fields['Authorization'], 'Bearer auth-private')

    def test_interpolation_exception_stack_and_request_object_are_safe(self):
        try:
            raise ValueError('GET https://provider.invalid/callback?code=url-private&unknown=unknown-private '
                             'password=exception-private Bearer bearer-private')
        except ValueError:
            self.logger.exception('provider failed: %s',
                                  'https://user:credential-private@provider.invalid/path?foo=query-private',
                                  extra={'request': RequestFactory().get('/?code=request-private')},
                                  stack_info=True)
        output = self.stream.getvalue()
        self.assertNotIn('private', output)
        event = self.event()
        self.assertIn('ValueError', event['exception'])
        self.assertIn('test_interpolation_exception', event['exception'])
        self.assertIn('provider.invalid/path', event['message'])
        self.assertNotIn('request', event.get('fields', {}))
        self.assertIn('stack', event)

    def test_relative_query_and_provider_token_shapes(self):
        for value in (
            '/api/oauth/callback/?unrecognized=query-private',
            'https://api.telegram.org/bot12345:bot-private/sendMessage',
            'query_string=unknown-private',
            'Cookie: sessionid=cookie-private; custom=second-private',
            'access_token="quoted private value"',
            "{'client_secret': 'quoted private value'}",
            'Bearer bearer-private', 'Basic YmFzaWMtcHJpdmF0ZQ==',
            'sk-ant-provider-private', 'ghp_providerprivate',
            # Assemble a deliberately fake JWT so secret scanners do not treat
            # a committed token-shaped literal as an actual credential.
            '.'.join(('eyJhbGciOiJIUzI1NiJ9', 'eyJzZWNyZXQiOiJwcml2YXRlIn0', 'signatureprivate')),
        ):
            with self.subTest(value=value):
                cleaned = redact(value)
                self.assertNotIn('private', cleaned)
                self.assertNotIn('YmFzaWM', cleaned)

    def test_django_response_logs_recover_id_after_middleware_context_exits(self):
        request = RequestFactory().get('/')
        request.id = 'finished-request'
        self.logger.warning('Not Found', extra={'request': request})
        self.assertEqual(self.event()['request_id'], 'finished-request')
        self.assertNotIn('request', self.event().get('fields', {}))

    def test_json_is_one_line_even_with_log_injection(self):
        self.logger.info('first\nsecond\rthird', extra={'provider': 'x"\n{"password":"private"}'})
        self.assertEqual(len(self.stream.getvalue().splitlines()), 1)
        self.assertEqual(self.event()['level'], 'INFO')


class RequestCorrelationTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()

    def test_id_is_shared_by_view_completion_log_and_response(self):
        def view(request):
            self.assertEqual(request.id, 'upstream-123')
            self.assertEqual(request_id_context.get(), request.id)
            return HttpResponse(status=201)
        with self.assertLogs('social_stats.security.middleware', level='INFO') as logs:
            response = RequestIDMiddleware(view)(
                self.factory.get('/api/example/?token=never-log-me', HTTP_X_REQUEST_ID='upstream-123')
            )
        self.assertEqual(response['X-Request-ID'], 'upstream-123')
        record = logs.records[0]
        self.assertEqual(record.status_code, 201)
        self.assertEqual(record.path, '/api/example/')
        self.assertNotIn('never-log-me', ProductionJSONFormatter().format(record))
        self.assertIsNone(request_id_context.get())

    def test_invalid_ids_are_replaced_and_never_truncated_into_trusted_ids(self):
        for incoming in ('a' * 65, 'injection\r\nheader', 'شناسه', '', 'x.y'):
            response = RequestIDMiddleware(lambda r: HttpResponse())(
                self.factory.get('/', HTTP_X_REQUEST_ID=incoming)
            )
            self.assertRegex(response['X-Request-ID'], r'^[a-f0-9]{32}$')

    def test_exception_resets_context_and_keeps_outer_context(self):
        def view(request):
            raise RuntimeError('failure')
        outer = request_id_context.set('outer')
        try:
            with self.assertRaises(RuntimeError):
                RequestIDMiddleware(view)(self.factory.get('/'))
            self.assertEqual(request_id_context.get(), 'outer')
        finally:
            request_id_context.reset(outer)

    def test_concurrent_requests_do_not_share_context(self):
        def execute(value):
            def view(request):
                self.assertEqual(request_id_context.get(), value)
                return HttpResponse()
            response = RequestIDMiddleware(view)(self.factory.get('/', HTTP_X_REQUEST_ID=value))
            self.assertIsNone(request_id_context.get())
            return response['X-Request-ID']
        with ThreadPoolExecutor(max_workers=4) as pool:
            self.assertEqual(list(pool.map(execute, ['one', 'two', 'three', 'four'])),
                             ['one', 'two', 'three', 'four'])

    @override_settings(ROOT_URLCONF=__name__)
    async def test_asgi_concurrency_keeps_each_request_context(self):
        async def execute(value):
            response = await AsyncClient().get('/async-context/', headers={'x-request-id': value})
            self.assertEqual(response.content.decode(), value)
            self.assertEqual(response['X-Request-ID'], value)
        await asyncio.gather(*(execute(value) for value in ('async-one', 'async-two', 'async-three')))
        self.assertIsNone(request_id_context.get())

    def test_full_stack_error_response_retains_id(self):
        response = self.client.get('/api/does-not-exist/', HTTP_X_REQUEST_ID='full-stack')
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response['X-Request-ID'], 'full-stack')


class TaskCorrelationTests(SimpleTestCase):
    def test_publish_inherits_request_and_validates_untrusted_headers(self):
        token = request_id_context.set('web-request')
        try:
            headers = {'task': 'example', 'request_id': 'old'}
            propagate_request_id(headers=headers)
            self.assertEqual(headers['request_id'], 'web-request')
            self.assertEqual(headers['task'], 'example')
        finally:
            request_id_context.reset(token)
        headers = {'request_id': 'bad\nvalue'}
        propagate_request_id(headers=headers)
        self.assertRegex(headers['request_id'], r'^[a-f0-9]{32}$')

    @override_settings(CELERY_TASK_ALWAYS_EAGER=True, CELERY_TASK_EAGER_PROPAGATES=True)
    def test_eager_child_tasks_and_failure_restore_parent_context(self):
        @current_app.task(name='tests.observability_child')
        def child():
            return (request_id_context.get(), task_id_context.get())

        @current_app.task(name='tests.observability_parent')
        def parent():
            parent_id = task_id_context.get()
            result = child.delay().get(disable_sync_subtasks=False)
            self.assertEqual(task_id_context.get(), parent_id)
            return result

        @current_app.task(name='tests.observability_failed')
        def failed():
            raise ValueError('token=failure-private')

        self.assertIsInstance(child, CorrelatedTask)
        token = request_id_context.set('web-parent')
        try:
            with self.assertLogs('social_stats.tasks.lifecycle', level='INFO') as logs:
                # disable_sync_subtasks=False is needed for intentional eager nesting.
                result = parent.delay().get(disable_sync_subtasks=False)
            self.assertEqual(result[0], 'web-parent')
            self.assertIsNotNone(result[1])
            self.assertEqual(len(logs.records), 4)
            self.assertEqual(request_id_context.get(), 'web-parent')
            self.assertIsNone(task_id_context.get())
            with self.assertRaises(ValueError):
                failed.delay()
            self.assertEqual(request_id_context.get(), 'web-parent')
            self.assertIsNone(task_id_context.get())
        finally:
            request_id_context.reset(token)

    def test_worker_retains_the_production_output_policy(self):
        with patch('social_stats.task_observability.dictConfig') as configure:
            configure_worker_logging()
        self.assertIn('production', configure.call_args.args[0]['formatters'])
