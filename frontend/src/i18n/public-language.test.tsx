import { act, render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import LanguageProvider, { LanguageContext } from './LanguageProvider';
import { useContext } from 'react';
import { setLanguage } from './index';
import { isPublicRoute } from './public-routes';

function Probe() {
  return <output>{useContext(LanguageContext)}</output>;
}

test('public and token-based pages are Persian with an English preference', () => {
  for (const path of ['/', '/product/analytics', '/help/connections', '/login', '/signup',
    '/forgot-password', '/reset-password', '/verify-email', '/marketplace/example',
    '/report/token', '/invitation/token', '/invite/token', '/agency-invite/token',
    '/auth/end-user/signup', '/oauth/callback']) {
    expect(isPublicRoute(path)).toBe(true);
    jest.mocked(usePathname).mockReturnValue(path);
    const view = render(<LanguageProvider language="en"><Probe /></LanguageProvider>);
    expect(screen.getByText('fa')).toBeVisible();
    expect(document.documentElement).toHaveAttribute('lang', 'fa');
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    view.unmount();
  }
});

test('workspace pages retain the selected language when navigating from public pages', () => {
  jest.mocked(usePathname).mockReturnValue('/login');
  const view = render(<LanguageProvider language="en"><Probe /></LanguageProvider>);
  expect(screen.getByText('fa')).toBeVisible();
  for (const path of ['/dashboard', '/dashboard/settings', '/admin', '/agency', '/u', '/pending']) {
    expect(isPublicRoute(path)).toBe(false);
    jest.mocked(usePathname).mockReturnValue(path);
    view.rerender(<LanguageProvider language="en"><Probe /></LanguageProvider>);
    expect(screen.getByText('en')).toBeVisible();
    expect(document.documentElement).toHaveAttribute('dir', 'ltr');
  }
});

test('language preference events cannot switch a public page to English', () => {
  jest.mocked(usePathname).mockReturnValue('/');
  render(<LanguageProvider language="fa"><Probe /></LanguageProvider>);
  act(() => { setLanguage('en'); });
  expect(screen.getByText('fa')).toBeVisible();
  expect(document.documentElement).toHaveAttribute('dir', 'rtl');
});

test('public server locale keeps the saved workspace preference across client navigation', () => {
  jest.mocked(usePathname).mockReturnValue('/login');
  const view = render(<LanguageProvider language="fa" preferredLanguage="en"><Probe /></LanguageProvider>);
  expect(screen.getByText('fa')).toBeVisible();
  jest.mocked(usePathname).mockReturnValue('/dashboard');
  view.rerender(<LanguageProvider language="fa" preferredLanguage="en"><Probe /></LanguageProvider>);
  expect(screen.getByText('en')).toBeVisible();
  expect(document.documentElement).toHaveAttribute('dir', 'ltr');
});
