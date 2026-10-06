import { parseReport } from './analytics-reports';
const filters = { social_account: 10, since: '2026-10-01', until: '2026-10-06', page: 1 };
const report = () => ({ version: 1, workspace_id: 7, account_id: 10, provider: 'contract_example',
  availability: 'available', dataset_count: 1, period: { since: filters.since, until: filters.until },
  metrics: [{ key: 'views', title_en: 'Views', title_fa: 'بازدید', unit: 'count', period: 'snapshot' }],
  sync: { state: 'stale', last_success_at: '2026-10-01T10:00:00Z', last_failure_at: null, last_attempt_at: '2026-10-01T10:00:00Z', stale_after_seconds: 86400 },
  rows: [{ id: 1, date: '2026-10-01', observed_at: '2026-10-01T10:00:00Z', state: 'available', values: { views: 0 } }],
  pagination: { page: 1, count: 1, page_size: 100, has_next: false, has_previous: false } });
test('preserves real zero, missing values, historical unknown and freshness without guessing', () => {
  const wire = report(); expect(parseReport(wire, 7, filters).rows[0].values.views).toBe(0);
  wire.rows[0].values.views = null as unknown as number; wire.rows[0].state = 'unknown';
  expect(parseReport(wire, 7, filters).rows[0].values.views).toBeNull();
  expect(parseReport(wire, 7, filters).sync.state).toBe('stale');
});
test.each(['scope', 'date', 'metric', 'nan', 'malformed', 'pagination', 'unavailable'])('%s never becomes real data or an empty success', kind => {
  const wire = report();
  if (kind === 'scope') wire.account_id = 11;
  if (kind === 'date') wire.rows[0].date = '2026-09-01';
  if (kind === 'metric') wire.metrics.push(wire.metrics[0]);
  if (kind === 'nan') wire.rows[0].values.views = NaN;
  if (kind === 'malformed') wire.rows = {} as typeof wire.rows;
  if (kind === 'pagination') wire.pagination.page = 2;
  if (kind === 'unavailable') wire.availability = 'unavailable';
  expect(() => parseReport(wire, 7, filters)).toThrow();
});
