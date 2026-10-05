# استقرار و نگهداری

مسیر اصلی، [Compose](../docker-compose.yml) در ریشه است. `scripts/deploy_prod.sh` همین مسیر Compose را از سورس اجرا می‌کند. نمونه‌های `infra/` به تنظیم محیط شما نیاز دارند.

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
docker compose exec app supervisorctl status
```

برای تغییر از سورس: `docker compose up -d --build`. پس از migration، بازگشت image به‌تنهایی تضمین بازگشت schema نیست؛ rollback را با بکاپ و سازگاری migration انجام دهید.

برای ارتقای tenant با migration `0076_organization_tenancy`، API و workerهای نویسندهٔ قدیمی را متوقف کنید، بکاپ بگیرید، migration را اجرا و سپس همهٔ API/workerها را با نسخهٔ جدید راه‌اندازی کنید. از deploy هم‌زمان نسخهٔ قدیم و جدید پرهیز کنید: فضای کاری جدید به FK سازمانِ غیر nullable نیاز دارد. روی دیتابیس بزرگ، زمان migration را در staging اندازه بگیرید؛ یک سازمان برای هر فضای کاری ساخته می‌شود. مالکیت مبهم قدیمی را بعداً با بررسی انسانی در ابزار مدیریتی اصلاح کنید؛ migration آن را حدس نمی‌زند. این migration برای جلوگیری از حذف مالکیت/سیاست سازمان برگشت مستقیم ندارد؛ rollback به بکاپ سازگار نیاز دارد.

## بکاپ

از ریشه؛ dump فقط PostgreSQL را پوشش می‌دهد:

```sh
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > backup.sql
```

volumeهای `media`، `postgres_data` و `redis_data` در Compose تعریف شده‌اند. بکاپ media و `.env`/کلیدها را جدا و امن، بیرون سرور نگه دارید؛ بازیابی را در محیط جدا آزمایش کنید. `docker compose down -v` داده‌ها را حذف می‌کند؛ برای restart استفاده نکنید.
`scripts/verify-backups.sh` فقط برای محیط AWS RDS/S3 است، نه بررسی بکاپ این Compose. ارسال خودکار هشدار به Sentry/Slack/PagerDuty در این پروژه راه‌اندازی نشده است.
