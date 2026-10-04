import {
  addPersianMonths,
  gregorianMonthsCovering,
  persianMonthRange,
  persianParts,
  startOfPersianMonth,
} from './persianCalendar';

describe('Persian calendar helpers', () => {
  test('recognizes 1 Mehr 1405', () => {
    const date = new Date(2026, 8, 23, 12, 0, 0);
    expect(persianParts(date)).toEqual({ year: 1405, month: 7, day: 1 });
  });

  test('finds the first day of the current Persian month', () => {
    const date = new Date(2026, 9, 5, 12, 0, 0);
    expect(persianParts(startOfPersianMonth(date))).toEqual({ year: 1405, month: 7, day: 1 });
  });

  test('moves by Persian months rather than Gregorian months', () => {
    const mehr = new Date(2026, 8, 23, 12, 0, 0);
    expect(persianParts(addPersianMonths(mehr, 1))).toEqual({ year: 1405, month: 8, day: 1 });
  });

  test('returns every Gregorian month intersecting a Persian month', () => {
    const { start, end } = persianMonthRange(new Date(2026, 8, 28, 12, 0, 0));
    expect(gregorianMonthsCovering(start, end)).toEqual([
      { month: 9, year: 2026 },
      { month: 10, year: 2026 },
    ]);
  });
});
