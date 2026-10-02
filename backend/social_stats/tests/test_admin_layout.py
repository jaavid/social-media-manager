from django.contrib import admin
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase

from social_stats.models import Client, PlatformCredential


class AdminLayoutTests(TestCase):
    def setUp(self):
        self.request = RequestFactory().get('/admin/')
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
