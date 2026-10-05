from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.db.migrations.loader import MigrationLoader
from django.http import HttpResponse
from django.test import RequestFactory, SimpleTestCase, TestCase, override_settings
from django.utils import translation

from social_stats.admin_locale import BackendAdminLocaleMiddleware
from social_stats.models import (
    Client, Conversation, Message, PlatformCredential,
    PlatformPublishLog, QueuedItem, UnifiedPost, UnifiedReview,
)


@override_settings(STORAGES={
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
})
class AdminLayoutTests(TestCase):
    def setUp(self):
        self.request = RequestFactory().get('/backend/')
        self.request.user = get_user_model()(is_superuser=True, is_staff=True)

    def test_grouped_forms_preserve_all_fields_once(self):
        for model in (Client, PlatformCredential):
            model_admin = admin.site._registry[model]
            fieldsets = model_admin.get_fieldsets(self.request)
            fields = [field for _, options in fieldsets for field in options['fields']]
            self.assertCountEqual(fields, model_admin.get_fields(self.request))
            self.assertEqual(len(fields), len(set(fields)))

    def test_admin_widgets_and_media(self):
        model_admin = admin.site._registry[Client]
        form = model_admin.get_form(self.request)
        self.assertEqual(form.base_fields['brand_description'].widget.attrs['rows'], 4)
        self.assertIn('admin-json', form.base_fields['brand_assets'].widget.attrs['class'])
        self.assertIn('social_stats/admin/forms.css', model_admin.media._css['all'])


class BackendAdminLocaleTests(SimpleTestCase):
    def test_only_backend_routes_use_persian_and_locale_is_restored(self):
        def response(request):
            return HttpResponse(translation.get_language())

        middleware = BackendAdminLocaleMiddleware(response)
        with translation.override('en-us'):
            for path in ('/backend', '/backend/', '/backend/login/'):
                request = RequestFactory().get(path)
                self.assertEqual(middleware(request).content, b'fa')
                self.assertEqual(request.LANGUAGE_CODE, 'fa')
                self.assertEqual(translation.get_language(), 'en-us')
            for path in ('/api/workspaces/', '/admin/', '/backend-tools/'):
                self.assertEqual(
                    middleware(RequestFactory().get(path)).content, b'en-us'
                )

    def test_label_migration_preserves_schema_and_stored_choice_values(self):
        loader = MigrationLoader(None)
        before = loader.project_state([
            ('social_stats', '0073_queueditem_requested_by_unifiedpost_publish_action')
        ])
        after = loader.project_state([('social_stats', '0074_persian_admin_labels')])
        self.assertEqual(set(before.models), set(after.models))
        for key, old_model in before.models.items():
            new_model = after.models[key]
            self.assertEqual(set(old_model.fields), set(new_model.fields))
            for name, old_field in old_model.fields.items():
                with self.subTest(model=key, field=name):
                    old_name, old_path, old_args, old_kwargs = old_field.deconstruct()
                    new_name, new_path, new_args, new_kwargs = new_model.fields[name].deconstruct()
                    for kwargs in (old_kwargs, new_kwargs):
                        kwargs.pop('verbose_name', None)
                        kwargs.pop('help_text', None)
                        if 'choices' in kwargs:
                            kwargs['choices'] = [value for value, _ in kwargs['choices']]
                    self.assertEqual(
                        (old_name, old_path, old_args, old_kwargs),
                        (new_name, new_path, new_args, new_kwargs),
                    )


@override_settings(STORAGES={
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
})
class PersianAdminTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_superuser(
            username='backend-admin', password='test'
        )
        self.client.force_login(self.user)
        self.workspace = Client.objects.create(
            name='مدیر', company='کسب‌وکار آزمایشی', email='admin@example.test'
        )

    def test_admin_login_and_forms_are_persian_and_rtl(self):
        self.client.logout()
        login = self.client.get('/backend/login/')
        self.assertContains(login, 'lang="fa"')
        self.assertContains(login, 'dir="rtl"')
        self.client.force_login(self.user)
        response = self.client.get(
            f'/backend/social_stats/client/{self.workspace.pk}/change/'
        )
        self.assertContains(response, 'فضای کاری و اطلاعات تماس')
        self.assertContains(response, 'نام کسب‌وکار')
        self.assertContains(response, 'ربات و کنترل پردازش')
        self.assertContains(response, 'متعلق به آژانس')

    def test_registered_models_and_fields_have_explicit_persian_labels(self):
        for model in admin.site._registry:
            if model._meta.app_label != 'social_stats':
                continue
            with self.subTest(model=model.__name__):
                self.assertRegex(str(model._meta.verbose_name), r'[\u0600-\u06ff]')
                self.assertRegex(str(model._meta.verbose_name_plural), r'[\u0600-\u06ff]')
                for field in model._meta.get_fields():
                    if field.auto_created:
                        continue
                    self.assertRegex(str(field.verbose_name), r'[\u0600-\u06ff]')

    def test_service_owned_records_cannot_be_changed_even_by_superuser(self):
        post = UnifiedPost.objects.create(
            client=self.workspace, title='پست آزمایشی', status='pending_approval'
        )
        response = self.client.get(f'/backend/social_stats/unifiedpost/{post.pk}/change/')
        self.assertContains(response, 'در انتظار تأیید')
        self.assertNotContains(response, 'name="_save"')
        response = self.client.post(
            f'/backend/social_stats/unifiedpost/{post.pk}/change/',
            {'status': 'published'},
        )
        self.assertEqual(response.status_code, 403)
        post.refresh_from_db()
        self.assertEqual(post.status, 'pending_approval')
        request = RequestFactory().get('/backend/')
        request.user = self.user
        for model in (UnifiedPost, PlatformPublishLog, QueuedItem, Message, UnifiedReview):
            model_admin = admin.site._registry[model]
            with self.subTest(model=model.__name__):
                self.assertTrue(model_admin.has_view_permission(request))
                self.assertFalse(model_admin.has_add_permission(request))
                self.assertFalse(model_admin.has_change_permission(request))
                self.assertFalse(model_admin.has_delete_permission(request))
                self.assertEqual(model_admin.get_actions(request), {})

    def test_staff_requires_model_permissions(self):
        staff = get_user_model().objects.create_user(
            username='backend-staff', password='test', is_staff=True
        )
        self.client.force_login(staff)
        path = '/backend/social_stats/unifiedpost/'
        self.assertEqual(self.client.get(path).status_code, 403)
        staff.user_permissions.add(Permission.objects.get(
            content_type__app_label='social_stats', codename='view_unifiedpost'
        ))
        self.assertEqual(self.client.get(path).status_code, 200)
        self.assertEqual(self.client.get('/backend/social_stats/mediaasset/').status_code, 403)

    def test_workspace_setting_can_be_managed_from_backend(self):
        model_admin = admin.site._registry[Client]
        request = RequestFactory().get('/backend/')
        request.user = self.user
        form_class = model_admin.get_form(request, self.workspace)
        # Bind the complete existing form, changing a normal operational setting.
        form = form_class(instance=self.workspace)
        data = {name: form[name].value() for name in form.fields}
        data = {name: value for name, value in data.items() if value is not None}
        data['bot_enabled'] = False
        bound = form_class(data=data, instance=self.workspace)
        self.assertTrue(bound.is_valid(), bound.errors)
        bound.save()
        self.workspace.refresh_from_db()
        self.assertFalse(self.workspace.bot_enabled)

    def test_conversation_only_exposes_triage_fields_for_editing(self):
        request = RequestFactory().get('/backend/')
        request.user = self.user
        model_admin = admin.site._registry[Conversation]
        form = model_admin.get_form(request)
        self.assertEqual(
            set(form.base_fields),
            {'assigned_to', 'is_starred', 'is_archived', 'is_resolved', 'tags'},
        )
        self.assertFalse(model_admin.has_add_permission(request))
        self.assertFalse(model_admin.has_delete_permission(request))


@override_settings(STORAGES={
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
})
class UnfoldAdminTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_superuser(
            username='unfold-admin', password='test'
        )
        self.client.force_login(self.user)

    def test_backend_index_uses_unfold_assets_and_persian_layout(self):
        response = self.client.get('/backend/')
        self.assertContains(response, 'unfold/css/styles.css')
        self.assertContains(response, 'dir="rtl"')
        self.assertContains(response, 'مدیریت سامانه شبکه‌های اجتماعی')

    def test_auth_change_forms_and_password_form_render(self):
        from django.contrib.auth.models import Group

        group = Group.objects.create(name='Operators')
        for path in (
            f'/backend/auth/user/{self.user.pk}/change/',
            '/backend/auth/user/add/',
            f'/backend/auth/user/{self.user.pk}/password/',
            f'/backend/auth/group/{group.pk}/change/',
        ):
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200)
                self.assertContains(response, 'unfold/css/styles.css')

    def test_sidebar_uses_model_permissions(self):
        from social_stats.admin.navigation import sidebar_navigation

        staff = get_user_model().objects.create_user(
            username='unfold-staff', password='test', is_staff=True
        )
        request = RequestFactory().get('/backend/')
        request.user = staff
        self.assertEqual(sidebar_navigation(request), [])
        staff.user_permissions.add(Permission.objects.get(
            content_type__app_label='social_stats', codename='view_unifiedpost'
        ))
        # Django caches permissions on the user instance. Re-read after the grant.
        request.user = get_user_model().objects.get(pk=staff.pk)
        groups = sidebar_navigation(request)
        self.assertEqual(len(groups), 1)
        self.assertEqual(
            [item['link'] for group in groups for item in group['items']],
            ['/backend/social_stats/unifiedpost/'],
        )

    def test_vendor_admin_pages_render_with_unfold_and_keep_permissions(self):
        for app, models in (
            ('django_celery_beat', ('periodictask', 'intervalschedule', 'crontabschedule', 'solarschedule', 'clockedschedule')),
            ('axes', ('accessattempt', 'accesslog', 'accessfailurelog')),
            ('token_blacklist', ('outstandingtoken', 'blacklistedtoken')),
        ):
            for model in models:
                with self.subTest(app=app, model=model):
                    response = self.client.get(f'/backend/{app}/{model}/')
                    self.assertContains(response, 'unfold/css/styles.css')
        for model in ('periodictask', 'intervalschedule', 'crontabschedule', 'solarschedule', 'clockedschedule'):
            with self.subTest(add=model):
                response = self.client.get(f'/backend/django_celery_beat/{model}/add/')
                self.assertContains(response, 'unfold/css/styles.css')
                if model == 'periodictask':
                    self.assertContains(response, 'social_stats/admin/periodic_task.js')
                    self.assertContains(response, 'id="crontab-description"')
                    self.assertNotContains(response, 'JSON.parse(')
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
        request = RequestFactory().get('/backend/')
        request.user = self.user
        token_admin = admin.site._registry[OutstandingToken]
        self.assertFalse(token_admin.has_add_permission(request))
        request.method = 'POST'
        self.assertFalse(token_admin.has_change_permission(request))
        self.assertFalse(token_admin.has_delete_permission(request))
        staff = get_user_model().objects.create_user(username='integration-staff', is_staff=True)
        self.client.force_login(staff)
        self.assertEqual(self.client.get('/backend/django_celery_beat/periodictask/').status_code, 403)
        self.assertEqual(self.client.get('/backend/token_blacklist/outstandingtoken/').status_code, 403)

    def test_workspace_filter_does_not_expand_queryset(self):
        first = Client.objects.create(name='First workspace', email='first@example.test')
        second = Client.objects.create(name='Second workspace', email='second@example.test')
        UnifiedPost.objects.create(client=first, content='First post')
        UnifiedPost.objects.create(client=second, content='Second post')
        response = self.client.get('/backend/social_stats/unifiedpost/', {'client__id__exact': first.pk})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(list(response.context['cl'].queryset.values_list('client_id', flat=True)), [first.pk])

    def test_json_widget_preserves_invalid_input_for_form_validation(self):
        from social_stats.admin.widgets import AdminJSONWidget
        widget = AdminJSONWidget()
        self.assertEqual(widget.format_value('{invalid'), '{invalid')
        self.assertEqual(widget.format_value('{"name": "فارسی"}'), '{\n  "name": "فارسی"\n}')
        self.assertEqual(widget.format_value('"فارسی"'), '"فارسی"')
        self.assertEqual(widget.format_value('null'), 'null')
