# شروع

## Docker؛ از ریشهٔ پروژه

Docker و Compose لازم است. ایمیج آماده برای `linux/amd64` منتشر می‌شود؛ روی معماری دیگر از سورس بسازید.

```sh
cp .env.example .env
# SECRET_KEY و POSTGRES_PASSWORD را با مقدار تصادفی جایگزین کنید.
docker compose pull
docker compose up -d
# ساخت از سورس: docker compose up -d --build
docker compose exec app python manage.py demo_setup
```

برنامه: `http://localhost:3000`. پنل داخلی Django: `/backend/`؛ پنل محصول: `/admin/`.

| ورود آزمایشی | حساب |
| --- | --- |
| `admin@demo.local` | مدیر کل |
| `agency@demo.local` | عضو آژانس |
| `enduser@demo.local` | کاربر نهایی |

رمز هر سه `demo` است. فقط برای محیط آزمایشی استفاده کنید؛ حساب‌های دمو را در محیط واقعی نسازید.

## توسعه بدون Docker

Python 3.12 و Node 20.19+؛ نسخه‌های مورد استفاده در CI. از ریشه:

```sh
cd backend
python3.12 -m venv .venv
. .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
# کلیدهای نمونهٔ ANTHROPIC و پلتفرم‌ها را تا زمان نیاز خالی کنید.
python manage.py migrate
python manage.py demo_setup
python manage.py runserver
```

در ترمینال دوم، از ریشه:

```sh
cd frontend
npm ci
cp .env.example next/.env.local
npm run dev
```

API روی `8000` و رابط روی `3000` است. بدون `DB_NAME`، دیتابیس SQLite است.
با `DEBUG=True` تسک‌ها هم‌زمان اجرا می‌شوند؛ برای کارهای دوره‌ای Redis، worker و beat لازم است. برای رفتار پس‌زمینهٔ واقعی `DEBUG=False` و تنظیمات HTTP محلیِ [پیکربندی](CONFIGURATION.md) را استفاده کنید. در دو ترمینال با محیط مجازی فعال، از `backend/`:

```sh
celery -A dashboard worker -l info
celery -A dashboard beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```
