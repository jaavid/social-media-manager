import { message } from './translate';
import { formatTimeAgo } from '../services/formatters';
import { formatUiDate, formatUiNumber } from './index';
test('ICU plural and interpolation work in both catalogs', () => {
  expect(message('common.items', 'en', { count: 1 })).toBe('1 item');
  expect(message('common.items', 'en', { count: 2 })).toBe('2 items');
  expect(message('common.items', 'fa', { count: 2 })).toContain('مورد');
  expect(message('accounts.disconnectConfirm', 'fa', { platform: 'Telegram' })).toContain('Telegram');
});
test('relative time supports both locales and future timestamps', () => {
  const now = Date.parse('2026-10-04T12:00:00Z');
  expect(formatTimeAgo('2026-10-04T11:58:00Z', { now, language: 'en' })).toBe('2 minutes ago');
  expect(formatTimeAgo('2026-10-04T12:02:00Z', { now, language: 'en' })).toBe('in 2 minutes');
  expect(formatTimeAgo('2026-10-04T11:58:00Z', { now, language: 'fa' })).toContain('پیش');
});
test('display calendar/timezone/currency never mutates API timestamps', () => {
  const timestamp = '2026-09-22T22:00:00Z';
  expect(formatUiDate(timestamp, { year: 'numeric', timeZone: 'Asia/Tehran' }, 'fa')).toContain('۱۴۰۵');
  expect(formatUiDate(timestamp, { year: 'numeric' }, 'en')).toContain('2026');
  expect(formatUiNumber(12, 'en', { style: 'currency', currency: 'USD' })).toBe('$12.00');
  expect(timestamp).toBe('2026-09-22T22:00:00Z');
});
