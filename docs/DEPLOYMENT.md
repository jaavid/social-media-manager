# استقرار و نگهداری

مسیر اصلی، [Compose](../docker-compose.yml) در ریشه است. `scripts/deploy_prod.sh` همین مسیر Compose را از سورس اجرا می‌کند و فقط پس از آماده‌شدن health endpoint، فرایندهای Supervisor، بررسی امنیت Django و قراردادهای provider موفق می‌شود. گزارش OAuth در این مسیر اطلاعاتی است، چون هر استقرار می‌تواند فقط بخشی از providerها را فعال کند. نمونه‌های `infra/` به تنظیم محیط شما نیاز دارند.

## اولین استقرار

1. `.env.example` را به `.env` کپی کنید؛ `SECRET_KEY`، `FIELD_ENCRYPTION_KEYS` و `POSTGRES_PASSWORD` واقعی و امن بگذارید.
2. `APP_URL=https://YOUR_DOMAIN`، `ALLOWED_HOSTS=YOUR_DOMAIN` و `DEBUG=False` تنظیم کنید. credentialها و callbackهای [اتصال حساب‌ها](CONNECT_ACCOUNTS.md) را در صورت نیاز وارد کنید.
3. پشت proxy با TLS اجرا کنید؛ bind پیش‌فرض `127.0.0.1:3000` است. cookieهای امن را فعال و forwarded protocol را درست تنظیم کنید؛ سپس redirect HTTPS را فعال کنید.
4. اجرا و بررسی:

```sh
docker compose pull
docker compose up -d
docker compose ps
curl -fsS http://localhost:3000/healthz
docker compose exec app supervisorctl status
docker compose exec app python manage.py check_platform_config
docker compose exec app python manage.py check_provider_conformance
docker compose exec app python manage.py check_oauth_readiness
docker compose exec app python manage.py check_deployment_runtime
docker compose exec app python manage.py createsuperuser
```

به‌جای ساخت حساب با رمز پیش‌فرض، رمز قوی را در prompt وارد کنید. در `/backend/` برای همان کاربر یک UserProfile بسازید یا پروفایل موجود را ویرایش کنید و نقش `superadmin` بدهید؛ حساب Django به‌تنهایی پروفایل مدیر محصول نمی‌سازد. `setup` را با مقادیر پیش‌فرض روی محیط واقعی اجرا نکنید؛ حساب دمو نسازید.

migrate و collectstatic هنگام شروع `app` خودکار اجرا می‌شوند. پنج فرایند Supervisor باید `RUNNING` باشند. حریم خصوصی، حذف داده، SMTP و providerهای موردنیاز را با حساب آزمایشی واقعی بررسی کنید.

## ارتقا

قبل از تغییر، بکاپ قابل‌بازیابی دیتابیس، media و کلیدهای رمزگذاری داشته باشید؛ نسخهٔ فعلی را ثبت کنید. برای انتشار قابل‌تکرار `SOCIAL_STATS_APP_IMAGE` را روی tag یا digest مشخص تنظیم کنید.

```sh
docker compose pull
docker compose up -d
docker compose exec app python manage.py check_platform_config
docker compose exec app python manage.py check_provider_conformance
docker compose exec app python manage.py check_deployment_runtime
docker compose exec app supervisorctl status
```

برای تغییر از سورس: `docker compose up -d --build`. پس از migration، بازگشت image به‌تنهایی تضمین بازگشت schema نیست؛ rollback را با بکاپ و سازگاری migration انجام دهید.

`check_deployment_runtime` همهٔ taskهای beat در تنظیمات، scheduleهای فعال دیتابیس و taskهای event/feature ثبت‌شده در نسخهٔ محلی را با پاسخ **تک‌تک workerها** مقایسه می‌کند؛ نبود worker یا task خروجی غیرصفر می‌دهد. برای الزام پاسخ worker مشخص، `--worker celery@HOST` را تکرار کنید؛ بدون این گزینه فقط workerهای پاسخ‌دهنده بررسی می‌شوند. `--timeout 10` مهلت پاسخ است. از `--local-only` فقط برای بررسی سورس در CI استفاده کنید، نه تأیید استقرار.

همین command مسیر واقعی `/api/egress/connectivity/?mode=oauth` را با operator موقت و بدون ذخیرهٔ کاربر/session یا credential، داخل فرایند Django اجرا می‌کند؛ این بررسی جای smoke شبکهٔ ingress را نمی‌گیرد. همهٔ OAuth providerهای گزارش موجود بررسی می‌شوند و فقط boolean تنظیم‌بودن چاپ می‌شود. تنظیم‌نبودن provider اختیاری خطا نیست؛ مثلاً `--require-oauth youtube --require-oauth linkedin` آن دو را الزامی می‌کند. این readiness حضور تنظیمات است، نه تأیید app review یا دسترسی واقعی API خارجی. تست `check_browser_session.py` در CI همان endpoint و منع دسترسی پس از logout را از ingress واقعی با operator آزمایشی پوشش می‌دهد.

متریک‌های task، صف و sync در [راهنمای پایش](OBSERVABILITY.md) آمده‌اند.

برای ارتقای tenant با migration `0076_organization_tenancy`، API و workerهای نویسندهٔ قدیمی را متوقف کنید، بکاپ بگیرید، migration را اجرا و سپس همهٔ API/workerها را با نسخهٔ جدید راه‌اندازی کنید. از deploy هم‌زمان نسخهٔ قدیم و جدید پرهیز کنید: فضای کاری جدید به FK سازمانِ غیر nullable نیاز دارد. روی دیتابیس بزرگ، زمان migration را در staging اندازه بگیرید؛ یک سازمان برای هر فضای کاری ساخته می‌شود. مالکیت مبهم قدیمی را بعداً با بررسی انسانی در ابزار مدیریتی اصلاح کنید؛ migration آن را حدس نمی‌زند. این migration برای جلوگیری از حذف مالکیت/سیاست سازمان برگشت مستقیم ندارد؛ rollback به بکاپ سازگار نیاز دارد.

## بکاپ

از ریشه؛ dump فقط PostgreSQL را پوشش می‌دهد:

```sh
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > backup.sql
```

volumeهای `media`، `postgres_data` و `redis_data` در Compose تعریف شده‌اند. بکاپ media و `.env`/کلیدها را جدا و امن، بیرون سرور نگه دارید؛ بازیابی را در محیط جدا آزمایش کنید. `docker compose down -v` داده‌ها را حذف می‌کند؛ برای restart استفاده نکنید.
`scripts/verify-backups.sh` فقط برای محیط AWS RDS/S3 است، نه بررسی بکاپ این Compose. ارسال خودکار هشدار به Sentry/Slack/PagerDuty در این پروژه راه‌اندازی نشده است.

## دسترسی فرایندهای کانتینر

image یکپارچه با `USER 999:999` شروع می‌شود؛ migrate، collectstatic، Supervisor، Nginx، Next، Daphne، worker و beat همگی همین UID/GID را دارند. Compose همهٔ capabilityها را حذف و `no-new-privileges` را فعال می‌کند. Nginx داخل کانتینر روی `8080` گوش می‌دهد؛ پورت میزبان همچنان `APP_PORT` (پیش‌فرض 3000) است. برای اجرای دستی image، mapping را `3000:8080` بگذارید.

مسیرهای قابل‌نوشتن: `media` و `staticfiles` در `/app/backend/`، `/app/frontend/.next/cache`، `/home/socialstats`، `/run/socialstats` (PID و socket محلی Supervisor) و `/var/cache/nginx` (فایل موقت upload/proxy). سورس و تنظیمات در اختیار root و فقط خواندنی برای فرایندها هستند. socket با mode `0600` ساخته می‌شود؛ `supervisorctl` از همان socket استفاده می‌کند. راه‌اندازی دیگر chown بازگشتی با root انجام نمی‌دهد.

volume جدید Docker مالکیت image را می‌گیرد. قبل از ارتقای volume موجود یا استفاده از bind mount، مالکیت media را به UID/GID `999:999` بدهید. برای volume موجود، در پنجرهٔ نگهداری پس از توقف app:

```sh
docker compose stop app
docker compose run --rm --no-deps --user 0:0 --entrypoint chown app -R 999:999 /app/backend/media
docker compose up -d app
```

این دستور فقط آماده‌سازی یک‌بارهٔ مالکیت است؛ سرویس عادی با root اجرا نمی‌شود. برای bind mount، همین مالکیت را روی مسیر media میزبان تنظیم کنید. مسیرهای نامناسب باعث توقف entrypoint با خطای واضح می‌شوند. stack اصلی PostgreSQL دارد؛ فایل SQLite در مسیر سورسِ فقط‌خواندنی برای این image مسیر استقرار پشتیبانی‌شده نیست.

## لاگ و ردیابی درخواست

Django و Celery روی stdout لاگ JSON می‌نویسند؛ `LOG_LEVEL=INFO` پیش‌فرض است. هر رویداد زمان UTC، level، logger، message و `request_id`/`task_id` دارد. پایان درخواست شامل method، path بدون query، status و duration است. `X-Request-ID` با ۱ تا ۶۴ حرف ASCII، عدد، خط تیره یا underscore پذیرفته می‌شود؛ ورودی نامعتبر با شناسهٔ جدید جایگزین می‌شود. Nginx همان شناسه را به upstream و پاسخ مرورگر می‌دهد و در access log JSON ثبت می‌کند. در درخواست مستقیم Django نیز همین قرارداد برقرار است.

انتشار Celery با `.delay()`، `.apply_async()`، `send_task` و retry شناسه را در header پیام منتقل می‌کند؛ jobهای زمان‌بندی‌شده شناسهٔ جدید می‌گیرند و jobهای فرزند همان شناسه را حفظ می‌کنند. رویدادهای `task_started`، `task_finished` و `task_failed` نام job، شناسه و نتیجهٔ اجرا را ثبت می‌کنند؛ args، kwargs و return value ثبت نمی‌شوند. context پس از درخواست/job حتی در خطا پاک می‌شود. این ردیابی برای HTTP و Celery است؛ WebSocket، سرویس خارجی و پردازش stream بعد از پایان middleware ردیابی توزیع‌شدهٔ جداگانه ندارند.

سیاست حذف اطلاعات حساس در formatter اعمال می‌شود: فیلدهای password، secret، token، Authorization، Cookie، API/private key، credential، signature، OAuth code/state، query و args/kwargs (با نادیده‌گرفتن case و punctuation) در ساختارهای تو‌در‌تو حذف می‌شوند. متن پیام و exception هم برای همین assignmentها، Bearer/Basic، JWT و شکل شناخته‌شدهٔ کلیدهای provider پاک می‌شود. query/fragment تمام URLها و credential داخل URL حذف می‌شود. traceback بدون locals، نام exception و frameها باقی می‌ماند؛ request object، header و body خام سریال نمی‌شود. access log Nginx هیچ query، Referer یا User-Agent ندارد؛ stderr خطاهای Nginx از همان formatter عبور می‌کند. لاگ داخلی Supervisor و startup Next قالب خودشان را دارند.

فیلتر، مجوز ثبت payload نیست: credential بدون نام/شکل شناخته‌شده و دادهٔ شخصی دلخواه قابل‌شناسایی قطعی نیستند. هنگام افزودن لاگ فقط شناسه‌ها، state عملیاتی و خطای لازم را ثبت کنید؛ payload، رمز و body خام را وارد لاگ نکنید. پاک‌سازی رویدادهای لاگ، دادهٔ دیتابیس یا نتیجهٔ ذخیره‌شدهٔ Celery را تغییر نمی‌دهد.

بررسی محلی همان قراردادهای CI (پس از آماده‌شدن stack، پیش از seed):

```sh
python3 scripts/check_observability_stack.py http://localhost:3000
docker compose exec -T app python - < scripts/check_runtime_privileges.py
```

### Existing PostgreSQL volume during historical upgrades

The unified stack's canonical key is `postgres_data`. Older Compose revisions used
`pgdata`; changing a project-scoped key creates a different volume rather than
moving data. Do not rename the current key blindly or run `down -v`.

Before an in-place upgrade, the operator must identify the actual PostgreSQL
container mount and Compose project name (read-only `docker inspect`), record the
PostgreSQL major version, take a consistent backup with writes stopped and verify
an isolated restore. If the verified existing volume has another name, use a
local Compose override mapping the existing name explicitly:

```yaml
volumes:
  postgres_data:
    external: true
    name: <verified-existing-volume-name>
```

Review `docker compose config` with that override before starting the upgraded
stack. Keep the old volume and backup through application upgrade/rollback
verification. This does not migrate incompatible PostgreSQL major versions or
prove which volume a real deployment uses. Deployment-specific mount, backup and
restore evidence is required; this audit performs no production volume action.

For forwarded headers, the default `APP_BIND=127.0.0.1` expects a trusted outer
proxy. The Arvan origin example overwrites the forwarded scheme/client IP and
requires a firewall limiting origin access to trusted CDN/proxy ingress. Publishing
`APP_BIND=0.0.0.0` without that perimeter does not establish proxy trust. Confirm
the deployed bind/firewall/TLS path before enabling proxy IP trust; application
opt-out strips the forwarded-IP headers consumed by legacy security readers.
