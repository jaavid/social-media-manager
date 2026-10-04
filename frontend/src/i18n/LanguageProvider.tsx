'use client';
import { createContext, useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { isPublicRoute } from './public-routes';
import { usePathname, useRouter } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import type { Language } from './messages';
import { nestedMessages } from './translate';

export const LanguageContext = createContext<Language | null>(null);
export default function LanguageProvider({ children, language: initial, preferredLanguage = initial }: PropsWithChildren<{ language: Language; preferredLanguage?: Language }>) {
  const [preference, setLanguage] = useState(preferredLanguage);
  const pathname = usePathname();
  const language = pathname && isPublicRoute(pathname) ? 'fa' : preference;
  const router = useRouter();
  useEffect(() => { setLanguage(preferredLanguage); }, [preferredLanguage]);
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr';
  }, [language]);
  useEffect(() => {
    const update = (event: Event) => {
      setLanguage((event as CustomEvent<Language>).detail);
      // Cookie-based preferences preserve pathname, search filters, and hashes.
      router.refresh();
    };
    window.addEventListener('socialstats:language-change', update);
    return () => window.removeEventListener('socialstats:language-change', update);
  }, [router]);
  return <LanguageContext.Provider value={language}>
    <NextIntlClientProvider locale={language} messages={nestedMessages[language]} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  </LanguageContext.Provider>;
}
