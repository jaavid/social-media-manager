import { persistentStorage } from '../lib/runtime/storage';
import { useContext, useEffect, useSyncExternalStore } from 'react';
import { isPublicRoute } from './public-routes';
import { LanguageContext } from './LanguageProvider';
import { messages } from './messages';
import { message } from './translate';
import { rawDictionaries, workspaceCopyAliases } from './legacy';
import '../styles/i18n.css';
export { enMessages, faMessages } from './messages';
const LANGUAGE_EVENT = 'socialstats:language-change';
const SUPPORTED = new Set(['en', 'fa']);

// The server has no mutable locale singleton. Server callers pass request locale.
export function getLanguage() {
  if (typeof document === 'undefined') return 'fa';
  return document.documentElement.lang === 'en' ? 'en' : 'fa';
}
function applyDocumentLanguage(language) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr';
}
export function setLanguage(language) {
  if (!SUPPORTED.has(language) || typeof window === 'undefined') return;
  persistentStorage.setItem('socialstats.language', language);
  document.cookie = `socialstats.language=${language}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  applyDocumentLanguage(isPublicRoute(window.location.pathname) ? 'fa' : language);
  window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, { detail: language }));
}
export function translate(key, language = getLanguage(), fallback = key) {
  const canonical = workspaceCopyAliases[key] || key;
  return messages[language]?.[canonical] || messages.en[canonical] || workspaceCopyAliases[fallback] || fallback;
}
export function interpolate(text, values = {}) {
  return String(text).replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match);
}
export function translateRaw(value, language = getLanguage()) {
  const canonical = workspaceCopyAliases[value] || value;
  return rawDictionaries[language]?.[canonical] || canonical;
}
export function localeFor(language = getLanguage()) {
  return language === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US';
}
export function formatUiDate(value, options = {}, language = getLanguage()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(localeFor(language), { timeZone: 'UTC', ...options }).format(date);
}
export function formatUiNumber(value, language = getLanguage(), options = {}) {
  return new Intl.NumberFormat(language === 'fa' ? 'fa-IR' : 'en-US', options).format(value);
}
function subscribeLanguage(listener) {
  window.addEventListener(LANGUAGE_EVENT, listener);
  return () => window.removeEventListener(LANGUAGE_EVENT, listener);
}
export function useLanguage() {
  const context = useContext(LanguageContext);
  const standalone = useSyncExternalStore(subscribeLanguage, getLanguage, () => 'fa');
  const language = context || standalone;
  useEffect(() => { applyDocumentLanguage(language); }, [language]);
  return {
    language, isPersian: language === 'fa', direction: language === 'fa' ? 'rtl' : 'ltr', setLanguage,
    t: (key, fallback, values) => messages[language]?.[key] ? message(key, language, values) : interpolate(translate(key, language, fallback), values),
    tr: value => translateRaw(value, language),
    formatDate: (value, options) => formatUiDate(value, options, language),
    formatNumber: (value, options) => formatUiNumber(value, language, options),
  };
}
