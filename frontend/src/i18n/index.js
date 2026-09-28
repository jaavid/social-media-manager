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

const dictionaries = { en: {}, fa };

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
    formatDate: (value, options) => formatUiDate(value, options, language),
    formatNumber: (value) => formatUiNumber(value, language),
  };
}
