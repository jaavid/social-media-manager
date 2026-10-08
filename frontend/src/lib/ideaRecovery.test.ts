import { parseIdeaHistory, parseIdeaSet, parseIdea, parseCalendarAdded, parseApproved } from './ideaRecovery';
const idea = { id: 1, week_number: 1, day_of_week: 'Monday', scheduled_date: null, platform: 'facebook', post_type: 'image', topic: 'Draft', caption_hint: '', hashtag_hints: [], best_time: '', notes: '', is_approved: false, is_added_to_calendar: false };
const calendar = { id: 1, month: 10, year: 2026, month_name: 'October', business_type: 'retail', location: '', target_audience: '', month_theme: '', strategy_notes: '', generated_at: '2026-10-07T10:00:00Z', platforms: ['facebook'], posts_per_week: 1, posts: [], ideas: [idea] };
test('genuine empty history is valid; incomplete, duplicated and malformed calendar responses cannot succeed', () => {
  expect(parseIdeaHistory([])).toEqual([]); expect(parseIdeaSet(calendar).ideas).toHaveLength(1);
  for (const value of [{}, [calendar, calendar], [{ ...calendar, ideas: [{ ...idea, is_approved: 'true' }] }]]) expect(() => parseIdeaHistory(value)).toThrow();
  expect(parseIdea({ ...idea, access_token: 'discarded' })).not.toHaveProperty('access_token');
});
test('approval and draft creation acknowledgments follow actual backend fields', () => {
  expect(() => parseApproved({ approved: 1, total: 1 }, 1)).not.toThrow(); expect(() => parseApproved({ approved: 1, total: 2 }, 1)).toThrow();
  expect(parseCalendarAdded({ created: 0, message: '0 posts added to your content calendar as drafts.' }).created).toBe(0);
  expect(() => parseCalendarAdded({ created: 1, message: 'success' })).toThrow();
});
