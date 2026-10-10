/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import LegalPageLayout from '../components/marketing/LegalPageLayout';

export default function AboutPage() {
  return <LegalPageLayout title="درباره راوینتا" intro="راوینتا ابزار کار تیم‌هایی است که محتوا منتشر می‌کنند، به پیام‌ها پاسخ می‌دهند و عملکرد حساب‌هایشان را بررسی می‌کنند." sections={[
    { id: 'purpose', title: "راوینتا چه کاری انجام می‌دهد؟", body: <><p>کارهای روزمره شبکه‌های اجتماعی معمولاً بین چند ابزار و چند نفر تقسیم می‌شوند. راوینتا پیش‌نویس‌ها، برنامه انتشار، پیام‌ها و آمار حساب‌های متصل را در یک فضای کاری جمع می‌کند.</p></> },
    { id: 'teams', title: "برای کار فردی و تیمی", body: <><p>هر فضای کاری اعضا و حساب‌های خودش را دارد. می‌توانید همکاران را دعوت کنید و بر اساس مسئولیتشان، دسترسی بدهید. این ساختار برای تیم داخلی، آژانس و تولیدکننده محتوا قابل استفاده است.</p></> },
    { id: 'limits', title: "اتصال‌ها و امکانات", body: <><p>امکانات هر حساب به شبکه اجتماعی، مجوزهای داده‌شده و تنظیمات اتصال بستگی دارد. پیش از شروع، امکانات موردنیازتان را در حساب خود بررسی کنید.</p></> },
    { id: 'contact', title: "گفت‌وگو با تیم راوینتا", body: <><p>برای پرسیدن درباره محصول، مطرح کردن مشکل یا پیشنهاد همکاری، از <a href="/contact">صفحه تماس</a> استفاده کنید.</p></> },
  ]} />;
}
