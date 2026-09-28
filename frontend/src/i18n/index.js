import { useEffect, useState } from 'react';
import '../styles/i18n.css';

const STORAGE_KEY = 'socialstats.language';
const LANGUAGE_EVENT = 'socialstats:language-change';
const SUPPORTED = new Set(['en', 'fa']);

const fa = {
  'common.search': 'جست‌وجو…',
  'common.new': 'جدید',
  'common.today': 'امروز',
  'common.all': 'همه',
  'common.loading': 'در حال بارگذاری…',
  'common.view': 'مشاهده',
  'common.edit': 'ویرایش',
  'common.delete': 'حذف',
  'common.posts': 'پست',
  'common.language': 'زبان',
  'common.home': 'خانه',
  'common.navigation': 'ناوبری',
  'common.soon': 'به‌زودی',
  'common.settings': 'تنظیمات',
  'common.notifications': 'اعلان‌ها',
  'common.signOut': 'خروج',
  'common.accountSettings': 'تنظیمات حساب',
  'common.searchClients': 'جست‌وجوی مشتریان…',
  'common.allClients': 'همه مشتریان',
  'common.openMenu': 'باز کردن منو',
  'common.closeMenu': 'بستن منو',
  'common.accountMenu': 'منوی حساب',
  'common.moduleSwitcher': 'تغییر بخش',
  'calendar.title': 'تقویم محتوا',
  'calendar.subtitle': 'محتوای زمان‌بندی‌شده را برنامه‌ریزی، بررسی و ارزیابی کنید.',
  'calendar.month': 'ماه',
  'calendar.list': 'فهرست',
  'calendar.stats': 'آمار',
  'calendar.schedulePost': 'زمان‌بندی پست',
  'calendar.noPosts': 'در این ماه پستی وجود ندارد',
  'calendar.noPostsHint': 'با دکمه + اولین پست را زمان‌بندی کنید.',
  'calendar.comingUp': 'برنامه این هفته',
  'calendar.allUsers': 'همه کاربران',
  'calendar.selectUser': 'برای مشاهده تقویم محتوا، یک کاربر را انتخاب کنید.',
  'calendar.loading': 'در حال بارگذاری تقویم…',
  'calendar.more': 'بیشتر',
  'calendar.weekday.sat': 'شنبه',
  'calendar.weekday.sun': 'یکشنبه',
  'calendar.weekday.mon': 'دوشنبه',
  'calendar.weekday.tue': 'سه‌شنبه',
  'calendar.weekday.wed': 'چهارشنبه',
  'calendar.weekday.thu': 'پنجشنبه',
  'calendar.weekday.fri': 'جمعه',
};

const faRaw = {
  'Home': 'خانه',
  'Analytics': 'تحلیل و آمار',
  'Social performance': 'عملکرد شبکه‌های اجتماعی',
  'Social Performance': 'عملکرد شبکه‌های اجتماعی',
  'Publish': 'انتشار',
  'Composer': 'ساخت محتوا',
  'Calendar': 'تقویم',
  'Content Calendar': 'تقویم محتوا',
  'Queues': 'صف‌های انتشار',
  'Media Library': 'کتابخانه رسانه',
  'Video Studio': 'استودیوی ویدئو',
  'Engage': 'تعامل',
  'Inbox': 'صندوق ورودی',
  'Reviews': 'بازخوردها',
  'Automations': 'اتوماسیون‌ها',
  'Overview': 'نمای کلی',
  'Dashboard': 'داشبورد',
  'Reports': 'گزارش‌ها',
  'Content': 'محتوا',
  'Posts': 'پست‌ها',
  'Post': 'پست',
  'post': 'پست',
  'posts': 'پست‌ها',
  'Untitled post': 'پست بدون عنوان',
  '(no title)': '(بدون عنوان)',
  '(no caption)': '(بدون کپشن)',
  'hashtags': 'هشتگ',
  'hashtag': 'هشتگ',
  'Caption Writer': 'کپشن‌نویس',
  'Post Ideas': 'ایده‌های پست',
  'Hashtags': 'هشتگ‌ها',
  'AI Studio': 'استودیوی هوش مصنوعی',
  'Brand Voice': 'لحن برند',
  'AI Insights': 'بینش هوش مصنوعی',
  'AI Audit': 'ممیزی هوش مصنوعی',
  'Performance': 'عملکرد',
  'ROI Calculator': 'محاسبه بازگشت سرمایه',
  'Alerts': 'هشدارها',
  'Sync Logs': 'گزارش همگام‌سازی',
  'Grow': 'رشد',
  'Audience': 'مخاطبان',
  'Competitors': 'رقبا',
  'Setup': 'تنظیمات',
  'Approvals': 'تأییدها',
  'Notifications': 'اعلان‌ها',
  'Audit Log': 'گزارش ممیزی',
  'Messaging': 'پیام‌رسانی',
  'Messaging dashboard': 'داشبورد پیام‌رسانی',
  'Messaging Dashboard': 'داشبورد پیام‌رسانی',
  'WhatsApp & SMS': 'واتس‌اپ و پیامک',
  'All conversations': 'همه گفتگوها',
  'Outreach': 'ارسال و کمپین',
  'Campaigns': 'کمپین‌ها',
  'Templates': 'قالب‌ها',
  'Contacts': 'مخاطبان',
  'Contact': 'مخاطب',
  'Lists': 'فهرست‌ها',
  'Conversational AI': 'هوش مصنوعی مکالمه‌ای',
  'Bot Flows': 'جریان‌های بات',
  'Conversations': 'گفتگوها',
  'Handoff Queue': 'صف ارجاع',
  'Leads': 'سرنخ‌ها',
  'Lead': 'سرنخ',
  'CTWA Campaigns': 'کمپین‌های CTWA',
  'Bot Safety': 'ایمنی بات',
  'Account': 'حساب',
  'Webhooks': 'وب‌هوک‌ها',
  'Ads': 'تبلیغات',
  'Coming soon': 'به‌زودی',
  'Soon': 'به‌زودی',
  'Settings': 'تنظیمات',
  'All clients': 'همه مشتریان',
  'Search clients…': 'جست‌وجوی مشتریان…',
  'Navigation': 'ناوبری',
  'Manage agency': 'مدیریت آژانس',
  'Marketplace profile': 'پروفایل بازار',
  'My agency': 'آژانس من',
  'Account settings': 'تنظیمات حساب',
  'Account Settings': 'تنظیمات حساب',
  'Sign out': 'خروج',
  'Ads management is coming soon. We\'re building it next.': 'مدیریت تبلیغات به‌زودی اضافه می‌شود.',

  'Command palette': 'پالت فرمان',
  'Command Menu': 'منوی فرمان',
  'Search pages, posts, leads, conversations…': 'جست‌وجو در صفحات، پست‌ها، سرنخ‌ها و گفتگوها…',
  'Searching': 'در حال جست‌وجو',
  'Searching…': 'در حال جست‌وجو…',
  'No results found.': 'نتیجه‌ای پیدا نشد.',
  'Recent': 'اخیر',
  'Pages': 'صفحات',
  'Quick actions': 'اقدام‌های سریع',
  'Clients': 'مشتریان',
  'Switch to client': 'رفتن به مشتری',
  'Help & resources': 'راهنما و منابع',
  '↑↓ to navigate · ↵ to select': '↑↓ برای حرکت · ↵ برای انتخاب',
  'esc to close': 'Esc برای بستن',
  '(unknown)': '(نامشخص)',

  'Analytics overview': 'نمای کلی تحلیل‌ها',
  'Deep metrics': 'شاخص‌های تفصیلی',
  'PDF reports': 'گزارش‌های PDF',
  'Plan & schedule': 'برنامه‌ریزی و زمان‌بندی',
  'Revenue forecasting': 'پیش‌بینی درآمد',
  'Anomaly notifications': 'هشدار ناهنجاری‌ها',
  'AI-powered captions': 'کپشن‌نویسی با هوش مصنوعی',
  'AI content brainstorm': 'ایده‌پردازی محتوا با هوش مصنوعی',
  'WhatsApp overview': 'نمای کلی واتس‌اپ',
  'Broadcast outreach': 'ارسال گروهی',
  'Approved templates': 'قالب‌های تأییدشده',
  'Pinbot account': 'حساب Pinbot',
  'WhatsApp setup': 'تنظیمات واتس‌اپ',
  'Send a message': 'ارسال پیام',
  'Open inbox to compose': 'باز کردن صندوق ورودی برای نوشتن پیام',
  'Create a campaign': 'ساخت کمپین',
  'New broadcast': 'ارسال گروهی جدید',
  'Upload contacts': 'بارگذاری مخاطبان',
  'Import a CSV': 'درون‌ریزی فایل CSV',
  'Create a template': 'ساخت قالب',
  'WhatsApp template': 'قالب واتس‌اپ',
  "What's new": 'تازه‌ها',
  'Recent product updates': 'تغییرات اخیر محصول',
  'Help center': 'مرکز راهنما',
  'Guides + troubleshooting': 'راهنماها و رفع اشکال',
  'System status': 'وضعیت سامانه',
  'Live uptime + incidents': 'وضعیت لحظه‌ای و رخدادها',
  'Security & compliance': 'امنیت و انطباق',
  'GDPR, DPDP, certifications': 'GDPR، DPDP و گواهی‌ها',
  'Contact support': 'ارتباط با پشتیبانی',
  'Send us a message': 'ارسال پیام به پشتیبانی',

  'Today': 'امروز',
  'Tomorrow': 'فردا',
  'Previous month': 'ماه قبل',
  'Next month': 'ماه بعد',
  'No user selected.': 'هیچ کاربری انتخاب نشده است.',
  'No posts scheduled in the next 7 days.': 'در ۷ روز آینده پستی زمان‌بندی نشده است.',
  'Less': 'کمتر',
  'More': 'بیشتر',
  'more': 'بیشتر',
  'No stats available for this period.': 'برای این بازه آماری موجود نیست.',
  'Posting Frequency': 'تعداد انتشار',
  'posts published in': 'پست منتشرشده در',
  'week': 'هفته',
  'Posts by Platform': 'پست‌ها بر اساس پلتفرم',
  'No data': 'داده‌ای موجود نیست',
  'Posts by Day of Week': 'پست‌ها بر اساس روز هفته',
  'Best day': 'بهترین روز',
  'Posts by Type': 'پست‌ها بر اساس نوع',
  'Best Performing Post': 'بهترین پست از نظر عملکرد',
  'No published posts yet.': 'هنوز پست منتشرشده‌ای وجود ندارد.',
  'View Post': 'مشاهده پست',
  'Posting Gaps': 'فاصله‌های بدون انتشار',
  'No gaps — great consistency!': 'فاصله‌ای بدون انتشار نیست؛ تداوم عالی است.',
  'day': 'روز',
  'days': 'روز',
  'with no posts in': 'بدون پست در',
  'consecutive days': 'روز پیاپی',
  'Monday': 'دوشنبه',
  'Tuesday': 'سه‌شنبه',
  'Wednesday': 'چهارشنبه',
  'Thursday': 'پنجشنبه',
  'Friday': 'جمعه',
  'Saturday': 'شنبه',
  'Sunday': 'یکشنبه',
  'Mon': 'دوشنبه',
  'Tue': 'سه‌شنبه',
  'Wed': 'چهارشنبه',
  'Thu': 'پنجشنبه',
  'Fri': 'جمعه',
  'Sat': 'شنبه',
  'Sun': 'یکشنبه',
  'image': 'تصویر',
  'video': 'ویدئو',
  'reel': 'ریل',
  'story': 'استوری',
  'carousel': 'کاروسل',
  'text': 'متن',
  'article': 'مقاله',
  'short': 'ویدئوی کوتاه',

  'Published': 'منتشرشده',
  'Scheduled': 'زمان‌بندی‌شده',
  'Draft': 'پیش‌نویس',
  'Failed': 'ناموفق',
  'published': 'منتشرشده',
  'scheduled': 'زمان‌بندی‌شده',
  'draft': 'پیش‌نویس',
  'failed': 'ناموفق',
  'Close': 'بستن',
  'Post media': 'رسانه پست',
  'Impressions': 'نمایش‌ها',
  'Reach': 'دسترسی',
  'Likes': 'پسندها',
  'Comments': 'نظرها',
  'Shares': 'اشتراک‌گذاری‌ها',
  'Saves': 'ذخیره‌ها',
  'Views': 'بازدیدها',
  'Performance Score': 'امتیاز عملکرد',
  'pts': 'امتیاز',
  'View on': 'مشاهده در',
  'Agency note': 'یادداشت آژانس',
  'Reschedule': 'زمان‌بندی مجدد',
  'New scheduled time': 'زمان جدید انتشار',
  'Saving…': 'در حال ذخیره…',
  'Confirm': 'تأیید',
  'Cancel': 'انصراف',
  'Edit': 'ویرایش',
  'Delete': 'حذف',
  'Confirm Delete': 'تأیید حذف',

  'Edit Post': 'ویرایش پست',
  'Schedule Post': 'زمان‌بندی پست',
  'Platform': 'پلتفرم',
  'Post Type': 'نوع پست',
  'Internal Title': 'عنوان داخلی',
  'Agency reference label': 'عنوان مرجع داخلی',
  'Caption': 'کپشن',
  'Write your': 'کپشن مناسب',
  'caption': 'را بنویسید',
  'Media URL (optional)': 'نشانی رسانه (اختیاری)',
  'Post URL (optional)': 'نشانی پست (اختیاری)',
  'Status': 'وضعیت',
  'Scheduled Date & Time': 'تاریخ و زمان انتشار',
  'Scheduled Date & Time (must be in the future)': 'تاریخ و زمان انتشار (باید در آینده باشد)',
  'Display date': 'تاریخ نمایشی',
  'Internal Notes (not shown to user)': 'یادداشت داخلی (به کاربر نمایش داده نمی‌شود)',
  'e.g. Waiting on final image from designer': 'مثلاً در انتظار تصویر نهایی طراح',
  'Save as Draft': 'ذخیره به‌عنوان پیش‌نویس',
  'Best times for': 'بهترین زمان‌ها برای',
  'industry': 'بر اساس داده عمومی صنعت',
  'Please select a platform.': 'یک پلتفرم انتخاب کنید.',
  'Caption is required. Add a caption or at least an internal title.': 'کپشن لازم است؛ یا کپشن وارد کنید یا دست‌کم یک عنوان داخلی بنویسید.',
  'Please pick a date and time to schedule this post.': 'تاریخ و زمان انتشار را انتخاب کنید.',
  'The scheduled time must be in the future.': 'زمان انتشار باید در آینده باشد.',
  'Required fields missing': 'فیلدهای الزامی تکمیل نشده‌اند',
  'Please fix the highlighted fields before saving.': 'پیش از ذخیره، فیلدهای مشخص‌شده را اصلاح کنید.',
  'Save failed.': 'ذخیره ناموفق بود.',
};

const dictionaries = { en: {}, fa };
const rawDictionaries = { en: {}, fa: faRaw };

function detectInitialLanguage() {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (SUPPORTED.has(stored)) return stored;
  return (window.navigator.language || '').toLowerCase().startsWith('fa') ? 'fa' : 'en';
}

let currentLanguage = detectInitialLanguage();

function applyDocumentLanguage(language) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr';
  document.body?.setAttribute('dir', language === 'fa' ? 'rtl' : 'ltr');
}

applyDocumentLanguage(currentLanguage);

export function getLanguage() {
  return currentLanguage;
}

export function setLanguage(language) {
  if (!SUPPORTED.has(language)) return;
  currentLanguage = language;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, language);
    window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, { detail: language }));
  }
  applyDocumentLanguage(language);
}

export function translate(key, language = currentLanguage, fallback = key) {
  return dictionaries[language]?.[key] || fallback;
}

export function translateRaw(value, language = currentLanguage) {
  return rawDictionaries[language]?.[value] || value;
}

export function localeFor(language = currentLanguage) {
  return language === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US';
}

export function formatUiDate(value, options = {}, language = currentLanguage) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(localeFor(language), options).format(date);
}

export function formatUiNumber(value, language = currentLanguage) {
  return new Intl.NumberFormat(language === 'fa' ? 'fa-IR' : 'en-US').format(value);
}

export function useLanguage() {
  const [language, setState] = useState(currentLanguage);

  useEffect(() => {
    applyDocumentLanguage(currentLanguage);
    const handler = (event) => setState(event.detail || currentLanguage);
    window.addEventListener(LANGUAGE_EVENT, handler);
    return () => window.removeEventListener(LANGUAGE_EVENT, handler);
  }, []);

  return {
    language,
    isPersian: language === 'fa',
    direction: language === 'fa' ? 'rtl' : 'ltr',
    setLanguage,
    t: (key, fallback) => translate(key, language, fallback),
    tr: (value) => translateRaw(value, language),
    formatDate: (value, options) => formatUiDate(value, options, language),
    formatNumber: (value) => formatUiNumber(value, language),
  };
}
