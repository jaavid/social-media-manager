# رفع مشکل

| نشانه | بررسی و اقدام |
| --- | --- |
| Compose شروع نمی‌شود | وجود `.env` و `POSTGRES_PASSWORD`؛ `docker compose ps` و `docker compose logs --tail=100 app` |
| صفحه باز است ولی API خراب است | `NEXT_PUBLIC_API_URL`، CORS و دسترسی به `/api/`؛ پس از تغییر متغیر frontend دوباره build کنید |
| `DisallowedHost` | hostname واقعی را در `ALLOWED_HOSTS` بگذارید؛ scheme و path وارد نکنید |
| HTTP محلی به HTTPS می‌رود | تنظیمات HTTP در [پیکربندی](CONFIGURATION.md)؛ در سرور واقعی forwarded protocol و TLS را بررسی کنید |
| Quick Connect غیرفعال است | `OAUTH_APPS_APPROVED=False`؛ از wizard دستی یا برنامهٔ تأییدشده استفاده کنید |
| OAuth خطای redirect می‌دهد | callback کامل، scheme، port و `/` آخر با provider دقیقاً یکسان باشند |
| YouTube وصل است ولی منتشر نمی‌کند | Data API، مجوز `youtube.force-ssl` و حساب/کانال درست؛ پس از تغییر scope دوباره وصل کنید |
| Telegram/Bale منتشر نمی‌کند | token، مقصد، دسترسی bot و اتصال شبکه؛ پاسخ `401/403/429` مشکل gateway نیست |
| انتشار زمان‌بندی‌شده اجرا نمی‌شود | worker و beat، ساعت/منطقهٔ زمانی، requester، مجوز فعلی و تأیید پست |
| پیام WhatsApp نمی‌رسد | WABA/شماره، secret webhook، رضایت مخاطب، template و محدودیت provider |
| AI یا ایمیل خطا می‌دهد | credential واقعی، سهمیهٔ provider، تنظیمات SMTP و log؛ مقدار نمونه معتبر نیست |
| دادهٔ آمار خالی است | اتصال و مجوز آمار همان پلتفرم، اجرای sync و worker/beat؛ آمار bot channel موجود نیست |
| مرورگر هنوز UI قدیمی نشان می‌دهد | tab را reload کنید؛ worker قدیمی `/sw.js` بازنشسته شده و cacheهای `socialstats-*` پاک می‌شوند |
| توکن ذخیره‌شده خوانده نمی‌شود | کلید رمزگذاری قبلی در محیط وجود داشته باشد؛ کلید را تصادفی عوض نکنید |

بررسی سریع Compose:

```sh
curl -fsS http://localhost:3000/healthz
docker compose exec app supervisorctl status
docker compose exec app python manage.py check_platform_config
```

برای گزارش خطا، مسیر، زمان، مراحل بازتولید، نسخه و `X-Request-ID` را ثبت کنید. token، رمز، OAuth code و اطلاعات شخصی را در issue یا log ارسالی قرار ندهید. رخداد امنیتی: [راهنما](SECURITY.md).
