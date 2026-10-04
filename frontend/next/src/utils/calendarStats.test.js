import { deriveCalendarStats } from './calendarStats';

describe('deriveCalendarStats', () => {
  const start = new Date(2026, 8, 23); // 1 Mehr 1405
  const end = new Date(2026, 9, 22);   // 30 Mehr 1405

  test('counts only published posts inside the visible range', () => {
    const stats = deriveCalendarStats({
      '2026-09-22': [{ id: 1, status: 'published', platform: 'telegram', post_type: 'text' }],
      '2026-09-23': [
        { id: 2, status: 'published', platform: 'telegram', post_type: 'text' },
        { id: 3, status: 'scheduled', platform: 'instagram', post_type: 'image' },
      ],
      '2026-10-01': [{ id: 4, status: 'published', platform: 'instagram', post_type: 'image' }],
      '2026-10-23': [{ id: 5, status: 'published', platform: 'bale', post_type: 'text' }],
    }, start, end, new Date(2026, 9, 22));

    expect(stats.total_published).toBe(2);
    expect(stats.by_platform).toEqual({ telegram: 1, instagram: 1 });
    expect(stats.by_post_type).toEqual({ text: 1, image: 1 });
    expect(stats.source).toBe('visible_range');
  });

  test('chooses best post from engagement metrics when score is absent', () => {
    const lower = {
      id: 10, status: 'published', platform: 'telegram', post_type: 'text',
      impressions: 100, likes: 1,
    };
    const higher = {
      id: 11, status: 'published', platform: 'bale', post_type: 'text',
      impressions: 100, likes: 10, comments: 3,
    };

    const stats = deriveCalendarStats({
      '2026-09-23': [lower],
      '2026-09-24': [higher],
    }, start, end, new Date(2026, 9, 22));

    expect(stats.best_performing_post.id).toBe(11);
  });

  test('does not mark future dates as posting gaps', () => {
    const stats = deriveCalendarStats({}, start, end, new Date(2026, 8, 25, 12));

    expect(stats.posting_gaps).toEqual([
      '2026-09-23',
      '2026-09-24',
      '2026-09-25',
    ]);
  });
});
