# اتصال حساب‌ها

فضای کاری را انتخاب کنید و Connected Accounts را باز کنید. هر فضای کاری می‌تواند چند حساب از یک پلتفرم داشته باشد؛ هنگام انتشار مقصد را صریح انتخاب کنید. توکن‌ها در دیتابیس رمزگذاری می‌شوند.

## OAuth و اتصال دستی

Quick Connect به برنامهٔ توسعه‌دهنده، credential واقعی، callback دقیق و مجوزهای پلتفرم نیاز دارد. برای استفادهٔ عمومی تأییدهای لازم را بگیرید و سپس `OAUTH_APPS_APPROVED=True` کنید. اتصال دستی از wizard انجام می‌شود؛ محدودیت مجوزهای provider همچنان برقرار است.

| پلتفرم | تنظیمات سرور | callback |
| --- | --- | --- |
| Facebook / Instagram | `META_APP_ID`، `META_APP_SECRET`، `META_REDIRECT_URI` | `/api/oauth/facebook/callback/` |
| YouTube / Google Business | `GOOGLE_CLIENT_ID`، `GOOGLE_CLIENT_SECRET`، `GOOGLE_REDIRECT_URI` | `/api/oauth/google/callback/` |
| LinkedIn | `LINKEDIN_CLIENT_ID`، `LINKEDIN_CLIENT_SECRET`، `LINKEDIN_REDIRECT_URI` | `/api/oauth/linkedin/callback/` |

callback کامل با scheme، دامنه، مسیر و `/` پایانی باید عیناً در provider ثبت شود. در Compose از origin عمومی برنامه؛ در توسعه از `http://localhost:8000` استفاده کنید.

Scopeهای فعلی در [oauth_views.py](../backend/social_stats/oauth_views.py):

- Meta: `pages_show_list`، `pages_read_engagement`، `pages_manage_metadata`، `instagram_basic`، `instagram_content_publish`، `instagram_manage_insights`، `read_insights`. حساب Instagram باید شرایط Graph API و اتصال Page را داشته باشد.
- YouTube: `https://www.googleapis.com/auth/youtube.force-ssl` و `https://www.googleapis.com/auth/yt-analytics.readonly` به‌همراه `openid email profile`. Data API v3 و Analytics API را فعال کنید؛ در حالت Testing کاربر را به test users اضافه کنید. API key به‌تنهایی کافی نیست.
  برای consent screen با user type خارجی و وضعیت **Testing**، Google refresh token را با عمر **۷ روز** صادر می‌کند. استثنا فقط زمانی است که تمام scopeهای درخواستی زیرمجموعهٔ `openid`، `userinfo.email` و `userinfo.profile` یا معادل OpenID Connect آن‌ها باشند؛ scopeهای YouTube بالا مشمول این استثنا نیستند. `access_type=offline` و consent دوباره، این محدودیت Testing را حذف نمی‌کنند. پس از انقضا، اتصال مجدد با رضایت کاربر لازم است؛ refresh خودکار دائمی را فرض نکنید.
  برای استفادهٔ تولیدی، publishing status و الزامات verification همان scopeها را در Google Cloud بررسی کنید. حتی در Production، refresh token ممکن است به علت revoke توسط کاربر، عدم استفاده، محدودیت تعداد token یا سیاست سازمانی نامعتبر شود؛ Production تضمین عمر دائمی نیست. [مرجع رسمی Google: Refresh token expiration](https://developers.google.com/identity/protocols/oauth2#expiration) (بررسی‌شده در ۲۰۲۶-۱۰-۰۸).
- Google Business: `https://www.googleapis.com/auth/business.manage` به‌همراه `openid email profile`؛ دسترسی Business Profile API لازم است.
- LinkedIn: اتصال فعلی `openid profile email` می‌گیرد؛ این اتصال به‌تنهایی مجوز انتشار یا آمار سازمانی نیست. مجوز محصول/حساب باید متناسب با عملیات فراهم شود.

بررسی تنظیمات Google، از `backend/`: `python manage.py check_oauth_readiness --strict`. این بررسی فقط وجود تنظیمات را می‌سنجد؛ تأیید provider را ثابت نمی‌کند. برای حساب YouTube متصل‌شده با scope قدیمی، قطع و دوباره وصل کنید.

## Telegram و Bale

bot token و chat/channel destination را وارد کنید. bot باید اجازهٔ انتشار در مقصد داشته باشد. اتصال قبل از ذخیره با provider بررسی می‌شود. متن، عکس، ویدئو و media group پشتیبانی می‌شود؛ آمار و inbox آماده نیستند. Eitaa و Aparat فعلاً برنامه‌ریزی‌شده‌اند؛ [جدول قابلیت‌ها](PLATFORM_SUPPORT.md).

## WhatsApp از Pinbot

1. حساب Partners در [Pinbot](https://pinbot.ai) و WABA/شماره را فراهم کنید.
2. `PINBOT_BASE_URL`، `WHATSAPP_ENCRYPTION_KEY` و `WHATSAPP_WEBHOOK_SECRET` را روی سرور تنظیم کنید.
3. در بخش WhatsApp، `apikey`، `phone_number_id` و `waba_id` همان فضای کاری را ثبت کنید.
4. webhook را روی `https://YOUR_DOMAIN/api/whatsapp/webhook/` ثبت کنید؛ GET از `hub.verify_token` و POST از `X-Webhook-Secret` استفاده می‌کند.
5. برای کمپین، رضایت مخاطب و template تأییدشده لازم است؛ محدودیت‌های شماره و provider رعایت می‌شوند.

## دسترسی شبکه

Gateway فعلی در مسیر اجرایی Telegram و Bale استفاده می‌شود. [API Access Gateway](https://github.com/jaavid/api-access-gateway) باید `/_gateway/health`، `/_gateway/routes` و `/_gateway/probe/<route>` و مسیرهای `telegram`/`bale` به originهای provider را داشته باشد.
`API_GATEWAY_URL/KEY` و `OUTBOUND_TELEGRAM_MODE` یا `OUTBOUND_BALE_MODE` را تنظیم کنید: `direct`، `gateway` یا `auto`. کلید با secret سمت gateway یکسان باشد.
`auto` فقط برای خطای شبکه fallback می‌کند؛ HTTP `401/403/429/5xx` باعث تغییر مسیر نمی‌شود. زمان circuit از `OUTBOUND_CIRCUIT_TTL_SECONDS` می‌آید. توکن bot از header داخلی ارسال می‌شود و در URL عمومی gateway قرار نمی‌گیرد.
آزمون اتصال در Settings → Connect Accounts → API Connectivity برای staff/superadmin است. وجود Meta/Google/LinkedIn در health registry به معنی استفادهٔ runtime آن‌ها از gateway نیست.

## قرارداد Connected Accounts

Connected Accounts از `GET /api/workspaces/{id}/connections/` استفاده می‌کند؛ providerها
از manifest و حساب‌ها از `SocialAccount` همان فضای کاری می‌آیند. هویت حساب و مقصد
جدا نمایش داده می‌شوند. selector حساب، reconnect و disconnect همیشه شناسهٔ همان
حساب را ارسال می‌کنند؛ اتصال حساب تازه اقدام مستقل است.

`contract.auth.fields` فرم‌های bot token، API key و custom را تعریف می‌کند. provider
با custom strategy فقط وقتی schema واقعی دارد فرم می‌گیرد. `oauth_start` مسیر داخلی
flow متعلق به provider است. فرم عمومی branch بر اساس نام provider ندارد. icon و
رنگ از `contract.brand` می‌آیند؛ asset ناموجود آیکن عمومی می‌گیرد و رنگ provider
دکمه یا وضعیت معنایی محصول را عوض نمی‌کند.

سلامت credential از همان `ProviderExecution(...).call('health')` runtime گرفته
می‌شود. `ready` فقط آمادگی محلی credential است، نه بررسی زندهٔ دسترس‌پذیری provider.
expired، revoked، disconnected و unknown جدا هستند. خطای health یا پاسخ نامعتبر
unknown می‌شود و credential را پاک نمی‌کند. وضعیت provider (مثلاً experimental)
با وضعیت قابلیت connection (مثلاً supported) مستقل نمایش داده می‌شود.

آخرین sync موفق/ناموفق از `SyncLog` همان workspace، provider و SocialAccount است؛
لاگ قدیمیِ بدون حساب به یک حساب خاص نسبت داده نمی‌شود. پیش‌فرض staleness برابر
۲۴ ساعت است؛ `ACCOUNT_SYNC_STALE_SECONDS` آن را تغییر می‌دهد (حداقل ۶۰ ثانیه).
بدون evidence وضعیت unknown است؛ آخرین تلاش failed وضعیت failure می‌گیرد حتی اگر
قبلاً sync موفق وجود داشته باشد. provider بدون analytics، sync آماده نمایش نمی‌دهد.
payload خام و متن خطای خصوصی provider در این API وجود ندارند.

`connect_platforms` و `disconnect_platforms` از evaluator مشترک authorization
استفاده می‌کنند؛ connect برای عضو/آژانس نیاز به grant صریح دارد. policy نیازمند
approval در این surface fail-closed است: credential در approval payload ذخیره یا
خودکار replay نمی‌شود. شروع و callback OAuth دسترسی فعلی workspace/account را
دوباره بررسی می‌کنند. reconnect OAuth فقط identity انتخاب‌شده را به‌روز می‌کند؛
انتخاب identity دیگر در consent آن حساب را overwrite نمی‌کند.

GETهای این surface key فضای کاری و AbortSignal دارند. خطای initial/malformed/403
از empty موفق جدا است؛ refresh ناموفق دادهٔ قبلی را حفظ می‌کند، اما forbidden آن
را می‌پوشاند. فرم در خطای قابل بازیابی ورودی را حفظ می‌کند. POST/DELETE خودکار
تکرار نمی‌شوند؛ پس از پاسخ مبهم ابتدا refresh و وضعیت provider را بررسی کنید و
فقط به‌صورت صریح دوباره اقدام کنید. هیچ شبکهٔ واقعی تازه‌ای با این قرارداد آماده
یا اضافه نشده است.

علت احراز هویت در فیلد `PlatformCredential.auth_failure_code` ثبت می‌شود: مسیرهای
runtime که `TokenExpiredError` دریافت می‌کنند `token_expired` و revocation صریح
`revoked` ثبت می‌کنند. migration `0077` مقدار قدیمی را خالی نگه می‌دارد؛ علت از
`is_active=False` حدس زده نمی‌شود و چنین حسابی unknown است. اتصال موفق علت را
پاک می‌کند. سیاست readiness فعلی از ۱۰ دقیقه پیش از `expires_at` اتصال را
نیازمند تمدید می‌داند؛ زمان دقیق انقضا کنار وضعیت نمایش داده می‌شود.
