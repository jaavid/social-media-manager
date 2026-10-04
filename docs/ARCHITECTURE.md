# ساختار پروژه

| مسیر | مسئولیت |
| --- | --- |
| `backend/dashboard/` | تنظیمات Django، مسیریابی اصلی، ASGI و Celery |
| `backend/social_stats/` | مدل‌ها، API، اتصال‌ها، انتشار، AI، مجوزها و تست‌ها |
| `frontend/src/features/` | رابط‌های محصول؛ خارج از پوشه‌های رزروشدهٔ routing |
| `frontend/src/core/` | session، providerها، shell، سازگاری navigation و inventory مسیرها |
| `frontend/src/app/` | App Router، layoutها و صفحات native Next.js |
| `frontend/src/components/`، `hooks/`، `lib/`، `services/` | UI مشترک، hooks، ابزارها و سرویس API |
| `archive/legacy-frontend/` | snapshot تاریخی مستقل از build و قابل حذف |
| `docker/` | nginx، راه‌اندازی و Supervisor |
| `infra/` | نمونه‌های زیرساخت؛ قبل از استفاده با محیط خود تطبیق دهید |
| `scripts/` | ابزارهای عملیاتی؛ جایگزین مسیر اصلی Compose نیستند |
| `templates/breach-notifications/` | الگوهای اطلاع‌رسانی رخداد؛ متن راهنما نیستند |

پشته: Django 5.2، DRF، Channels، Celery، React 18، Next.js 16، TanStack Query و Zustand. دیتابیس محلی SQLite؛ استقرار Compose از PostgreSQL 16 و Redis 7 استفاده می‌کند.

## مسیر درخواست

مرورگر → nginx → Next.js یا Django. Django کار پس‌زمینه را به Celery می‌دهد؛ worker از ناشر پلتفرم برای انتشار استفاده می‌کند. beat زمان‌بندی دوره‌ای را اجرا می‌کند. Channels ارتباط WebSocket را مدیریت می‌کند.

| مسیر عمومی | مسئول |
| --- | --- |
| `/api/` | Django API |
| `/ws/` | Channels |
| `/backend/` | مدیریت داخلی فارسی Django |
| `/admin/`، `/dashboard/`، `/u` | رابط محصول |
| `/static/`، `/media/` | nginx |
| `/healthz` | بررسی سلامت |

Compose سه سرویس دارد: `app`، `postgres` و `redis`. داخل `app` پنج فرایند `next`، `django`، `celery`، `beat` و `nginx` با Supervisor اجرا می‌شوند. ورود کانتینر migrations و collectstatic را اجرا می‌کند.

همهٔ UI و `/_next/` روی Next است. `/healthz` سلامت هر دو Next و Django را می‌سنجد.

پنل `/backend/` به کاربر فعال `is_staff=True` و مجوز مدل نیاز دارد. رکوردهای عملیاتی مثل پست، لاگ انتشار و پیام در این پنل فقط خواندنی‌اند؛ انتشار، تأیید و پاسخ از رابط محصول انجام می‌شود.

مراجع اصلی: [تنظیمات](../backend/dashboard/settings.py)، [URLها](../backend/social_stats/urls.py)، [Compose](../docker-compose.yml)، [Supervisor](../docker/supervisord.conf).
