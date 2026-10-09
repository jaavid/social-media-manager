"""Environment-only configuration for private S3-compatible media storage."""
from django.core.exceptions import ImproperlyConfigured


def media_storage(environ):
    backend = environ.get('MEDIA_STORAGE_BACKEND', 'local').lower()
    if backend == 'local':
        return {'BACKEND': 'django.core.files.storage.FileSystemStorage'}
    if backend != 's3':
        raise ImproperlyConfigured('MEDIA_STORAGE_BACKEND must be local or s3')
    required = ('S3_BUCKET_NAME', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY')
    missing = [key for key in required if not environ.get(key)]
    if missing:
        raise ImproperlyConfigured('Missing object storage settings: ' + ', '.join(missing))
    addressing = environ.get('S3_ADDRESSING_STYLE', 'path')
    if addressing not in ('path', 'virtual', 'auto'):
        raise ImproperlyConfigured('Invalid S3_ADDRESSING_STYLE')
    try:
        expires = int(environ.get('S3_URL_EXPIRE_SECONDS', '3600'))
        if not 60 <= expires <= 604800:
            raise ValueError
    except ValueError as exc:
        raise ImproperlyConfigured('S3_URL_EXPIRE_SECONDS must be 60..604800') from exc
    options = {
        'bucket_name': environ['S3_BUCKET_NAME'],
        'access_key': environ['S3_ACCESS_KEY_ID'],
        'secret_key': environ['S3_SECRET_ACCESS_KEY'],
        'region_name': environ.get('S3_REGION_NAME', 'us-east-1'),
        'endpoint_url': environ.get('S3_ENDPOINT_URL') or None,
        'addressing_style': addressing,
        'signature_version': 's3v4',
        'default_acl': None,
        'querystring_auth': True,
        'querystring_expire': expires,
        'file_overwrite': False,
        'location': environ.get('S3_KEY_PREFIX', 'media').strip('/'),
    }
    encryption = environ.get('S3_SERVER_SIDE_ENCRYPTION', '')
    if encryption:
        if encryption not in ('AES256', 'aws:kms'):
            raise ImproperlyConfigured('Invalid S3_SERVER_SIDE_ENCRYPTION')
        options['object_parameters'] = {'ServerSideEncryption': encryption}
        if environ.get('S3_KMS_KEY_ID'):
            options['object_parameters']['SSEKMSKeyId'] = environ['S3_KMS_KEY_ID']
    return {'BACKEND': 'storages.backends.s3.S3Storage', 'OPTIONS': options}
