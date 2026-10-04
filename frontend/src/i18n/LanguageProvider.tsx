'use client';
import { createContext, useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { useRouter } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import type { Language } from './messages';
import { nestedMessages } from './translate';

export const LanguageContext = createContext<Language | null>(null);
export default function LanguageProvider({ children, language: initial }: PropsWithChildren<{ language: Language }>) {
  const [language, setLanguage] = useState(initial);
  const router = useRouter();
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
