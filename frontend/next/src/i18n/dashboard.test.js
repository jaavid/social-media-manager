import { formatUiDate, formatUiNumber, translateRaw } from './index';

describe('Persian dashboard localization', () => {
  test('translates the primary dashboard surfaces', () => {
    expect(translateRaw('Agency Command Center', 'fa')).toBe('مرکز فرماندهی آژانس');
    expect(translateRaw('Make the numbers feel actionable.', 'fa')).toBe('اعداد را به تصمیم‌های قابل اجرا تبدیل کنید.');
    expect(translateRaw('Performance Snapshot', 'fa')).toBe('نمای کلی عملکرد');
    expect(translateRaw('Set Monthly Goals', 'fa')).toBe('تنظیم اهداف ماهانه');
    expect(translateRaw('Smart Alerts', 'fa')).toBe('هشدارهای هوشمند');
    expect(translateRaw('Recent Sync Activity', 'fa')).toBe('آخرین فعالیت‌های همگام‌سازی');
  });

  test('keeps English as the raw-string fallback', () => {
    expect(translateRaw('Agency Command Center', 'en')).toBe('Agency Command Center');
    expect(translateRaw('Unregistered dashboard copy', 'fa')).toBe('Unregistered dashboard copy');
  });

  test('formats dashboard dates and numbers for Persian', () => {
    expect(formatUiNumber(12345, 'fa')).toContain('۱۲');
    const formattedDate = formatUiDate('2026-10-01T12:00:00Z', { dateStyle: 'medium' }, 'fa');
    expect(formattedDate).not.toContain('2026');
  });
});
