# اجرای ساده‌سازی فرانت

این تغییر ادامهٔ [ممیزی اولیه](FRONTEND_SIMPLIFICATION_AUDIT.md) است و مراحل آن را به همان ترتیب اجرا می‌کند. تغییر backend، endpoint، payload، query key، CSS، font، theme، ترجمه و مجوزها در این کار انجام نشده است.

## تغییرهای انجام‌شده

| مرحله | خروجی |
| --- | --- |
| ۰ — baseline | fixture ناشناس تست typography اصلاح شد؛ ۳۰ تصویر خودکار برای ۱۸ سناریو ثبت شد؛ fixtureهای composer، settings و bot بین آزمون‌ها مشترک شدند |
| ۱ — حذف بدون مصرف‌کننده | ۳۶ فایل و ۷۵۹۱ خط کد بدون اتصال به مسیر فعال یا تست حذف شد؛ Tooltip، Radio و ErrorState به‌خاطر قرارداد مستند primitive حفظ شدند؛ fixture اتصال و hook تست‌شده نیز حفظ شدند |
| ۲ — import | importهای دور با `@/` و callerهای facade با domain مشخص جایگزین شدند؛ mockها همان interface واقعی را mock می‌کنند |
| ۳ — مالکیت قابلیت | hook، TelegramComposer و extension نگارش در `features/composer` جمع شدند؛ اجزای editor بات در `features/bots` قرار گرفتند |
| ۴ — client entry | سه صفحهٔ composer/media/queues entry مرورگر شدند؛ ۸ View واسط حذف و ۱۲ صفحهٔ native به entry قابلیت متصل شدند؛ metadata در page سرور باقی ماند |
| ۵ — فایل‌های بزرگ | مدیریت به پنل‌ها و tabها، inspector به fieldهای مشترک و سه گروه فرم، و business settings به سه مجموعهٔ نمایشی تفکیک شد |
| ۶ — مسیرهای قدیمی | چهار page سایهٔ workspace حذف شدند؛ redirectهای دائمی قبلی باقی ماندند؛ fixture و تست صریح برای status 308، query و draft ID اضافه شد |
| ۷ — سازگاری و جلوگیری از بازگشت | facade `services/api.js` و aliasهای `Dialog/Sheet` پس از مهاجرت مصرف‌کنندگان حذف شدند؛ checker اکنون `.mjs`، aliasها و بازگشت facade حذف‌شده را بررسی می‌کند |

نامزدهای حذف از گراف ایستا با جست‌وجوی نام‌ها و exportها در سورس، تست، scripts، تنظیمات و اسناد بررسی شدند. بعضی ارجاع‌های باقی‌مانده در اسناد و JSONهای ممیزی، snapshot تاریخی‌اند و مصرف runtime ندارند. محتوای تاریخی این گزارش‌ها بازنویسی نشده است.

بدنهٔ تابع‌های استخراج‌شده حفظ شد. JSX بخش‌های settings به تابع‌های render بدون hook منتقل شده است تا state، key، ترتیب mount و درخت DOM تغییر نکند. save، draft و recovery همچنان در `SettingsBody` هستند. shared fields بات نیز همان context مشترک قبلی را مصرف می‌کنند؛ context مستقل جدید یا state store تازه اضافه نشده است.

## اندازه و مسیر نگهداری

| شاخص | قبل | بعد |
| --- | ---: | ---: |
| فایل‌های `src`، شامل تست و fixture | ۸۶۹ | ۸۳۰ |
| فایل کد، شامل `.mjs` و تست | ۸۵۳ | ۸۱۳ |
| module کد غیرتست | ۷۶۸ | ۷۲۸ |
| `SettingsPage.jsx` | ۱۸۹۰ خط | ۱۰۳۹ خط |
| `ManagementPage.jsx` | ۱۷۱۵ خط | ۸۰ خط |
| `NodeInspector.jsx` | ۱۷۳۸ خط | ۲۰۶ خط |

کاهش اندازهٔ سه فایل اصلی به‌معنی حذف رفتار آن‌ها نیست؛ بدنه‌ها به فایل مسئول منتقل شده‌اند. مجموع تعداد فایل کد با وجود این تفکیک‌ها، ۴۰ مورد کمتر شده است. تغییرهای دیگر در معماری و runtime، مانند استانداردسازی همهٔ query keyها یا تبدیل hookهای دستی به Query، در این بازآرایی وارد نشده‌اند.

برای نگهداری:

- ابتدا فایل قابلیت را در `features/<feature>` پیدا کنید؛ hook و UI اختصاصی همان‌جا هستند.
- UI عمومی از `components/ui`، قرارداد backend از `services/domains` و Axios مشترک از `services/http/client` مصرف شود.
- نام‌های Modal و Drawer canonical هستند. contract آن‌ها شامل focus، Escape، title و وضعیت کنترل‌شده تغییر نکرده است.
- بعضی صفحات قدیمی همچنان page native دارند؛ فقط چهار alias پایلوت redirect-only شده‌اند. fixture قدیمی ۱۹۱ URL حفظ شده است.

## کنترل ظاهر

runner مجزا `playwright.visual.config.mjs` از API استاندارد `toHaveScreenshot` استفاده می‌کند. ۲۴ تصویر composer شامل حالت آماده و شکست save در دو زبان، دو theme و سه عرض ۳۶۰/۷۶۸/۱۴۴۰ است. شش تصویر دیگر، business settings، management و bot inspector را در فارسی/dark/mobile و انگلیسی/light/desktop پوشش می‌دهند.

داده‌ها مصنوعی‌اند. زمان composer ثابت است؛ fontها آماده می‌شوند؛ animation و transition فقط در محیط تست غیرفعال می‌شوند. محتوای اصلی mask نشده است. آستانهٔ رنگ استاندارد Playwright یعنی `threshold: 0.2` با `maxDiffPixels: 0` استفاده شده است: هیچ پیکسل متفاوت فراتر از آستانهٔ رنگ پذیرفته نمی‌شود. در تکرار baseline قبل از تغییر، آستانهٔ صفر رنگ روی چند پیکسل antialias نوسان داشت؛ افزایش درصد یا تعداد پیکسل مجاز برای پذیرفتن اختلاف تصویر انجام نشده است.

تصاویر baseline برای macOS/Chrome همین اجرا هستند. runner عادی آن‌ها را به‌صورت ضمنی با تصویر Linux مقایسه نمی‌کند؛ اجرای تصویری صریح است. برای مقایسهٔ درست، سیستم‌عامل، نسخهٔ browser و font یکسان لازم است. ثبت baseline جدید روی محیط دیگر باید روی نسخهٔ قبل از تغییر انجام شود، نه برای پذیرفتن خروجی نامعلوم بعد از تغییر.

از `frontend`:

```sh
npm run build
PLAYWRIGHT_CHANNEL=chrome npm run test:visual
```

`--update-snapshots` فقط برای ثبت baseline بازبینی‌شده است؛ برای تأیید بازآرایی اجرا نشود. حفظ ظاهر خارج از این سناریوها با همین نمونه‌ها اثبات نمی‌شود؛ تست‌های رفتار و کنترل overflow نیز لازم‌اند.

## ratchet بدهی موجود

در baseline lint و i18n فقط رکورد فایل حذف‌شده پاک یا بدهی همان متن/قانون به محل جدید منتقل شد. نقل متن بر اساس kind/text و مجموع count قبلی کنترل شد؛ اجازهٔ متن یا warning تازه برای سبزکردن بررسی‌ها اضافه نشده است. هفت وابستگی baseline معماری از ممیزی اولیه هنوز موجودند؛ این کار بازآرایی کامل همهٔ قابلیت‌ها نیست.

## اعتبارسنجی

| کنترل | نتیجه |
| --- | --- |
| build تولیدی Next | موفق |
| Jest | ۸۵ suite، ۴۳۹ تست موفق |
| TypeScript، استقلال Next و معماری | موفق؛ بدون تخلف جدید |
| lint | ۸۱۳ فایل، ۳۷۰ finding موجود؛ صفر error و regression |
| i18n | ۱۵۷۰ نامزد موجود؛ صفر متن جدید خارج از baseline؛ ۸۶۲ کلید |
| مقایسهٔ تصویر | ۱۸ تست، ۳۰ تصویر؛ موفق بدون بازثبت baseline بعد از تغییر |
| بررسی whitespace با `git diff --check` | موفق |

اجرای گستردهٔ مرورگر ۷۲۹ سناریو داشت: ۷۰۱ مورد در اجرای نخست موفق شدند. ۱۶ شکست به شمارش درخواست‌های غیرمرتبط در fixture composer یا انتظار URL قدیمی مربوط بودند؛ هشت شکست به در دسترس نبودن هدر شناسهٔ پیگیری fixture در API بین‌دامنه‌ای مربوط بودند. چهار شکست inbox از تداخل پوشهٔ خروجی دو runner هم‌زمان بود. شمارنده فقط عملیات composer را می‌شمارد، انتظار مقصد canonical اصلاح شده و fixture هدرهای تشخیصی را با `Access-Control-Expose-Headers` در اختیار مرورگر می‌گذارد. assertionهای حفظ draft، منع replay، مجوز و recovery حذف نشده‌اند. بازاجرای دو مجموعهٔ composer recovery و P1 با ۳۰ تست و سپس سه مجموعهٔ stage5 composer، inbox و باقی recoveryها با ۷۸ تست، کامل موفق شد. خروجی بازاجرای نهایی مجزا بود؛ اصلاح این موارد تغییری در کد محصول ایجاد نکرد.

اجرای local از Node 22 و Chrome نصب‌شده استفاده می‌کند؛ محیط Node 20/Linux CI جداست. APIها در تست مرورگر مصنوعی‌اند؛ provider واقعی و production بررسی نشده‌اند. تغییرات در checkout محلی‌اند و هنوز commit، push یا deploy نشده‌اند.
