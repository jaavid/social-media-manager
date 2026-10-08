import { cookies } from 'next/headers';
import localFont from 'next/font/local';
import { requestLanguage } from '../i18n/server';
import { Suspense } from 'react';
import SiteProviders from '../core/providers/SiteProviders';
import PageviewTracker from '../components/PageviewTracker';
import '../styles/tokens.css';
import '../styles/common.css';
import '../styles/legacy.css';
import '../styles/accessibility.css';
import '../styles/tailwind.css';
import '../styles/i18n.css';

export const metadata = {
  title: { default: 'راوینتا؛ از ایده تا اثر', template: '%s · Ravinta' },
  description: 'برنامه‌ریزی، تولید، تأیید، انتشار و سنجش حضور دیجیتال در یک فضای کاری مشترک.',
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
  manifest: '/manifest.json',
  icons: { icon: [{ url: '/favicon.ico', sizes: '16x16 32x32 48x48' }, { url: '/favicon.png', type: 'image/png', sizes: '32x32' }], apple: '/apple-touch-icon.png' },
};
export async function generateViewport() {
  const preference = (await cookies()).get('theme')?.value;
  return {
    width: 'device-width', initialScale: 1, viewportFit: 'cover',
    themeColor: preference === 'system'
      ? [{ media: '(prefers-color-scheme: light)', color: '#F7F9F8' }, { media: '(prefers-color-scheme: dark)', color: '#102B29' }]
      : preference === 'dark' ? '#102B29' : '#F7F9F8',
  };
}
const arabicFont = localFont({ src: '../assets/fonts/NotoSansArabic.woff2', weight: '100 900',
  variable: '--font-product-arabic', display: 'swap', fallback: ['Arial', 'sans-serif'] });
const latinFont = localFont({ src: '../assets/fonts/NotoSans.woff2', weight: '100 900',
  variable: '--font-product-latin', display: 'swap', fallback: ['Arial', 'sans-serif'] });
// System preference is browser-specific; the media query runs before paint.
const bootstrap = `try {
  var pref = document.documentElement.dataset.preference;
  var dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  var canvas = getComputedStyle(document.documentElement).getPropertyValue('--surface-page').trim();
  if (canvas) document.querySelectorAll('meta[name="theme-color"]').forEach(function(meta) { meta.setAttribute('content', canvas); });
} catch (_) {}`;
export default async function RootLayout({ children }) {
  const language = await requestLanguage();
  const cookieJar = await cookies();
  const preferredLanguage = cookieJar.get('socialstats.language')?.value === 'en' ? 'en' : 'fa';
  const storedTheme = cookieJar.get('theme')?.value;
  const preference = ['light', 'dark', 'system'].includes(storedTheme) ? storedTheme : 'light';
  const theme = preference === 'dark' ? 'dark' : 'light';
  return <html lang={language} dir={language === 'fa' ? 'rtl' : 'ltr'}
    style={{ '--font-arabic-face': arabicFont.style.fontFamily.split(',')[0],
      '--font-latin-face': latinFont.style.fontFamily.split(',')[0] }}
    data-preference={preference} data-theme={theme}
    className={`${arabicFont.variable} ${latinFont.variable}${theme === 'dark' ? ' dark' : ''}`} suppressHydrationWarning>
    <head><script dangerouslySetInnerHTML={{ __html: bootstrap }} /></head>
    <body><SiteProviders language={language} preferredLanguage={preferredLanguage} theme={preference} hasSession={cookieJar.has('sessionid')}>
      {children}
      <Suspense fallback={null}><PageviewTracker /></Suspense>
    </SiteProviders></body>
  </html>;
}
