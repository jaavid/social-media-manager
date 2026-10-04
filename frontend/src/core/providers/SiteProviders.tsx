'use client';
import { SessionHint } from './SessionHint';
import LanguageProvider from '../../i18n/LanguageProvider';
import type { Language } from '../../i18n/messages';
import type { PropsWithChildren } from 'react';
import type { ThemePreference } from '../../hooks/useTheme';
import { ThemeProvider } from '../../hooks/useTheme';
import { ToastProvider } from '../../components/ui/toast';
import ClientRuntime from '../ClientRuntime';

/** Browser preferences and notifications, without session or private data. */
export default function SiteProviders({ children, language, theme, hasSession }: PropsWithChildren<{ language: Language; theme: ThemePreference; hasSession?: boolean }>) {
  return <SessionHint.Provider value={hasSession || false}><LanguageProvider language={language}><ThemeProvider initialPreference={theme}><ClientRuntime />{children}<ToastProvider /></ThemeProvider></LanguageProvider></SessionHint.Provider>;
}
