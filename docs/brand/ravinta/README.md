# راوینتا — Ravinta

مرجع هویت پیشنهادی محصول؛ نسخهٔ ۱.۱. شعار: **از ایده تا اثر**.

- [برندبوک بصری](brandbook.html): در مرورگر از checkout ریپو باز کنید؛ raw GitHub آن را اجرا نمی‌کند.
- [قواعد برند](BRAND.md) و [قرارداد تایپوگرافی](TYPOGRAPHY.md).
- [پالت ماشین‌خوان](palette.json) و [نگاشت به توکن‌های محصول](TOKEN_MAPPING.md).
- [لوگوی نفتی](assets/mark-petrol.svg)، [لیمویی](assets/mark-lime.svg)، [سفید](assets/mark-white.svg)، [سیاه](assets/mark-black.svg) و [آیکن برنامه](assets/app-icon.svg).

نام همچنان پیشنهاد است؛ آزادبودن دامنه، شناسه‌های اجتماعی و امکان ثبت علامت تأیید نشده است. نشان هندسی آمادهٔ استفاده است؛ نوشته‌های فارسی/لاتین لوگو هنوز به‌صورت outline نهایی نشده‌اند.

## مرز این بسته

این فایل‌ها مرجع طراحی‌اند؛ محصول در این PR تغییر ظاهر یا نام نمی‌دهد. تنها منبع runtime رنگ، theme و typography، `frontend/src/styles/tokens.css` و loader موجود در `frontend/src/app/layout.jsx` است. برای UI یک theme موازی نسازید. دارایی قدیمی کاغذی، مرجع نسخهٔ تازه نیست.

## مالکیت اجرا

#103 مالک primitives، shell و page patterns؛ #106 مالک رفتار data states؛ #111/#112 مالک metadata و capability شبکه‌ها. [Typography #115](https://github.com/jaavid/social-media-manager/issues/115) و [brand rollout #116](https://github.com/jaavid/social-media-manager/issues/116) کارهای وابستهٔ #103 با دامنهٔ مستقل‌اند. فایل فونت تکراری یا API شبکهٔ جدید به این بسته اضافه نشود.
