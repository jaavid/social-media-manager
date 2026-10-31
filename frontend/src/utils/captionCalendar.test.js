import { captionCalendarHref } from './captionCalendar';

test('admin calendar uses client query key', () => {
  const url = new URL(captionCalendarHref(
    '/admin/analytics/calendar', 9, 'instagram', 'سلام و خوش آمدید',
  ), 'https://example.test');
  expect(url.pathname).toBe('/admin/analytics/calendar');
  expect(url.searchParams.get('client')).toBe('9');
  expect(url.searchParams.has('workspace')).toBe(false);
  expect(url.searchParams.get('draft')).toBe('سلام و خوش آمدید');
});

test('dashboard calendar uses validated workspace query key', () => {
  const url = new URL(captionCalendarHref(
    '/dashboard/calendar', 42, 'telegram', 'پیش‌نویس',
  ), 'https://example.test');
  expect(url.searchParams.get('workspace')).toBe('42');
  expect(url.searchParams.has('client')).toBe(false);
});

test('no workspace is never converted into an arbitrary id', () => {
  const url = captionCalendarHref('/admin/analytics/calendar', null, 'instagram', 'text');
  expect(url).not.toContain('client=');
});
