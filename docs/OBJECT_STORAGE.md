# Object storage for uploaded files

The Docker app already reads the root `.env` through `env_file`; web, Celery and
scheduled jobs share this configuration in the unified container. Rebuild the
image for the new dependency, then apply the generated migration through the
normal deployment process. Static assets still use WhiteNoise.

Copy these values into the root `.env` (or `backend/.env` outside Docker):

```dotenv
MEDIA_STORAGE_BACKEND=s3
S3_ENDPOINT_URL=https://s3.example.com
S3_BUCKET_NAME=ravinta
S3_ACCESS_KEY_ID=replace-me
S3_SECRET_ACCESS_KEY=replace-me
S3_REGION_NAME=us-east-1
S3_ADDRESSING_STYLE=path
S3_KEY_PREFIX=media
S3_URL_EXPIRE_SECONDS=3600
# Optional; leave empty if the provider does not support server-side encryption
S3_SERVER_SIDE_ENCRYPTION=
S3_KMS_KEY_ID=
```

Use the provider's endpoint and region. For AWS S3, leave endpoint empty and use
its bucket region; `virtual` addressing is also supported. The endpoint must be
reachable by both the server and social platforms fetching signed URLs. Keep TLS
certificate validation enabled. No public bucket or ACL is required: URLs are
signed, expire, and act as temporary bearer access. Never persist signed URLs as
permanent object identifiers. The configured key prefix is prepended by storage.
Missing S3 credentials fail startup instead of silently writing to disk.

Create the bucket first. Give the service identity ListBucket on this bucket and
GetObject, PutObject, DeleteObject on its media prefix; encrypted AWS KMS objects
also need the corresponding KMS permissions. Bucket policies must block public
access. Browser-direct upload is not used, so upload CORS is not required.

## File layout and backend library

New media keys use:

```
media/organizations/<id>/workspaces/<id>/platforms/<platform>/accounts/<id>/files/<YYYY>/<MM>/<uuid>.<ext>
media/organizations/<id>/workspaces/<id>/shared/files/<YYYY>/<MM>/<uuid>.<ext>
```

Thumbnails use `thumbnails` instead of `files`. The composer upload endpoint
accepts optional `social_account_id`; it must belong to the authorized workspace.
Assets shared across multiple accounts stay in `shared`; publishing does not
copy them into every destination. Folder labels are library metadata rather than
untrusted path components. Branding belongs to its organization/workspace;
avatars and private export ZIPs use `users/<id>/...`.

Django Admin → فایل‌های رسانه‌ای lists application media with organization,
workspace, platform, account and MIME filters, size and storage file links. This
is a read-only inspection library using existing admin permissions; uploads and
changes use application authorization and quota checks. Logos/avatars remain
visible on their existing model admin pages. This is not a bucket explorer:
objects uploaded outside the application have no database record. django-filer
is not installed; the existing MediaAsset library retains ownership and quotas.

## Existing files and rollout

Changing backend does not move existing bytes. Before switching a populated
installation, back up the database and media volume, pause uploads/workers, and
copy the entire media directory into the bucket under `S3_KEY_PREFIX`, preserving
relative paths exactly. Old database paths still work; new paths use the layout
above. Verify object counts, sizes and representative downloads before switching.
Do not remove the volume until the copy and rollback plan are verified. Old
absolute-path privacy exports remain local until they expire or are separately
migrated with their stored paths updated.

After rebuilding/restarting, upload an image and a video; check the bucket key,
thumbnail, authenticated library, signed download and a real provider publish.
These require deployment credentials and are not proven by offline unit tests.
No bucket credentials are committed. Set `MEDIA_STORAGE_BACKEND=local` to use
local storage for development; rollback requires retaining/copying any objects
created since the switch.

Object storage moves persistent bytes off the server; video processing and large
multipart uploads can still use temporary disk. Set bucket lifecycle rules for
abandoned multipart uploads, monitoring/budget alerts and version retention to
match your recovery policy. Do not automatically expire active media objects.
Deleting database rows does not currently purge media objects: explicit retention
and reference-aware garbage collection remain operational work, particularly
for files reused by scheduled publications.
