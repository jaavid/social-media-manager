# فرانت‌اند Next.js

Next.js 16.3.8 تنها build و runtime فرانت‌اند است؛ Vite، React Router و میزبان دوگانه حذف شده‌اند. همهٔ UI روی Next App Router است. Node 20.19+ مطابق package.json؛ CI و Docker از Node 20 استفاده می‌کنند.

## مسیرها و رندر

[src/app](../frontend/src/app) تنها ریشهٔ App Router است؛ `src/features` رابط‌های محصول و `src/core` providerها، session و سازگاری navigation را نگه می‌دارند. تنظیمات Next، PostCSS، TypeScript و فایل‌های محیطی در ریشهٔ `frontend` هستند. پوشهٔ `src/pages` وجود ندارد تا Next آن را Pages Router تشخیص ندهد.

مسیرها مستقیماً در `src/app` نوشته می‌شوند و build سورس را بازنویسی نمی‌کند. گروه `(marketing)` صفحات عمومی را prerender می‌کند؛ گروه `(account)` providerهای session و query را دارد و گروه‌های نقش محافظت‌شده realtime را بارگذاری می‌کنند. root فقط theme، زبان، toast و tracking را فراهم می‌کند. محتوای عمومی Server Component است؛ منو، فرم‌ها، فیلترها و انیمیشن‌ها Client Componentهای کوچک هستند.

پنج خانوادهٔ product، solutions، customers، blog و agencies از محتوای ساختاریافتهٔ `src/features/marketing` برای صفحه، metadata و `generateStaticParams` استفاده می‌کنند. `content.js` این داده‌ها را به مسیرهای بومی وصل می‌کند؛ manifest استخراج‌شده یا تولیدکنندهٔ route وجود ندارد. `src/core/routes/__fixtures__/legacyRoutes.json` فقط fixture تست حفظ URLها و aliasهای قبلی است.

محتوای عمومی و JSON-LD در پاسخ سرور هستند؛ slug نامعتبر HTTP 404 می‌دهد. صفحات خصوصی تا پاسخ `/api/auth/me/` حالت loading دارند؛ JWT در مرورگر می‌ماند و دادهٔ خصوصی روی سرور fetch نمی‌شود. صفحات عمومی session و WebSocket را راه‌اندازی نمی‌کنند؛ صفحهٔ اصلی برای کاربر دارای توکن، redirect ورود مجدد را به‌صورت client انجام می‌دهد. صفحات ورود و marketplace که session را نیاز دارند در گروه account هستند.

## توسعه؛ از frontend

```sh
npm ci
cp .env.example .env.local
npm run dev                      # پورت 3000، Webpack
npm run typecheck
npm run build                    # build مستقیم Next
npm start                        # next start روی 3000
# جایگزین برای بررسی همان خروجی Docker:
npm run build:standalone
npm run start:standalone
npx playwright install chromium
npm run test:next
# اندازه‌گیری روی سرور production در حال اجرا:
node scripts/measure-public-pages.mjs
```

ابزار اندازه‌گیری با Chromium و context تازه برای هر صفحه، حجم JavaScript دانلودشده (شامل prefetch)، تعداد درخواست auth و زمان اولین React commit را ثبت می‌کند. زمان commit فقط شاخص آغاز hydration است؛ مدت کامل hydration نیست و برای مقایسه باید بار محیط یکسان باشد.

Next در توسعه API/media/backend را به Django روی `8000` proxy می‌کند؛ `NEXT_BACKEND_URL` مقصد را تغییر می‌دهد. `NEXT_PUBLIC_API_URL` پیش‌فرض `/api` است. WebSocket محلی: `NEXT_PUBLIC_WS_URL=ws://localhost:8000`.
`NEXT_PUBLIC_SITE_URL` origin آدرس‌های canonical است. مقادیر `NEXT_PUBLIC_*` عمومی و زمان build هستند؛ اسرار در آن‌ها نگذارید. `VITE_*` دیگر اثری ندارد.
کد مرورگر فقط `NEXT_PUBLIC_*` را می‌خواند؛ تنظیمات Next نام‌های قدیمی `REACT_APP_*` را در زمان build به‌عنوان fallback تبدیل می‌کند. مقادیر جدید اولویت دارند. فایل محیطی قبلی در `frontend/next/.env.local` را به `frontend/.env.local` منتقل کنید.

## استقرار؛ از ریشه

```sh
docker compose up -d --build
python3 scripts/check_next_stack.py http://localhost:3000
docker compose exec app supervisorctl status
```

یک image شامل Next، Django، Celery، beat و nginx است. nginx همهٔ UI و `/_next/` را به Next داخلی روی `3000` می‌دهد؛ `/api/`، `/ws/` و `/backend/` به Django می‌روند. `/static/` و `/media/` از مسیر backend سرو می‌شوند. `/healthz` هر دو runtime را بررسی می‌کند.

برای image مستقل فرانت، `docker build --build-arg NEXT_BACKEND_URL=http://backend:8000 -t socialstats-frontend frontend` خروجی standalone را می‌سازد؛ پورت آن `3000` است. نام backend باید از شبکهٔ کانتینر قابل دسترس باشد. rewriteهای Next در زمان build ساخته می‌شوند؛ تغییر مقصد `NEXT_BACKEND_URL` در تولید نیاز به build مجدد دارد. WebSocket تولید را با ingress به Channels هدایت کنید. این image به backend مجزا نیاز دارد؛ Compose مسیر استقرار کامل است.

## بازگشت و cache

برای بازگشت، `SOCIAL_STATS_APP_IMAGE` را روی نسخهٔ قبلیِ کامل تنظیم کنید؛ سپس `docker compose pull app` و `docker compose up -d --no-build app`. schema و migrationها باید با نسخهٔ مقصد سازگار باشند؛ volumeها را حفظ کنید. سورس فعلی حالت Vite یا overlay دوگانه ندارد.
worker قدیمی `/sw.js` بازنشسته می‌شود و فقط cacheهای `socialstats-*` پاک می‌شوند؛ tab قدیمی را reload کنید. offline SPA cache دیگر فعال نیست.
تست‌های browser از APIهای بیرونی mock استفاده می‌کنند؛ اتصال واقعی provider به credential و بررسی جداگانه نیاز دارد.

## آرشیو مستقل

`archive/legacy-frontend/` snapshot تاریخی ادغام‌شده در PR #97 است و در build، importها و تست‌ها استفاده نمی‌شود. می‌توان آن را جداگانه حذف کرد؛ rollback عملیاتی با image قبلی انجام می‌شود. `npm run check:next` صحت importهای نسبی و نبود symlink یا پوشهٔ routing قدیمی را بررسی می‌کند. CI این بررسی را مستقل از build اجرا می‌کند؛ تست browser هر ۱۹۱ URL و فایل‌های عمومی را پوشش می‌دهد.
