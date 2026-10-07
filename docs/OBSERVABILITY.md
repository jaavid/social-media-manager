# پایش پردازش پس‌زمینه

در Compose، `RUNTIME_METRICS_ENABLED=True` پیش‌فرض است؛ در اجرای مستقل Django آن را صریحاً فعال کنید. شمارنده‌های مشترک Redis در کلیدهای `socialstats:metrics:v1:` ذخیره می‌شوند و با restart worker باقی می‌مانند. `RUNTIME_METRICS_REDIS_URL` اختیاری است؛ پیش‌فرض همان broker است. Redis مستقل یا database جدا امکان جداکردن نگهداری متریک از broker را می‌دهد. حذف دادهٔ Redis شمارنده‌ها را reset می‌کند. هیچ dependency جدید یا endpoint عمومی اضافه نشده است.

## خروجی operator

از ریشهٔ مخزن، با app آماده:

```sh
docker compose exec -T -e LOG_STREAM=stderr app python manage.py runtime_metrics --strict
docker compose exec -T -e LOG_STREAM=stderr app python manage.py runtime_metrics --format prometheus --strict
```

`LOG_STREAM=stderr` لاگ‌های startup را از خروجی قابل‌پردازش جدا می‌کند. خروجی JSON وضعیت enabled و availability مستقل task/queue/provider دارد؛ `--strict` برای غیرفعال‌بودن یا خرابی هر منبع غیرصفر می‌دهد. منبع unavailable با دادهٔ خالی گزارش می‌شود، نه صفر سالم. شکست نوشتن متریک اجرای task یا cleanup context را متوقف نمی‌کند و یک warning بدون متن exception می‌دهد؛ پایش آن warning برای تشخیص ازدست‌رفتن sample لازم است.

خروجی Prometheus را می‌توان با collector متنی node_exporter جمع کرد. به‌عنوان مثال روی میزبان، پس از تنظیم مسیر collector و مجوز فایل، هر ۳۰ تا ۶۰ ثانیه با scheduler خودتان اجرا کنید:

```sh
docker compose exec -T -e LOG_STREAM=stderr app python manage.py runtime_metrics --format prometheus > /var/lib/node_exporter/textfile_collector/socialstats.prom.tmp && mv /var/lib/node_exporter/textfile_collector/socialstats.prom.tmp /var/lib/node_exporter/textfile_collector/socialstats.prom
```

برای این collector از `--strict` استفاده نکنید تا availability=0 در outage هم منتشر شود. جایگزینی فایل atomic است. age فایل و `node_textfile_scrape_error` را نیز مانیتور کنید؛ command موفق به‌تنهایی سلامت worker یا API خارجی را تضمین نمی‌کند. نصب Prometheus/node_exporter و ارسال alert بخشی از stack فعلی نیست.

## معنای متریک‌ها

- `socialstats_task_runs_total{family,state}` تعداد attemptهای پایان‌یافته در خانواده‌های محدود analytics، publishing، automation، bots، inbox، events، security، telegram، whatsapp، ads، competitors، notifications و other است. stateهای SUCCESS/FAILURE/RETRY/REVOKED/OTHER با Celery postrun ثبت می‌شوند. Retry attempt جداست؛ success در Celery لزوماً success تجاری sync نیست. worker kill پیش از postrun sample پایان ندارد.
- `socialstats_task_duration_seconds` histogram زمان اجرای attempt، با bucketهای ۱/۵/۱۵/۶۰/۳۰۰/۱۸۰۰ ثانیه و `+Inf` است. زمان انتظار در صف در این histogram نیست.
- `socialstats_queue_depth{queue}` پیام‌های منتظر در صف‌های تنظیم‌شدهٔ Celery است؛ priority bucketها و Redis global key prefix را محاسبه می‌کند و پیام مصرف نمی‌کند. پیام‌های reserved/in-flight جزو این عدد نیستند. transport غیر Redis به‌صورت unavailable گزارش می‌شود. workerهای صف اختصاصی باید همان queue را در تنظیمات app ثبت کنند.
- `socialstats_provider_sync_recent_success/recent_failed` attemptهای SyncLog شروع‌شده در ۲۴ ساعت اخیر، به تفکیک provider دارای analytics capability است. `in_progress` و `stuck` وضعیت pending/running، با آستانهٔ stuck برابر ۲۴ ساعت را نشان می‌دهند.
- `socialstats_provider_sync_active_accounts/stale_accounts` حساب فعال در workspace فعال را می‌شمارد. حساب بدون success در ۲۴ ساعت گذشته، شامل حسابی که هرگز sync نشده، stale است. یک حساب سالم دیگری را پنهان نمی‌کند؛ success باید به همان حساب و workspace تعلق داشته باشد. `last_success_timestamp` آخرین success provider است؛ اگر success نداریم series چاپ نمی‌شود و مقدار JSON برابر null است. account بدون credential هم اگر فعال باقی مانده باشد stale محسوب می‌شود.
- `socialstats_runtime_metrics_enabled` و `socialstats_runtime_metrics_available{source}` پیش از تفسیر هر series بررسی شوند.

برای نرخ شکست attempt از `sum by (family) (rate(socialstats_task_runs_total{state="FAILURE"}[5m])) / clamp_min(sum by (family) (rate(socialstats_task_runs_total[5m])), 0.001)` استفاده کنید. برای p95 زمان اجرا: `histogram_quantile(0.95, sum by (family, le) (rate(socialstats_task_duration_seconds_bucket[5m])))`. صف رو به رشد، availability=0، failed sync، stale/stuck بدون recovery و warning نوشتن متریک را بر اساس حجم واقعی و cadence sync هشدار دهید.

labels و counters فقط خانوادهٔ task، state، صف تنظیم‌شده و platform ثبت‌شده را دارند؛ task ID، account/workspace ID، نام کاربر، token، payload، exception و نتیجهٔ task جمع نمی‌شوند. خروجی CLI برای operator سرور است و روی route عمومی یا tenant dashboard قرار نگرفته است. لاگ و correlation در [استقرار](DEPLOYMENT.md#لاگ-و-ردیابی-درخواست) توضیح داده شده‌اند.
