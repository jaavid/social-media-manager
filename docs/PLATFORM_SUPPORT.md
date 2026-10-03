# قابلیت‌های پلتفرم‌ها

مرجع واحد [platform_registry.py](../backend/social_stats/platform_registry.py) است؛ جدول زیر عین خروجی آن است و `python manage.py check_platform_config` هماهنگی آن با frontend را بررسی می‌کند.

`supported`: پیاده‌سازی‌شده؛ `beta`: قابل‌استفاده با محدودیت؛ `planned`: هنوز آماده نیست؛ `not_available`: موجود نیست. مجوز و سهمیهٔ provider همچنان لازم است. WhatsApp/Pinbot ماژول جدا دارد؛ [اتصال](CONNECT_ACCOUNTS.md).

<!-- platform-matrix:start -->
| Platform | Connection | Disconnect | Text | Image | Video | Scheduling | Analytics | Inbox | Comments | Reviews | Webhooks |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Facebook | supported | supported | supported | supported | supported | supported | supported | supported | supported | not_available | supported |
| Instagram | supported | supported | not_available | supported | supported | supported | supported | supported | supported | not_available | supported |
| YouTube | supported | supported | not_available | not_available | supported | supported | supported | not_available | supported | not_available | beta |
| LinkedIn | supported | supported | supported | supported | supported | supported | beta | not_available | beta | not_available | not_available |
| Google Business Profile | supported | supported | supported | supported | not_available | supported | supported | not_available | not_available | supported | not_available |
| Telegram | supported | supported | supported | supported | supported | supported | not_available | planned | not_available | not_available | planned |
| Bale | supported | supported | supported | supported | supported | supported | not_available | planned | not_available | not_available | planned |
| Eitaa | planned | planned | planned | planned | planned | planned | not_available | planned | not_available | not_available | planned |
| Aparat | planned | planned | not_available | not_available | planned | planned | planned | not_available | planned | not_available | planned |
<!-- platform-matrix:end -->

فقط `supported` و `beta` تعاملی باشند؛ `planned` غیرفعال و `not_available` پنهان. وصل‌بودن حساب به معنی آماده‌بودن همهٔ قابلیت‌ها نیست.
برای ارتقای وضعیت یک integration، اتصال واقعی، ذخیرهٔ رمزگذاری‌شده، انتشار قابلیت‌های اعلام‌شده، log و ID خروجی، خطاهای قابل‌فهم و disconnect را با حساب sandbox بررسی و قرارداد CI را پوشش دهید.
