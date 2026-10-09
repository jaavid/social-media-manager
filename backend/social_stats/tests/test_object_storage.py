"""Storage config and tenant/account path contracts (no network requests)."""
from types import SimpleNamespace
from unittest.mock import patch
from django.test import SimpleTestCase, TestCase
from django.core.exceptions import ImproperlyConfigured
from django.core.files.uploadedfile import SimpleUploadedFile
from dashboard.media_storage import media_storage
from social_stats.upload_paths import media_path
from social_stats.models import Client, SocialAccount
from social_stats.media_service import upload_media, presigned_url


class StorageConfigurationTests(SimpleTestCase):
    def test_local_and_fail_closed(self):
        self.assertIn('FileSystemStorage', media_storage({})['BACKEND'])
        with self.assertRaises(ImproperlyConfigured):
            media_storage({'MEDIA_STORAGE_BACKEND': 's3'})

    def test_private_endpoint_configuration(self):
        config = media_storage({'MEDIA_STORAGE_BACKEND': 's3', 'S3_BUCKET_NAME': 'test',
                                'S3_ACCESS_KEY_ID': 'test', 'S3_SECRET_ACCESS_KEY': 'test',
                                'S3_ENDPOINT_URL': 'https://objects.example.test'})
        self.assertTrue(config['OPTIONS']['querystring_auth'])
        self.assertIsNone(config['OPTIONS']['default_acl'])
        self.assertFalse(config['OPTIONS']['file_overwrite'])
        from storages.backends.s3 import S3Storage
        storage = S3Storage(**config['OPTIONS'])
        asset = SimpleNamespace(file=SimpleNamespace(storage=storage, name='organizations/1/test.png'))
        url = presigned_url(asset, expires=120)
        self.assertIn('objects.example.test/test/media/organizations/1/test.png', url)
        self.assertIn('X-Amz-Expires=120', url)

    def test_paths(self):
        asset = SimpleNamespace(client=SimpleNamespace(pk=2, organization_id=1), social_account=None)
        path = media_path(asset, '../../original.png')
        self.assertTrue(path.startswith('organizations/1/workspaces/2/shared/files/'))
        self.assertNotIn('..', path)
        asset.social_account = SimpleNamespace(pk=3, platform='telegram')
        self.assertIn('/platforms/telegram/accounts/3/files/', media_path(asset, 'a.png'))


class StorageIsolationTests(TestCase):
    def test_cross_workspace_account_rejected_before_upload(self):
        first = Client.objects.create(name='A', company='A', email='a@storage.test')
        other = Client.objects.create(name='B', company='B', email='b@storage.test')
        account = SocialAccount.objects.create(client=other, platform='telegram', external_id='1')
        with patch('social_stats.media_service._upload_media') as write:
            with self.assertRaises(SocialAccount.DoesNotExist):
                upload_media(SimpleUploadedFile('a.txt', b'a'), first.pk, social_account_id=account.pk)
            write.assert_not_called()

    def test_account_upload_and_thumbnail_share_scope(self):
        import io
        from tempfile import TemporaryDirectory
        from PIL import Image
        from django.test import override_settings
        workspace = Client.objects.create(name='Image', company='Image', email='image@storage.test')
        account = SocialAccount.objects.create(client=workspace, platform='telegram', external_id='2')
        data = io.BytesIO()
        Image.new('RGB', (10, 20)).save(data, format='PNG')
        with TemporaryDirectory() as directory, override_settings(MEDIA_ROOT=directory):
            asset = upload_media(SimpleUploadedFile('image.png', data.getvalue(), content_type='image/png'),
                                 workspace.pk, social_account_id=account.pk)
            scope = f'organizations/{workspace.organization_id}/workspaces/{workspace.pk}/platforms/telegram/accounts/{account.pk}/'
            self.assertTrue(asset.file.name.startswith(scope + 'files/'))
            self.assertTrue(asset.thumbnail.name.startswith(scope + 'thumbnails/'))
            self.assertEqual((asset.width, asset.height), (10, 20))
            self.assertTrue(asset.file.storage.exists(asset.file.name))
