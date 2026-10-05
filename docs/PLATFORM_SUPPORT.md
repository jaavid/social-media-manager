# قابلیت‌های پلتفرم‌ها

مرجع واحد [definitions.py](../backend/social_stats/platforms/definitions.py) است؛ [platform_registry.py](../backend/social_stats/platform_registry.py) نمای سازگار آن؛ جدول زیر عین خروجی آن است و `python manage.py check_platform_config` هماهنگی آن با frontend را بررسی می‌کند.

`supported`: پیاده‌سازی‌شده؛ `beta`: قابل‌استفاده با محدودیت؛ `planned`: هنوز آماده نیست؛ `not_available`: موجود نیست. مجوز و سهمیهٔ provider همچنان لازم است. WhatsApp/Pinbot ماژول جدا دارد؛ [اتصال](CONNECT_ACCOUNTS.md).

<!-- platform-matrix:start -->
| Platform | Connection | Disconnect | Text | Image | Video | Scheduling | Analytics | Inbox | Comments | Reviews | Webhooks |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Facebook | supported | supported | supported | supported | supported | supported | supported | supported | supported | not_available | supported |
| Instagram | supported | supported | not_available | supported | supported | supported | supported | supported | supported | not_available | supported |
| LinkedIn | supported | supported | supported | supported | supported | supported | beta | not_available | beta | not_available | not_available |
| Telegram | supported | supported | supported | supported | supported | supported | not_available | supported | not_available | not_available | supported |
| Bale | supported | supported | supported | supported | supported | supported | not_available | planned | not_available | not_available | planned |
| Eitaa | planned | planned | planned | planned | planned | planned | not_available | planned | not_available | not_available | planned |
| YouTube | supported | supported | not_available | not_available | supported | supported | supported | not_available | supported | not_available | beta |
| Aparat | planned | planned | not_available | not_available | planned | planned | planned | not_available | planned | not_available | planned |
| Google Business Profile | supported | supported | supported | supported | not_available | supported | supported | not_available | not_available | supported | not_available |
<!-- platform-matrix:end -->

فقط `supported` و `beta` تعاملی باشند؛ `planned` غیرفعال و `not_available` پنهان. وصل‌بودن حساب به معنی آماده‌بودن همهٔ قابلیت‌ها نیست.
برای ارتقای وضعیت یک integration، اتصال واقعی، ذخیرهٔ رمزگذاری‌شده، انتشار قابلیت‌های اعلام‌شده، log و ID خروجی، خطاهای قابل‌فهم و disconnect را با حساب sandbox بررسی و قرارداد CI را پوشش دهید.

## قرارداد تلگرام و بله

فیلد `features` در `/api/platforms/metadata/` و metadata محلی frontend از
[bot_features.py](../backend/social_stats/platforms/bot_features.py) می‌آید.
`features.support` وضعیت media group، mixed media، rich message، slideshow، collage،
buttons، inbound updates، channel DM، suggested posts، forum topics، streamed drafts و polls را جدا می‌کند.
آلبوم عکس/ویدئو، Rich Message، نظرسنجی، وب‌هوک، DM، پیشنهاد پست، topic و دستیار خصوصی
تلگرام فعال‌اند؛ قابلیت‌های اختصاصی تلگرام برای بله `not_available` هستند. از `hasFeature()` برای کنترل نمایش/فعال‌سازی استفاده کنید.

`features.destinations` امکان پروتکلی هر نوع مقصد را توضیح می‌دهد؛ این مقدار به‌تنهایی
قابلیت را فعال نمی‌کند. broadcast channel موضوع بومی ندارد؛ `message_thread_id` فقط برای
forum supergroup و private bot با topic mode است. فعال‌کردن Threaded mode در BotFather
پیش‌نیاز عملیاتی private forum است. draft stream برای private chat است، نه channel.
شناسه‌های topic باید عدد صحیح مثبت در `destination_context` باشند؛ فیلد ناشناخته، ترکیب
نامعتبر و قابلیت آماده‌نشده قبل از HTTP با خطای typed رد می‌شوند. این context مجوز workspace نمی‌دهد.

آلبوم عکس ۲ تا ۱۰ عضو دارد؛ ترتیب حفظ و caption روی اولین عکس قرار می‌گیرد. یک عضو با
`sendPhoto` و بدون عضو با متن ارسال می‌شود. شناسه‌ها در `platform_post_ids` خروجی و
`PlatformPublishLog.raw_response.platform_post_ids` ذخیره می‌شوند؛ شناسهٔ قدیمی حفظ شده است.
تبدیل خودکار Rich Message یا topic به متن/General انجام نمی‌شود؛ fallback باید انتخاب صریح کاربر باشد.

انتشار موفق و claim فعال در بازاجرای worker دوباره ارسال نمی‌شوند؛ retry محدود `429` با
Celery countdown انجام می‌شود. timeout/network/invalid-response ممکن است پس از پذیرش مقصد رخ دهند؛
بازاجرای خودکار این logها متوقف می‌شود. قبل از انتشار مجدد، نتیجه را در مقصد بررسی کنید.
این رفتار تضمین exactly-once تلگرام نیست؛ Bot API کلید idempotency برای ارسال ندارد.


## راه‌اندازی قابلیت‌های پیشرفته تلگرام

از Settings → Connected Accounts، حساب تلگرام را انتخاب کنید. کنترل‌های topic فقط برای
forum supergroup، private forum و Channel DM نمایش داده می‌شوند؛ مقصد با `getChat` بررسی می‌شود.
یک bot در Telegram یک webhook دارد. کانال‌های همان bot در همان workspace با شناسهٔ
`parent_chat` و credential یکسان نگاشت می‌شوند؛ برای workspaceهای مستقل bot مستقل بسازید.
Webhook به URL عمومی HTTPS برنامه ثبت می‌شود و secret رمزگذاری‌شده دارد؛ token در URL برنامه نیست.
Celery worker و beat باید فعال باشند. receipt آپدیت‌ها ۳۰ روز نگهداری و payload پس از پردازش حذف می‌شود.
پس از یک هفته سکوت، reset شناسهٔ Telegram پشتیبانی می‌شود. آپدیت قدیمی‌تر از بازهٔ نگهداری تضمین replay ندارد.

در Composer حالت Album / Gallery برای ۲–۱۰ عکس/ویدئو، Rich Article برای بلوک‌های مرتب
و RTL، و Poll برای نظرسنجی موجود است. Slideshow/Collage بلوک Rich Message هستند.
Rich HTML/Markdown خام پذیرفته نمی‌شود. fallback متن و لینک رسانه انتخاب صریح کاربر است.
URL رسانه باید عمومی و HTTPS باشد؛ `asset:<id>` فقط از workspace پست حل می‌شود.
پیش‌نویس، duplicate، approval، schedule و انتقال پست به queue همان payload را حفظ می‌کنند.

پیشنهادهای ورودی در Inbox دیده می‌شوند؛ review، کپی به draft، approve با زمان اختیاری و decline
روی پیام اصلی انجام می‌شود. price/Stars/TON نمایش داده می‌شود ولی تأیید مالی در برنامه غیرفعال است.
خروجی مبهم به `needs_reconciliation` می‌رود؛ پیش از تلاش جدید وضعیت واقعی Telegram را بررسی کنید.
callbackهای acknowledgement توکن تصادفی، محدود به account/chat، یک‌بارمصرف و با انقضای ۷ روز دارند؛
هیچ callback فرمان دلخواه یا تغییر دادهٔ workspace اجرا نمی‌کند.

برای دستیار، Threaded mode را در BotFather فعال و assistant را صریحاً روشن کنید. اپراتور با
مجوز `manage_bots` شناسهٔ کاربر Telegram را به کاربر مجاز برنامه لینک می‌کند؛ مالکیت هویت را
پیش از لینک‌کردن بررسی کنید. دسترسی `draft_posts` و مجوز account هنگام اجرا دوباره بررسی می‌شوند.
هر chat/topic تاریخچهٔ مستقل دارد. دستیار فقط تولید/بازنویسی محتوا دارد و به ابزارهای workspace
دسترسی ندارد. draftها با شناسهٔ ثابت و حداکثر یک بار در ثانیه coalesce می‌شوند؛ حالت rich اختیاری است.
پاسخ نهایی با پیام عادی ذخیره می‌شود؛ توقف تولید draftهای بعدی را قطع می‌کند.
پیکربندی AI موجود پروژه طبق [راهنمای شروع](GETTING_STARTED.md) لازم است. تست قراردادها provider را mock می‌کند؛
پیش از rollout، webhook و ارسال واقعی را با bot آزمایشی بررسی کنید.

قرارداد افزودن provider: [PLATFORM_INTEGRATION_CONTRACT.md](PLATFORM_INTEGRATION_CONTRACT.md) و [چک‌لیست onboarding](PLATFORM_PROVIDER_CHECKLIST.md).
