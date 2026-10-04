'use client';
import type { PropsWithChildren } from 'react';
import { ThemeProvider } from '../../hooks/useTheme';
import { ToastProvider } from '../../components/ui/toast';
import ClientRuntime from '../ClientRuntime';

/** Browser preferences and notifications, without session or private data. */
export default function SiteProviders({ children }: PropsWithChildren) {
  return <ThemeProvider><ClientRuntime />{children}<ToastProvider /></ThemeProvider>;
}
