/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
 'use client';
import { persistentStorage } from '../lib/runtime/storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { PropsWithChildren } from 'react';
export type ThemePreference = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';
interface Theme { preference: ThemePreference; theme: ResolvedTheme; isDark: boolean; toggle: () => void; setTheme: (value: string) => void }
function valid(value: string | null | undefined): value is ThemePreference { return ['light', 'dark', 'system'].includes(value || ''); }
function readPref(): ThemePreference {
  if (typeof document === 'undefined') return 'light';
  const value = document.documentElement.dataset.preference || persistentStorage.getItem('theme');
  return valid(value) ? value : 'light';
}
function systemTheme(): ResolvedTheme {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function subscribeSystem(listener: () => void) {
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  media?.addEventListener?.('change', listener);
  return () => media?.removeEventListener?.('change', listener);
}
function apply(theme: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
  const canvas = getComputedStyle(document.documentElement).getPropertyValue('--surface-page').trim();
  if (canvas) document.querySelectorAll('meta[name="theme-color"]').forEach(meta => meta.setAttribute('content', canvas));
}
const ThemeContext = createContext<Theme | null>(null);
export function ThemeProvider({ children, initialPreference }: PropsWithChildren<{ initialPreference?: ThemePreference }>) {
  const [preference, setPreference] = useState<ThemePreference>(() => initialPreference || readPref());
  const system = useSyncExternalStore(subscribeSystem, systemTheme, () => 'light' as const);
  const resolved = preference === 'system' ? system : preference;
  useEffect(() => {
    apply(resolved);
    document.documentElement.dataset.preference = preference;
    document.cookie = `theme=${preference}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    persistentStorage.setItem('theme', preference);
  }, [preference, resolved]);
  const toggle = useCallback(() => setPreference(resolved === 'dark' ? 'light' : 'dark'), [resolved]);
  const setTheme = useCallback((value: string) => { if (valid(value)) setPreference(value); }, []);
  const value = useMemo(() => ({ preference, theme: resolved, isDark: resolved === 'dark', toggle, setTheme }), [preference, resolved, toggle, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useTheme(): Theme {
  const context = useContext(ThemeContext);
  if (context) return context;
  const preference = readPref();
  const theme = preference === 'system' ? systemTheme() : preference;
  return { preference, theme, isDark: theme === 'dark', toggle: () => {}, setTheme: () => {} };
}
export function bootstrapTheme() { const preference = readPref(); apply(preference === 'system' ? systemTheme() : preference); }
