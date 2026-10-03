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
