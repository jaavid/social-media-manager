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
