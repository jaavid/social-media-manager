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
import '../styles/appearance.css';
import '../styles/feature-animations.css';
import '../styles/legacy-migration.css';

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
const bootstrap = [
  "try {",
  "  var pref = document.documentElement.dataset.preference;",
  "  var dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);",
  "  document.documentElement.dataset.theme = dark ? 'dark' : 'light';",
  "  document.documentElement.classList.toggle('dark', dark);",
  "  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';",
  "  var canvas = getComputedStyle(document.documentElement).getPropertyValue('--surface-page').trim();",
  "  if (canvas) document.querySelectorAll('meta[name=\"theme-color\"]').forEach(function(meta) { meta.setAttribute('content', canvas); });",
  "} catch (_) {}",
  "/* Restore validated local appearance during HTML parsing, before paint. */",
  "(() => {",
  "  try {",
  "    const raw = localStorage.getItem('ravinta.appearance.v1');",
  "    if (!raw) return;",
  "    const source = JSON.parse(raw);",
  "    if (!source || typeof source !== 'object' || Array.isArray(source)) return;",
  "    const root = document.documentElement;",
  "    const pref = root.dataset.preference;",
  "    const dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);",
  "    const mode = dark ? 'dark' : 'light';",
  "    const palette = source[mode] || {};",
  "    function blend(source, target, amount) {",
  "      return '#' + [1, 3, 5].map(i => Math.round(",
  "        parseInt(source.slice(i, i + 2), 16) * (1 - amount) +",
  "        parseInt(target.slice(i, i + 2), 16) * amount",
  "      ).toString(16).padStart(2, '0')).join('');",
  "    }",
  "    const names = { primary: '--brand-primary', onPrimary: '--text-on-brand',",
  "      page: '--surface-page', card: '--surface-card', text: '--text-primary' };",
  "    const valid = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);",
  "    for (const [field, token] of Object.entries(names))",
  "      if (valid(palette[field])) root.style.setProperty(token, palette[field]);",
  "    if (valid(palette.primary)) {",
  "      const primary = palette.primary;",
  "      const onPrimary = valid(palette.onPrimary) ? palette.onPrimary : (mode === 'dark' ? '#123d3a' : '#ffffff');",
  "      const rgb = [1, 3, 5].map(i => parseInt(onPrimary.slice(i, i + 2), 16));",
  "      const target = rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114 > 127 ? '#000000' : '#ffffff';",
  "      root.style.setProperty('--brand-primary-hover', blend(primary, target, 0.12));",
  "      root.style.setProperty('--brand-primary-active', blend(primary, target, 0.2));",
  "      root.style.setProperty('--brand-primary-soft', `color-mix(in srgb, ${primary} 12%, transparent)`);",
  "      root.style.setProperty('--brand-primary-glow', `color-mix(in srgb, ${primary} 18%, transparent)`);",
  "      root.style.setProperty('--border-focus', primary);",
  "    }",
  "    const integer = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;",
  "    if (integer(source.spacing, 3, 6)) root.style.setProperty('--space-unit', `${source.spacing}px`);",
  "    if (integer(source.textScale, 85, 125)) {",
  "      for (const [name, size] of Object.entries({ xs:11, sm:13, base:14, md:15, lg:16, xl:18,",
  "        '2xl':22, '3xl':28, '4xl':36, '5xl':48, '6xl':60, '7xl':72 }))",
  "        root.style.setProperty(`--product-text-${name}`, `${size * source.textScale / 100}px`);",
  "    }",
  "    if (integer(source.radiusScale, 50, 150))",
  "      for (const [name, size] of Object.entries({ xs:4, sm:6, md:10, lg:14, xl:20, '2xl':28 }))",
  "        root.style.setProperty(`--product-radius-${name}`, `${size * source.radiusScale / 100}px`);",
  "    root.dataset.density = source.density === 'compact' ? 'compact' : 'comfortable';",
  "    root.dataset.appearanceMotion = source.motion === 'reduced' ? 'reduced' : 'system';",
  "    const canvas = getComputedStyle(root).getPropertyValue('--surface-page').trim();",
  "    if (canvas) document.querySelectorAll('meta[name=\"theme-color\"]')",
  "      .forEach(meta => meta.setAttribute('content', canvas));",
  "  } catch (_) { /* Storage may be unavailable; canonical CSS remains authoritative. */ }",
  "})();",
  "",
].join('\n');
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
    <head>
      <script dangerouslySetInnerHTML={{ __html: bootstrap }} />
      <script defer src="https://stats.tamin24.ir/script.js" data-website-id="88ddb74e-fddf-479b-bb0e-9b0487f0a849" />
      <script defer src="https://stats.tamin24.ir/recorder.js" data-website-id="88ddb74e-fddf-479b-bb0e-9b0487f0a849" />
    </head>
    <body><SiteProviders language={language} preferredLanguage={preferredLanguage} theme={preference} hasSession={cookieJar.has('sessionid')}>
      {children}
      <Suspense fallback={null}><PageviewTracker /></Suspense>
    </SiteProviders></body>
  </html>;
}
