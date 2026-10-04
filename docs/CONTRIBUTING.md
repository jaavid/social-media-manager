# توسعه و مشارکت

محیط را با [شروع](GETTING_STARTED.md) آماده کنید. branch موضوعی از `main` بسازید؛ هر PR یک تغییر مشخص با دلیل و بررسی مرتبط داشته باشد. قالب: [Pull request](../.github/PULL_REQUEST_TEMPLATE.md).

## بررسی‌ها

از `backend/` با محیط مجازی فعال:

```sh
python manage.py check
python manage.py makemigrations social_stats --check --dry-run
python manage.py test social_stats.tests
python manage.py check_platform_config
```

از `frontend/`:

```sh
npm run typecheck
CI=true npm test
npm run i18n:check
npm run build
```

برای تغییر مسیرهای Next، [تست browser](NEXT_MIGRATION.md) را هم اجرا کنید. CI تست Django، Jest، build Next، TypeScript، مرورگر و راه‌اندازی Docker را دارد.
از ریشه: `pre-commit install`؛ بررسی فایل‌ها: `pre-commit run --all-files`.

## قواعد کد

- Python چهار فاصله؛ JS/JSX دو فاصله؛ نام‌های Python به `snake_case` و کامپوننت‌ها به `PascalCase`.
- از `components/ui/` و tokenهای `styles/` استفاده کنید؛ TanStack Query برای دادهٔ سرور، Zustand برای state محلی.
- تست backend در `social_stats/tests/test_*.py`؛ تست frontend کنار سورس با `*.test.js/jsx`.
- تغییر دسترسی یا انتشار را با تست مرز workspace/account و شکست provider پوشش دهید.
- برای اصطلاح جدید از workspace استفاده کنید؛ [سازگاری](ACCESS.md) را حفظ کنید.
- copyright و [MIT License](../LICENSE) را حفظ کنید؛ مشارکت تحت MIT است.

## فارسی و RTL

`useLanguage()` و `tr()` مسیر ترجمه‌اند. تاریخ نمایشی از `formatDate()` و عدد از `formatNumber()`؛ identifier، URL و ورودی فنی را از جریان RTL جدا کنید.
`npm run i18n:inventory` متن‌های مستقیم را فهرست می‌کند. guard مبتنی بر parser تمام JS/JSX/TS/TSX را بررسی می‌کند و افزایش baseline متن legacy را رد می‌کند؛ این شمارش به معنی ترجمهٔ کامل نیست. قراردادها: [Frontend contracts](FRONTEND_CONTRACTS.md). منبع: [اسکریپت](../frontend/scripts/check-user-facing-strings.js).

مستندات فقط در `docs/` باشند؛ فایل کوتاه، دستور قابل‌اجرا و لینک به مرجع کد بنویسید. گزارش PR، screenshot مقایسه‌ای و backlog را به‌عنوان راهنمای دائمی اینجا نگه ندارید. جدول PLATFORM_SUPPORT باید عین خروجی registry باشد.
