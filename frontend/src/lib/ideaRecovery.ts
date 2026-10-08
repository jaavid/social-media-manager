type Row = Record<string, unknown>;
const obj = (v: unknown): v is Row => !!v && typeof v === 'object' && !Array.isArray(v);
function check(v: unknown): asserts v { if (!v) throw new Error('Invalid ideas response'); }
const id = (v: unknown) => Number.isSafeInteger(v) && Number(v) > 0;
export function parseIdea(v: unknown) {
  check(obj(v) && id(v.id) && Number.isInteger(v.week_number) && ['day_of_week','platform','post_type','topic','caption_hint','best_time','notes'].every(k => typeof v[k] === 'string') && typeof v.is_approved === 'boolean' && typeof v.is_added_to_calendar === 'boolean' && Array.isArray(v.hashtag_hints) && v.hashtag_hints.every(tag => typeof tag === 'string') && (v.scheduled_date === null || (typeof v.scheduled_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.scheduled_date))));
  return Object.fromEntries(['id','week_number','day_of_week','scheduled_date','platform','post_type','topic','caption_hint','hashtag_hints','best_time','notes','is_approved','is_added_to_calendar'].map(k => [k, v[k]]));
}
export function parseIdeaSet(v: unknown) {
  check(obj(v) && id(v.id) && Number.isInteger(v.month) && Number(v.month) >= 1 && Number(v.month) <= 12 && Number.isInteger(v.year) && Number.isInteger(v.posts_per_week) && ['month_name','business_type','location','target_audience','month_theme','strategy_notes','generated_at'].every(k => typeof v[k] === 'string') && Number.isFinite(Date.parse(String(v.generated_at))) && Array.isArray(v.platforms) && v.platforms.every(p => typeof p === 'string') && Array.isArray(v.posts) && Array.isArray(v.ideas));
  const ideas = v.ideas.map(parseIdea); check(new Set(ideas.map(r => r.id)).size === ideas.length);
  return { id: v.id, ...Object.fromEntries(['id','month','year','month_name','business_type','location','target_audience','platforms','posts_per_week','month_theme','strategy_notes','posts','generated_at'].map(k => [k, v[k]])), ideas };
}
export function parseIdeaHistory(v: unknown) {
  check(Array.isArray(v)); const rows = v.map(parseIdeaSet); check(new Set(rows.map(r => r.id)).size === rows.length); return rows;
}
export function parseApproved(v: unknown, total: number) { check(obj(v) && Number.isInteger(v.approved) && Number(v.approved) >= 0 && v.total === total && Number(v.approved) <= total); }
export function parseCalendarAdded(v: unknown) { check(obj(v) && Number.isInteger(v.created) && Number(v.created) >= 0 && typeof v.message === 'string' && v.message === `${v.created} post${v.created !== 1 ? 's' : ''} added to your content calendar as drafts.`); return v; }
