# پیکربندی

| روش اجرا | فایل |
| --- | --- |
| Compose | کپی [`.env.example`](../.env.example) به `.env` در ریشه |
| Django محلی | کپی [`backend/.env.example`](../backend/.env.example) به `backend/.env` |
| Next محلی | مقادیر [`frontend/.env.example`](../frontend/.env.example) در `frontend/.env.local` یا محیط زمان build |

مقادیر نمونهٔ credential را خالی یا واقعی کنید؛ placeholder به معنی اتصال آماده نیست. اسرار فقط در سرور باشند. نام متغیرها و پیش‌فرض‌های دقیق در [settings.py](../backend/dashboard/settings.py) است.

## تنظیمات اصلی

| متغیر | کاربرد |
| --- | --- |
| `SECRET_KEY` | کلید تصادفی امضای Django |
| `FIELD_ENCRYPTION_KEYS` | کلیدهای Fernet جداشده با کاما؛ اولی برای نوشتن، همه برای خواندن |
| `DEBUG`، `ALLOWED_HOSTS` | حالت توسعه و hostnameهای مجاز |
| `APP_URL`، `APP_BIND`، `APP_PORT` | آدرس عمومی و bind/port در Compose |
| `FRONTEND_URL`، `CORS_ALLOWED_ORIGINS` | آدرس رابط برای اجرای مستقیم Django؛ Compose از `APP_URL` می‌سازد |
| `POSTGRES_DB/USER/PASSWORD` | دیتابیس Compose؛ host و port خودکار تنظیم می‌شوند |
| `DB_NAME/USER/PASSWORD/HOST/PORT` | اتصال PostgreSQL در اجرای مستقیم؛ بدون `DB_NAME` از SQLite استفاده می‌شود |
| `CELERY_BROKER_URL`، `CELERY_RESULT_BACKEND` | Redis تسک‌ها؛ Compose خودکار تنظیم می‌کند |
| `CHANNEL_LAYERS_REDIS_URL` | Redis ارتباط زنده؛ Compose خودکار تنظیم می‌کند |
| `EMAIL_HOST/PORT/HOST_USER/HOST_PASSWORD`، `DEFAULT_FROM_EMAIL` | SMTP برای ایمیل‌ها |
| `ANTHROPIC_API_KEY` | قابلیت‌های AI؛ بدون کلید واقعی استفاده نکنید |
| `OAUTH_APPS_APPROVED` | فعال‌سازی Quick Connect؛ تا دریافت تأییدها `False` بماند |
| `NEXT_PUBLIC_API_URL`، `NEXT_PUBLIC_WS_URL`، `NEXT_PUBLIC_SITE_URL` | آدرس عمومی API، WebSocket و canonical؛ نیازمند build مجدد |

تولید کلید؛ دستور دوم پس از نصب وابستگی‌های Python:

```sh
python -c "import secrets; print(secrets.token_urlsafe(64))"
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

کلیدهای رمزگذاری را همراه بکاپ، جدا و امن نگه دارید. تعویض مستقیم کلید می‌تواند توکن‌های موجود را ناخوانا کند؛ کلید جدید را ابتدا اضافه کنید و تا بازرمزگذاری و بررسی داده، قدیمی را نگه دارید.

## HTTP محلی و HTTPS واقعی

برای Django محلی با `DEBUG=False` و HTTP: `SECURE_SSL_REDIRECT=False`، `SESSION_COOKIE_SECURE=False`، `CSRF_COOKIE_SECURE=False` و `SECURE_HSTS_SECONDS=0` تنظیم کنید.
در محیط واقعی از HTTPS، `DEBUG=False` و cookieهای امن استفاده کنید. proxy باید `X-Forwarded-Proto` را درست ارسال کند. `TRUST_PROXY_CLIENT_IP=True` فقط وقتی origin صرفاً از proxy قابل دسترسی است.

SSO با `SSO_OIDC_ISSUER/CLIENT_ID/CLIENT_SECRET/REDIRECT_URI` تنظیم می‌شود. پیش‌فرض `SSO_OIDC_REQUIRE_VERIFIED_EMAIL=True` را حفظ کنید و claim ایمیل تأییدشده را در IdP فراهم کنید. بازگشت: `/api/auth/sso/callback/`.

پس از تغییر محیط Compose: `docker compose up -d --force-recreate app`. متغیرهای عمومی فرانت‌اند زمان build خوانده می‌شوند؛ برای آن‌ها image را دوباره بسازید.
