# Typography contract

## Existing assets — reuse

`frontend/src/app/layout.jsx` همین حالا `next/font/local` را با Noto Sans Arabic و Noto Sans، وزن `100 900` و `display: swap` استفاده می‌کند. فونت جایگزین نصب نکنید و فایل‌ها را duplicate نکنید:

- `frontend/src/assets/fonts/NotoSansArabic.woff2`
- `frontend/src/assets/fonts/NotoSans.woff2`
- مجوزهای `OFL.txt` و `OFL-NotoSans.txt` در همان پوشه.

قرارداد خانواده: فارسی/عربی Noto Sans Arabic؛ لاتین Noto Sans. Inter و Vazirmatn جزو هویت این نسخه نیستند. CSS variables موجود `--font-product-arabic` و `--font-product-latin` حفظ شوند. برتری کلی یک فونت ادعا نمی‌شود؛ انتخاب Noto تصمیم این برند است.

| Role | Weight | Size |
| --- | --- | --- |
| Body | 400 | 14–16px |
| Metadata | 400–500 | 12–13px |
| Control | 500 | 14–15px |
| Section | 600 | 18–22px |
| Page title | 700 | 28–32px |
| Marketing display | 800 | 48–64px; responsive |

فارسی: body line-height=1.8 و heading=1.45. لاتین: body=1.55 و heading=1.2. مقادیر آغاز calibration هستند؛ نمونه واقعی تعیین‌کننده است. ارتفاع کنترل از padding و line-height طبیعی محاسبه شود تا نقطه و اعراب بریده نشوند. bold مصنوعی ممنوع؛ تیک/آیکن فونت نیست.

## Acceptance samples

«پیش از انتشار، پیش‌نویس را بازبینی کنید.» / «ی ک پ چ ژ گ» / نیم‌فاصله در «زمان‌بندی» / اعداد ۱۲۳۴۵۶۷۸۹۰ / mixed: `Telegram @workspace 10:30` / email و URL به‌صورت bidi-isolate.

وزن ۴۰۰/۵۰۰/۶۰۰/۷۰۰/۸۰۰، کشیدگی و اعراب، multiline label، جدول، ورودی، عدد KPI و فونت fallback بررسی شوند. فارسی RTL و انگلیسی LTR؛ letter-spacing فارسی صفر؛ شناسه، URL و ایمیل isolate شوند.

Validate در 360/768/1440، zoom=200%، light/dark/system؛ بدون clipping، overflow یا تغییر layout در hydration. تست first paint و local font load موجود حفظ شود؛ request خارجی فونت اضافه نشود.

## Runtime calibration — UI completion batch

The existing local variable faces and OFL licenses are retained. Active serif/Inter/system-ui overrides in quotes, SVG labels and unknown-platform monograms now use the product family. Semantic body prose (p/blockquote) uses weight 400 and locale body line boxes; controls remain 500, sections 600, titles 700 and explicit marketing display headings 800. Legacy main-content inheritance no longer reduces Persian body line-height to 1.5. PageHeader subtitles and settings/workspace/assistant descriptions use the canonical locale metric. Dormant styles/theme.js has no active import consumer and was not turned into a second theme.

Rendered email/URL/phone values in active shell, workspace, management, lead, messaging and end-user views are bidi-isolated; name-or-email fallbacks use auto direction. Inputs keep the existing forced LTR email/URL behavior, Persian spacing remains zero and font synthesis remains disabled.

At 200% zoom the old settings page had duplicate horizontal gutters, a clipped mobile search label and clipped fixed-width navigation. Settings now have one mobile page gutter, search uses its icon plus existing accessible name in narrow space, and mobile tabs can scroll horizontally and receive keyboard focus. Desktop spacing and the product capabilities are retained. Catalog samples include vowel marks, Persian forms, half-space, Persian numerals, mixed content, all five weights and display 800. Normal/200% fa/en light/dark screenshots cover catalog and a real account form at 360/768/1440; detached-main before screenshots cover representative 360/1440 cases. These synthetic fixtures contain no password, API key, QR or backup code.

Final clipping follow-up: profile file selection uses a localized visible Button, with a wrapping filename and the native selector outside the tab order. Discard restores focus to the visible trigger, verified by the existing regression cases and an added trigger test. Settings reflow also follows available content width via a container query, so enlarged text does not leave a narrow form beside the fixed tab sidebar. This uses existing layout and tokens; no font or theme is added.
