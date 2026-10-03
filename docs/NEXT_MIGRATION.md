# فرانت‌اند Next.js

Next.js 16.3.8 تنها build و runtime فرانت‌اند است؛ Vite، React Router و میزبان دوگانه حذف شده‌اند. همهٔ UI روی Next App Router است. Node 20.19+ مطابق package.json؛ CI و Docker از Node 20 استفاده می‌کنند.

## مسیرها و رندر

[routeInventory.json](../frontend/src/app/routes/routeInventory.json) مرجع URLها و aliasهای workspace/client است. `npm run routes:generate` از آن `page.jsx` و `View.jsx` می‌سازد؛ برای مسیر جدید ابتدا inventory را تغییر دهید.
محتوای عمومی و JSON-LD در پاسخ سرور رندر می‌شوند؛ URL/slug نامعتبر HTTP 404 می‌دهد. صفحات خصوصی تا پاسخ `/api/auth/me/` حالت loading دارند؛ session همان JWT مرورگر است و دادهٔ خصوصی روی سرور fetch نمی‌شود. metadata متعلق به Next است.

## توسعه؛ از frontend

```sh
npm ci
cp .env.example next/.env.local
npm run dev                      # پورت 3000، Webpack
npm run build                    # تولید مسیرها و build Next
npm start                        # standalone روی 3000
npx playwright install chromium
npm run test:next
```

Next در توسعه API/media/backend را به Django روی `8000` proxy می‌کند؛ `NEXT_BACKEND_URL` مقصد را تغییر می‌دهد. `NEXT_PUBLIC_API_URL` پیش‌فرض `/api` است. WebSocket محلی: `NEXT_PUBLIC_WS_URL=ws://localhost:8000`.
`NEXT_PUBLIC_SITE_URL` origin آدرس‌های canonical است. مقادیر `NEXT_PUBLIC_*` عمومی و زمان build هستند؛ اسرار در آن‌ها نگذارید. `VITE_*` دیگر اثری ندارد.

## استقرار؛ از ریشه

```sh
docker compose up -d --build
python3 scripts/check_next_stack.py http://localhost:3000
docker compose exec app supervisorctl status
```

یک image شامل Next، Django، Celery، beat و nginx است. nginx همهٔ UI و `/_next/` را به Next داخلی روی `3000` می‌دهد؛ `/api/`، `/ws/` و `/backend/` به Django می‌روند. `/static/` و `/media/` از مسیر backend سرو می‌شوند. `/healthz` هر دو runtime را بررسی می‌کند.

## بازگشت و cache

برای بازگشت، `SOCIAL_STATS_APP_IMAGE` را روی نسخهٔ قبلیِ کامل تنظیم کنید؛ سپس `docker compose pull app` و `docker compose up -d --no-build app`. schema و migrationها باید با نسخهٔ مقصد سازگار باشند؛ volumeها را حفظ کنید. سورس فعلی حالت Vite یا overlay دوگانه ندارد.
worker قدیمی `/sw.js` بازنشسته می‌شود و فقط cacheهای `socialstats-*` پاک می‌شوند؛ tab قدیمی را reload کنید. offline SPA cache دیگر فعال نیست.
تست‌های browser از APIهای بیرونی mock استفاده می‌کنند؛ اتصال واقعی provider به credential و بررسی جداگانه نیاز دارد.
