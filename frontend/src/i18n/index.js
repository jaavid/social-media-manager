import { useEffect, useState } from 'react';

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
  'Untitled post': 'پست بدون عنوان',
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
