# بررسی ساده‌سازی فرانت بدون تغییر رفتار و ظاهر

تاریخ: ۲۰۲۶-۱۰-۰۹. مبنا: checkout محلی شاخهٔ `main`، commit `3565dcf`، با working tree تمیز پیش از بررسی. این سند پیشنهاد بازآرایی است؛ کد اجرایی تغییر نکرده است.

## نتیجهٔ اصلی

راه مناسب، مرتب‌کردن مالکیت هر قابلیت و حذف واسطه‌های اثبات‌شده است. تخت‌کردن کل درخت مسیرها یا بازنویسی فرانت هزینه و ریسک بیشتری دارد. بیشترین عمق پوشه در `app` هفت سطح است، اما بیرون از آن فقط سه سطح دیده شد. بنابراین مشکل صرفاً «پوشهٔ تو‌در‌تو» نیست: مسئولیت یک قابلیت در چند ریشه پراکنده شده و بعضی فایل‌ها چند مسئولیت بزرگ را یک‌جا انجام می‌دهند.

ساختار Next، layoutهای نقش‌ها، جداسازی عمومی/خصوصی، UI primitives و قراردادهای بازیابی خطا ارزش واقعی دارند. باید حفظ شوند. هدف، کوتاه‌ترشدن مسیر پیدا کردن و تغییر یک قابلیت، کم‌شدن واسطه‌های بدون رفتار و محدودشدن اثر تغییرات است؛ کاهش تعداد فایل به‌تنهایی معیار موفقیت نیست.

## دامنه و روش بررسی

- شمارش کامل فایل‌های `frontend/src`، اندازهٔ فایل‌ها، عمق پوشه‌ها و قراردادهای مسیر.
- تحلیل AST import، re-export و import پویا با مقصد رشته‌ای، شامل `.js/.jsx/.ts/.tsx/.mjs`، برای یافتن مصرف‌کنندگان و دسترسی از entryهای `app`، `proxy` و `instrumentation`.
- مطالعهٔ نمونه‌های حساس: providerها، session مرورگر و سرور، navigation، shell، composer، settings، dashboard، analytics، recovery، HTTP، cache، realtime و marketing.
- مطالعهٔ کنترل‌های معماری، lint، i18n، Jest، Playwright و اسناد مهاجرت.
- اجرای کنترل‌های محلی موجود؛ نتیجهٔ مرورگر در انتهای سند ثبت می‌شود.

این بررسی، ممیزی ساختاری همهٔ سورس و مطالعهٔ هدفمند مسیرهای مهم است؛ اجرای دستی تمام امکانات یا تأیید production نیست. گراف ایستا importهای محاسبه‌شده و قراردادهای خارج از سورس را اثبات نمی‌کند. پیشنهاد حذف نیاز به بررسی متن، تنظیمات و قراردادها دارد.

## تصویر فعلی

| شاخص | نتیجهٔ مشاهده‌شده |
| --- | ---: |
| همهٔ فایل‌های `src` | ۸۶۹ |
| فایل‌های JS/JSX/TS/TSX | ۸۵۲ |
| فایل کد با احتساب یک `.mjs` | ۸۵۳ |
| ماژول‌های کد بدون فایل تست | ۷۶۸ |
| پوشه‌ها | ۲۹۸ |
| فایل‌های کد `app` | ۳۸۳ |
| `page` | ۲۱۶ |
| `layout` | ۱۲ |
| `View.jsx` | ۱۴۱ |
| View حداکثر شش‌خطی با `return <Feature />` | ۱۱۶ |
| مقصد یکتای import مستقیم در ۱۱۵ View؛ یک View دیگر dynamic است | ۷۷ |
| فایل کد `features` | ۱۴۸ |
| فایل کد `components` | ۱۸۴ |
| فایل کد مستقیم در ریشهٔ `features`، بدون تست | ۵۷ |
| فایل بدون تست با بیش از ۵۰۰ خط | ۳۱ |
| import/re-export نسبی با حداقل سه `../`، بدون تست | ۳۴۵ |
| مسیرهای fixture قدیمی | ۱۹۱ |

شمارش فایل‌ها شامل تست و fixture است مگر خلافش تصریح شده باشد. ۱۹۱ مسیر fixture با ۲۱۶ صفحه یکی نیست: fixture، فهرست حفظ URLهای قدیمی است، نه فهرست کامل امکانات فعلی.

## یافته‌های اولویت‌دار

### ۱. واسطه‌های مسیر تکراری؛ فرصت کاهش فایل با ریسک کنترل‌شدنی

نمونهٔ فعلی composer:

```text
app/.../dashboard/composer/page.jsx
  → app/.../dashboard/analytics/composer/View.jsx
    → features/composer/ComposerPage.jsx
```

مسیر admin نیز View خودش را برای همان قابلیت دارد. `page` مسئول metadata سرور است؛ `View` با `use client` مرز رندر مرورگر را ایجاد می‌کند. حذف این مرز بدون جایگزین درست، خطر دارد. نامزدهای اولیه همان ۱۱۶ View ساده‌اند؛ ۲۵ View دیگر شامل انتخاب پارامتر، نقش یا props هستند و نباید یکسان فرض شوند.

پیشنهاد: پس از هم‌مکان‌کردن وابستگی‌های قابلیت، entry مرورگر را در خود قابلیت تعریف کنیم و صفحات native همان را import کنند. برای مثال `features/composer/ComposerPage.jsx` می‌تواند entry مرورگر شود، اگر همهٔ مصرف‌کنندگان و imports آن با این نقش سازگار باشند. `page` همچنان سروری و صاحب metadata بماند. entry فقط برای سازگاری یک مسیر خاص ایجاد نشود؛ یک entry برای یک قابلیت کافی است. از این ۱۱۶ View، مورد fullscreen bot editor از dynamic import استفاده می‌کند؛ حتی کوتاه‌بودن فایل مجوز تغییر lazy loading یا SSR آن نیست.

کاهش ۱۱۶ فایل، سقف فرصت مشاهده‌شده است، نه تعهد. اگر بعضی entryها هنوز نیاز به adapter اختصاصی داشته باشند، کاهش کمتر خواهد بود. صرفاً انتقال همهٔ Viewها به یک پوشه، پیچیدگی را کم نمی‌کند.

در `next.config.mjs` برای URLهای قدیمی `/dashboard/analytics/<tool>` redirect دائمی وجود دارد. بااین‌حال بعضی صفحات جدید هنوز View زیر همان پوشه‌های قدیمی را import می‌کنند. ابتدا این وابستگی قطع شود؛ سپس دربارهٔ حذف pageهای سایه تصمیم بگیریم. خود redirect، query، شناسهٔ پویا و URLهای قدیمی باید باقی بمانند. تست inventory فعلی مالکیت هر URL توسط page native را الزام می‌کند؛ تغییر این فرض نیاز به آزمون قرارداد redirect، بدون کاهش پوشش URL، دارد.

### ۲. فایل‌های بدون اتصال به مسیرهای فعال؛ بالاترین اولویت پاک‌سازی

تحلیل گراف ۴۱ فایل غیرتست را خارج از دسترسی entryهای فعال پیدا کرد. دو مورد مصرف‌کنندهٔ تست دارند: fixture اتصال‌ها و `useDashboardToday`. ۳۹ مورد دیگر در این گراف مصرف‌کنندهٔ تست هم ندارند؛ مجموعاً ۷۸۰۲ خط. این عدد شامل بعضی فایل‌هایی است که یکدیگر را import می‌کنند، اما به مسیر فعالی متصل نیستند.

نمونه‌های مهم:

- `components/shell/AIAssistantPanel.jsx`: ۱۰۱۸ خط، بدون import ورودی مشاهده‌شده.
- `components/FacebookConnectModal.jsx`: ۶۳۶ خط، بدون import ورودی مشاهده‌شده.
- `components/dashboard/TodayDashboard.jsx`: ۵۱۴ خط، بدون import ورودی مشاهده‌شده.
- `services/demoData.js` و `services/exportPDF.js`: خارج از گراف مسیرهای فعال.
- ابزارهای قدیمی marketing، mobile و widgetها؛ فهرست کامل در ضمیمه.

پیشنهاد: برای هر گروه، بررسی نام/export در کل repository، ثبت مسیر جایگزین فعلی یا نبود قرارداد بیرونی، حذف در تغییر کوچک و اجرای build و تست مرتبط. فایل تست و fixture صرفاً به‌دلیل نبود اتصال به app حذف نشوند. `setupTests.js` و `testStyleMock.js` عمداً از نامزدها خارج شدند؛ Jest آن‌ها را از تنظیمات استفاده می‌کند.

نبود import، اثبات قابل‌حذف‌بودن محصولی نیست. فایل ممکن است برای توسعه یا قراردادی خارج از گراف نگهداری شده باشد. این سند هیچ‌کدام را حذف نکرده است.

### ۳. مالکیت پراکندهٔ قابلیت‌ها؛ علت اصلی سختی تغییرات

نمونه‌ها:

- composer در `features/composer`، `hooks/useComposer.js`، `services/domains/composer.ts`، `publishing.js` و extensionهای `components/connections` پخش است.
- analytics عمدتاً در `components/analytics/AnalyticsSurface.jsx` است، با قرارداد داده در `services/domains/analytics-reports.ts`؛ root `features` هم صفحات گزارش و ROI دارد.
- bot editor در `features/bots` است، ولی `NodeInspector.jsx` با ۱۷۳۸ خط در `components/bot` قرار دارد.
- settings هم `features/settings/components` دارد و هم parserهای اختصاصی در `lib` و recovery مشترک در `components/ui`.

پیشنهاد: فایل‌های اختصاصی هر قابلیت در همان پوشهٔ قابلیت باشند. اجزای واقعاً مشترک در محل مشترک بمانند؛ مصرف‌کنندهٔ متعدد به‌تنهایی دلیل عمومی‌بودن نیست، مثلاً editor ادمین و workspace می‌تواند یک قابلیت باشد.

برای کاهش پیچیدگی، پوشه‌های اجباری `components/hooks/services/types/utils` زیر تک‌تک قابلیت‌ها نسازیم. پوشهٔ معمولی ۳ تا ۸ فایل مستقیم داشته باشد؛ فقط برای مجموعهٔ واقعی و بزرگ از یک زیرپوشه مانند `sections` استفاده شود. تعداد فایل پیشنهادی قاعدهٔ سخت یا هدف تست نیست.

### ۴. فایل‌های چندمسئولیتی بسیار بزرگ؛ نیاز به تفکیک محدود

| فایل | خط | تفکیک پیشنهادی |
| --- | ---: | --- |
| `features/settings/SettingsPage.jsx` | ۱۸۹۰ | orchestrator صفحه، بخش‌های فرم مرتبط، مدیریت draft/save |
| `components/bot/NodeInspector.jsx` | ۱۷۳۸ | انتخاب editor براساس نوع node، editorهای گروهی، validation مشترک |
| `features/management/ManagementPage.jsx` | ۱۷۱۵ | فهرست/فیلتر، جزئیات درخواست، عملیات وضعیت |
| `features/ClientOnboardingPage.jsx` | ۱۶۲۱ | مراحل onboarding، مدیریت draft و submit |
| `features/PostIdeasPage.jsx` | ۱۵۶۶ | درخواست تولید، نتیجه‌ها، عملیات انتخاب/ذخیره |
| `features/workspaces/AllClientsPage.jsx` | ۱۱۹۲ | collection، فیلترها و dialogهای عملیات |

تفکیک براساس مسئولیت تغییر باشد، نه تعداد خط. بیرون‌کشیدن هر تابع یا هر بخش JSX در یک فایل جدا، مشکل تعداد فایل را بدتر می‌کند. ثابت‌های فرم فقط وقتی جدا شوند که واقعاً مطالعه و استفادهٔ مستقل دارند.

استخراج hook مدیریت فرم باید در تغییر جدا از استخراج JSX انجام شود؛ انتقال state، key یا ترتیب mount می‌تواند draft، focus، انتخاب فایل و requestها را تغییر دهد. در مرحلهٔ اول JSX، props، نام fieldها و درخت DOM حفظ شوند.

### ۵. facade API هنوز محل اصلی وابستگی است

`services/api.js` اکنون facade سازگاری است و خودش اجرای HTTP ندارد. ۹۳ declaration واردکنندهٔ مستقیم مسیر `services/api` و ۳ re-export وابسته به همین facade در سورس غیرتست مشاهده شد؛ در مقابل ۳۲ declaration مسیر `services/domains/...` را مصرف می‌کنند.

پیشنهاد: در هر قابلیت، importهای facade به domain موجود تبدیل شوند، بدون تغییر endpoint، payload، `.data`، timeout یا semantics پاسخ. facade تا مهاجرت آخرین مصرف‌کننده و mock باقی بماند؛ برای دورهٔ گذار فقط یک facade کافی است.

`identity.js`، `auth.ts`، `publishing.js`، `composer.ts` و `connections.ts` الزاماً پیاده‌سازی تکراری نیستند. مثال: `identity.js`، `authAPI` را از `auth.ts` re-export می‌کند. ادغام کور آن‌ها ممکن است قراردادهای typed و parserهای جدید را از بین ببرد.

HTTP مشترک `services/http/client.ts`، CSRF، session epoch، invalidation در 401 و تبدیل workspace vocabulary را یک‌جا نگه دارد. client عمومی و خصوصی به‌دلیل تفاوت credentials جدا بمانند.

### ۶. hookهای عمومی و query keyها نیاز به مالکیت روشن دارند

`hooks/useData.js` تاریخ، workspace، summary، timeseries، posts، OAuth، overview، logs و lookup را کنار هم نگه می‌دارد؛ برخی readها TanStack Query و برخی state/effect دستی دارند. این دو الگو در رفتار cancellation، cache و recovery متفاوت‌اند.

پیشنهاد اولیه فقط جابه‌جایی hookهای اختصاصی به قابلیت مالک، با همان interface و query key است. تبدیل readهای دستی به Query یک تغییر رفتاری جداست و در PR جابه‌جایی وارد نشود.

کلیدهای inline در composer و analytics در کنار `QK` وجود دارند. جمع‌کردن آن‌ها برای خوانایی قابل بررسی است، ولی شکل آرایه، scope هویت/workspace و ارتباط با `useRealtimeSync` حفظ شود. هماهنگ‌کردن همهٔ keyها بدون قرارداد مشخص، ممکن است invalidation یا جداسازی workspace را خراب کند.

### ۷. `components/ui` مخلوطی از primitive و منطق محصول دارد

Button، Input، Modal، Drawer، Tabs و DataState primitive مشترک‌اند. فایل‌هایی مانند `GoalTracker`، `GMBWidget`، `CompetitorSection`، `ShareReportModal` و `accountRecovery` مسئولیت محصول یا اتصال session/query دارند.

موارد فعال به قابلیت مالک منتقل شوند؛ موارد واقعاً بلااستفاده طبق فرایند حذف بررسی شوند. recovery مشترک باید یک module با interface محدود باقی بماند؛ `useCheckedAction` رفتار عدم تکرار عملیات نامطمئن، قفل submit و focus خطا را نگه می‌دارد و واسطهٔ بی‌فایده نیست.

`Dialog.tsx → Modal.tsx` و `Sheet.tsx → Drawer.tsx` adapter سازگاری بسیار کوچک‌اند. بعد از مهاجرت همهٔ مصرف‌کنندگان می‌توان نام را یکدست کرد؛ اولویت آن‌ها از پاک‌سازی فایل‌های بزرگ بلااستفاده پایین‌تر است.

### ۸. importهای بلند هزینهٔ ذهنی و جابه‌جایی را زیاد می‌کنند

alias `@/* → src/*` از قبل در TypeScript و Jest وجود دارد. ۳۴۵ import/re-export غیرتست با حداقل سه `../` یافت شد. import بین ریشه‌ها با alias انجام شود؛ import نزدیک داخل یک قابلیت نسبی بماند. این کار عمق لازم Next را حفظ می‌کند و ریسک اشتباه مسیر در جابه‌جایی را کم می‌کند.

استفاده از `index` برای exportکردن همه‌چیز یا wildcard barrel اجباری پیشنهاد نمی‌شود؛ ممکن است dependency و مرز server/client را پنهان کند. entry کوچک فقط برای مصرف‌کنندهٔ واقعی لازم است.

## ساختار پیشنهادی

این تغییر از ساختار فعلی ادامه پیدا می‌کند و نام ریشه‌های جدیدی مثل infrastructure یا application-layer اضافه نمی‌کند.

```text
src/
  app/                      مسیر native، metadata، layout، error و loading
  core/                     session، provider، navigation، shell و realtime مشترک
  features/
    composer/
      ComposerPage.jsx       entry مرورگر در صورت سازگاری همهٔ مصرف‌کنندگان
      QueueManagerPage.jsx
      MediaLibraryPage.jsx
      useComposer.js
    analytics/
      AnalyticsPage.jsx
      reportQueries.js
    settings/
      SettingsPage.jsx
      useBusinessProfile.js
      sections/              فقط چون مجموعهٔ واقعی بخش‌های فرم وجود دارد
    bots/                    editor، inspector و viewهای مربوط
    marketing/               محتوای عمومی و rendererهای مرتبط
    ...                      workspaces، inbox، agency، marketplace و ...
  components/
    ui/                      primitive و نمایش حالت مشترک
    layout/                  ساختار نمایشی مشترک
    ...                      فقط مجموعه‌های واقعاً مشترک
  services/
    http/                    transport، CSRF و خطای استاندارد
    domains/                 قراردادهای backend و parserهای وابسته
    queryClient.ts
    api.js                   facade گذار تا پایان مهاجرت مصرف‌کنندگان
  lib/                       ابزار مستقل از قابلیت و زیرساخت runtime/auth
  i18n/                      locale و فرهنگ‌های فعلی
  stores/                    state مشترک مرورگر
  styles/                    CSS، tokens و ترتیب فعلی import
```

برای شروع، فایل‌های API در `services/domains` بمانند. هم‌زمان جابه‌جایی قرارداد API به feature، hook به feature و تغییر سیستم routing، diff را بزرگ و بازبینی را سخت می‌کند. اگر بعداً مالکیت domain مبهم بود، جداگانه اصلاح شود.

## قسمت‌هایی که در این بازآرایی حفظ می‌شوند

- `app`، گروه‌های نقش و تفاوت fullscreen/shell؛ انتقال layout می‌تواند mount و state را تغییر دهد.
- سه سطح provider عمومی، account و private runtime. ادغام آن‌ها ممکن است session/WebSocket را به صفحات عمومی اضافه کند.
- کنترل session سرور و مرورگر. نسخهٔ فعلی session cookie را روی سرور هم بررسی و هویت حداقلی را به provider می‌دهد؛ متن قدیمی `NEXT_MIGRATION.md` دربارهٔ JWT فقط در مرورگر تمام رفتار امروز را توصیف نمی‌کند.
- پاک‌سازی cache هنگام تغییر هویت در `AppProviders`، epoch session، sync چند tab و جداسازی دادهٔ workspace.
- navigation state، MFA handoff، Back/Forward، hash، query، active menu و redirectهای قدیمی. `core/navigation.tsx` در ۷۴ module غیرتست مصرف می‌شود؛ حذف یک‌بارهٔ آن مناسب این هدف نیست.
- CSS و ترتیب import در root، fontها، tokens، ترجمه، theme و markup. `legacy.css` هنوز فعال است؛ اسم legacy دلیل حذف نیست.
- فرهنگ `tr` و `t`، ترجیح زبان خصوصی و فارسی اجباری عمومی. تبدیل کامل ترجمه‌ها در همین کار پیشنهاد نمی‌شود.
- رفتار timeout، malformed payload، stale data، offline، 401/403/404/429/5xx و نتیجهٔ نامطمئن عملیات نوشتن.
- مدل React Query برای دادهٔ سرور و Zustand برای state مشترک مرورگر. تغییر مدیریت state یا کتابخانه‌ها لازم نیست.

## برنامهٔ اجرایی پیشنهادی و شرط پایان هر مرحله

| مرحله | تغییر محدود | شرط پایان | ریسک |
| --- | --- | --- | --- |
| ۰ | ثبت baseline مسیر، رفتار، ظاهر و requestها با fixture ثابت | baseline قابل تکرار برای قابلیت اول | کم |
| ۱ | بررسی و حذف گروه‌های کد بدون مصرف‌کننده | هر حذف دارای شواهد؛ build و کنترل‌های مرتبط سبز | کم تا متوسط |
| ۲ | aliasکردن imports بلند و تغییر facade import به domain | importها resolve شوند؛ interface و mockها حفظ شوند | کم |
| ۳ | هم‌مکان‌کردن یک قابلیت، مثلاً composer، بدون تغییر منطق | تست قابلیت، نقش‌ها، workspace و تصاویر برابر | متوسط |
| ۴ | انتقال client entry و حذف Viewهای سادهٔ همان قابلیت | metadata و hydration و mount رفتار برابر | متوسط |
| ۵ | تفکیک settings، bot inspector و management، هرکدام مستقل | draft، save، recovery، DOM و focus برابر | متوسط تا زیاد |
| ۶ | قطع import از routes قدیمی و بررسی حذف pageهای سایه | URL، status redirect، query و ID حفظ شوند؛ inventory اصلاح شود | متوسط |
| ۷ | جمع‌کردن adapterهای گذار و قواعد جلوگیری از بازگشت | هیچ caller قدیمی؛ baseline بدهی کاهش پیدا کند | کم تا متوسط |

این مراحل به چند PR محدود تقسیم شوند. یک PR نباید جابه‌جایی فایل، تغییر state، تغییر CSS و تغییر keyهای Query را با هم انجام دهد. بعد از مرحلهٔ ۲، مراحل ۳ و ۴ ابتدا فقط روی یک قابلیت پایلوت شوند.

برآورد اولیهٔ برنامه‌ریزی برای یک توسعه‌دهندهٔ آشنا به پروژه: ثبت baseline و پایلوت ۲ تا ۴ روز؛ پاک‌سازی و مالکیت چند قابلیت ۴ تا ۸ روز؛ تفکیک فایل‌های بزرگ و جمع‌کردن سازگاری ۵ تا ۱۰ روز. مجموع ۱۱ تا ۲۲ روز کاری، همراه با بازبینی و بررسی مرورگر، برآورد است نه تعهد. بررسی live providerها و بازآرایی همهٔ ۳۱ فایل بزرگ در این تخمین فرض نشده است.

## چگونه حفظ رفتار و ظاهر قابل بررسی شود

### قرارداد مسیر و دسترسی

URL و aliasها، status HTTP، query، params، canonical، metadata، 404 و redirect مقصد قبل و بعد یکسان باشند. کاربر ناشناس، client، staff، superadmin، agency و end-user آزموده شوند. تست‌های `next-migration`، `workspace-navigation-layout`، `Protected` و `routeInventory` نقطهٔ شروع‌اند؛ پوشش کامل نقش‌ها از صرف پاس‌شدن این تست‌ها نتیجه نمی‌شود.

### قرارداد داده و عملیات

قبل و بعد برای قابلیت پایلوت، method/path/payload درخواست‌ها، scope هویت/workspace، cancellation و invalidation ثبت و مقایسه شود. تعویض workspace، logout/login، Back، draft، upload، ذخیره و recovery پوشش داده شوند. درخواست نوشتن در timeout یا 5xx خودکار تکرار نشود؛ نمایش success فقط طبق قرارداد موجود باشد. fixtureهای malformed و unavailable نیز حفظ شوند.

### قرارداد تصویر و تعامل

در e2e موجود `page.screenshot` فراوان است، اما جست‌وجو هیچ `toHaveScreenshot` پیدا نکرد. ذخیرهٔ تصویر، شکست خودکار برای تغییر ظاهری ایجاد نمی‌کند. برای قابلیت‌های در حال بازآرایی baseline تصویری خودکار لازم است، با browser/OS/font ثابت، داده و زمان ثابت، پایان animation و آماده‌بودن `document.fonts`.

ماتریس پایه: عرض ۳۶۰، ۷۶۸ و ۱۴۴۰؛ light/dark؛ فارسی/انگلیسی برای صفحات خصوصی. صفحات عمومی طبق قرارداد فارسی باقی بمانند. حالت system، keyboard focus، dialog، loading، empty، stale و error برای viewهای مرتبط اضافه شوند. فقط نواحی واقعاً متغیر mask شوند؛ maskکردن محتوای اصلی یا بالا بردن tolerance برای سبزکردن تست پذیرفتنی نیست.

تفاوت wrapperهای DOM، keyها، ترتیب mount، specificity و ترتیب CSS حتی بدون تغییر classها می‌تواند ظاهر یا تعامل را تغییر دهد. به همین دلیل build/Jest به‌تنهایی تضمین «بدون تغییر ظاهر» نیستند. برابری تصویر هم جای بررسی عملیات و مجوز را نمی‌گیرد.

### معیارهای نگهداری

- هر قابلیت مالک مشخص و مسیر ورودی روشن داشته باشد؛ تغییر معمولی آن نیاز به جست‌وجو در چند ریشه نداشته باشد.
- shared به feature وابسته نشود؛ هم‌استفاده‌شدن قابلیت در dashboard/admin مجاز است و باید صریح مدل شود.
- ۷ مورد baseline معماری بازبینی شوند: checker فعلی فایل مستقیم زیر `features` را نام feature فرض می‌کند، بنابراین برخی موارد مثل blog و فرم حقوقی، مسئلهٔ طبقه‌بندی هم دارند. فقط ساخت پوشهٔ جدید برای سبزکردن checker کافی نیست.
- checker فعلی `.mjs` را اسکن نمی‌کند؛ ممیزی AST این سند آن را هم پوشش داده است. برای کنترل آینده، پوشش پسوندها و importهای خاص باید صریح باشد.
- baseline lint به مسیر فایل وابسته است. پس از move، warning قدیمی ممکن است regression شناخته شود. فقط کلید همان warning منتقل شود؛ کل baseline برای پنهان‌کردن مشکل بازنویسی نشود.
- عدد فایل و اندازهٔ فایل، معیار کمکی‌اند؛ interface، مسیر تغییر و رفتار ثابت معیار اصلی‌اند.

## اعتبارسنجی انجام‌شده

روی محیط فعلی Node `22.21.1` اجرا شد؛ CI پروژه Node 20 است، بنابراین همسانی کامل محیط CI ادعا نمی‌شود.

| کنترل | نتیجه |
| --- | --- |
| `npm run check:architecture` | ۷۶۷ module؛ ۷ finding پذیرفته‌شده؛ صفر مورد جدید؛ صفر نقض client/server؛ چرخه‌ای گزارش نشد |
| `npm run check:next` | استقلال Next و تطابق slugها تأیید شد |
| `npm run typecheck` | موفق |
| `CI=true npm test -- --runInBand` | ۸۵ suite و ۴۳۹ test موفق |
| `npm run build` | موفق |
| `npm run lint` | ۸۵۳ فایل؛ ۴۰۴ finding موجود؛ صفر error و صفر regression |
| `npm run i18n:check` | ۸۶۲ کلید semantic بررسی شد؛ ۱۷۵۲ candidate در baseline و صفر مورد جدید؛ این عدد پوشش ترجمه نیست |

### بررسی مرورگر و شکست‌های baseline

سه suite موجود `next-migration.spec.js`، `workspace-navigation-layout.spec.js` و `typography.spec.js` با Chrome روی build production محلی اجرا شدند: ۵۳ تست موفق، ۲ تست ناموفق، مجموع ۵۵ تست. کنترل همهٔ ۱۹۱ URL fixture، دسترسی/نقش‌های نمونه، navigation، workspace composer/inbox در عرض ۱۴۴۰ و ۳۹۰ و بیشتر کنترل‌های تایپوگرافی پاس شدند. این اجرای منتخب جای اجرای کل e2e را نمی‌گیرد.

هر دو شکست در `typography.spec.js:118`، مسیر `/`، theme روشن و تیره بودند. تست برای تمام APIها پاسخ موفق `{}` mock می‌کند. `components/marketing/ReturningUserRedirect.jsx` بدون شرط اولیه `authAPI.me()` را می‌خواند و پاسخ موفقِ فاقد role را به `/dashboard` هدایت می‌کند. snapshot شکست به‌جای عنوان marketing، حالت «ارتباط با حساب شما ممکن نیست» را نشان داد؛ سپس selector `h1[data-typography="display"]` پیدا نشد. این شواهد، ناسازگاری fixture ناشناس با رفتار redirect فعلی را توضیح می‌دهند؛ مشکل font یا تغییر ناشی از بازآرایی اثبات نشده است.

قبل از تبدیل این تست به معیار برابری تصویر، fixture anonymous باید پاسخ صریح 401 برای `/auth/me/` بدهد و مقصد صفحه هم assert شود. این اصلاح تست در دامنهٔ بررسی حاضر اجرا نشده است. همچنین comment «Anonymous visits ... without starting a session» در ReturningUserRedirect و ادعای عمومی اسناد با فراخوانی بی‌قید فعلی سازگار نیست؛ تست نبود auth برای privacy/features/product/blog، `/` را پوشش نمی‌دهد. تصمیم دربارهٔ تغییر درخواست home یک تغییر رفتاری مستقل است، نه بخشی از move ساده.

تست‌ها ۴۸ تصویر tracked را بازنویسی کردند؛ فقط خروجی تولیدشدهٔ همین اجرا به نسخهٔ ابتدای بررسی برگردانده شد. تغییر نهایی repository فقط همین گزارش است.

وضعیت فعلی برای شروع برنامه‌ریزی روشن است، اما baseline مرورگر کاملاً سبز نیست. بدهی lint، وابستگی‌های پذیرفته‌شده و نبود مقایسهٔ تصویری خودکار هم باقی‌اند. اجرای backend، provider واقعی یا production در این بررسی انجام نشده است.

## ضمیمه: نامزدهای بررسی حذف

این جدول خروجی گراف ایستا است، نه مجوز حذف. تعداد خطوط بدون افزودن خط خالی مصنوعی انتهای فایل محاسبه شده است. «ورودی» فقط import/re-export سورس کد است.

| فایل زیر `frontend/src` | خط | ورودی غیرتست | ورودی تست |
| --- | ---: | ---: | ---: |
| `components/BotChannelConnectModal.jsx` | 98 | 0 | 0 |
| `components/FacebookConnectModal.jsx` | 636 | 0 | 0 |
| `components/ai/ChartAnnotations.jsx` | 204 | 0 | 0 |
| `components/ai/TodayBriefing.jsx` | 217 | 0 | 0 |
| `components/charts/Charts.jsx` | 190 | 0 | 0 |
| `components/dashboard/TodayDashboard.jsx` | 514 | 0 | 0 |
| `components/home/DashboardMockup.jsx` | 304 | 0 | 0 |
| `components/marketing/FAQ.jsx` | 99 | 0 | 0 |
| `components/marketing/LogoCarousel.jsx` | 107 | 0 | 0 |
| `components/marketing/TestimonialMasonry.jsx` | 101 | 0 | 0 |
| `components/marketplace/SendManageRequestModal.jsx` | 385 | 0 | 0 |
| `components/mobile/BottomSheet.jsx` | 85 | 0 | 0 |
| `components/mobile/PullToRefresh.jsx` | 70 | 0 | 0 |
| `components/mobile/SkeletonLoader.jsx` | 37 | 0 | 0 |
| `components/mobile/SwipeableCard.jsx` | 65 | 0 | 0 |
| `components/shell/AIAssistantPanel.jsx` | 1018 | 0 | 0 |
| `components/ui/AIInsightCard.jsx` | 268 | 0 | 0 |
| `components/ui/AlertBell.jsx` | 158 | 0 | 0 |
| `components/ui/BestPostWidget.jsx` | 323 | 0 | 0 |
| `components/ui/CountUp.jsx` | 73 | 0 | 0 |
| `components/ui/ErrorState.jsx` | 58 | 1 | 0 |
| `components/ui/GMBWidget.jsx` | 245 | 0 | 0 |
| `components/ui/GoalTracker.jsx` | 151 | 0 | 0 |
| `components/ui/MetricChart.jsx` | 165 | 0 | 0 |
| `components/ui/OnboardingChecklist.jsx` | 257 | 0 | 0 |
| `components/ui/ProgressBar.jsx` | 97 | 0 | 0 |
| `components/ui/Radio.jsx` | 108 | 0 | 0 |
| `components/ui/StaticContentPage.jsx` | 111 | 0 | 0 |
| `components/ui/Tooltip.tsx` | 45 | 0 | 0 |
| `features/AdminOnboardingPage.jsx` | 263 | 0 | 0 |
| `features/ContentCalculatorPage.jsx` | 190 | 0 | 0 |
| `features/NoAccessPage.jsx` | 80 | 0 | 0 |
| `features/marketing/ComingSoonPage.jsx` | 142 | 0 | 0 |
| `hooks/useDashboardToday.js` | 52 | 1 | 1 |
| `hooks/usePermissions.js` | 61 | 0 | 0 |
| `hooks/useSwipe.js` | 39 | 0 | 0 |
| `services/__fixtures__/connections.js` | 17 | 0 | 6 |
| `services/apiErrors.js` | 29 | 0 | 0 |
| `services/demoData.js` | 497 | 0 | 0 |
| `services/exportPDF.js` | 240 | 0 | 0 |
| `styles/theme.js` | 72 | 0 | 0 |
