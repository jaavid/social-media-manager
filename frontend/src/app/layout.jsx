import { Suspense } from 'react';
import AppProviders from '../core/providers/AppProviders';
import '../styles/tokens.css';
import '../styles/common.css';
import '../styles/legacy.css';
import '../styles/accessibility.css';
import '../styles/tailwind.css';

// Navigation/search state is request-specific; public content still renders on the server.
export const dynamic = 'force-dynamic';
export const metadata = {
  title: { default: 'Social Stats — The marketing OS for modern teams', template: '%s · Social Stats' },
  description: 'Manage analytics, content, conversations, and ads across your workspaces.',
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
  manifest: '/manifest.json',
  icons: { icon: '/icons/icon-192.png', apple: '/apple-touch-icon.png' },
};
export const viewport = {
  width: 'device-width', initialScale: 1, viewportFit: 'cover',
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#fafbfc' },
    { media: '(prefers-color-scheme: dark)', color: '#06080c' }],
};
// Only preferences are read here. Credentials never enter server rendering or HTML.
const bootstrap = `try {
  var lang = localStorage.getItem('socialstats.language');
  if (!lang) { lang = 'fa'; localStorage.setItem('socialstats.language', lang); }
  lang = lang === 'en' ? 'en' : 'fa';
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
  var pref = localStorage.getItem('theme');
  var dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
} catch (_) {}`;
export default function RootLayout({ children }) {
  return <html lang="fa" dir="rtl" suppressHydrationWarning><head>
    <script dangerouslySetInnerHTML={{ __html: bootstrap }} />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700;800;900&display=swap" />
  </head><body><Suspense fallback={<div role="status" aria-busy="true" />}>
    <AppProviders>{children}</AppProviders>
  </Suspense></body></html>;
}
