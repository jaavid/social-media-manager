import { eachDayOfInterval, format, parseISO, startOfDay } from 'date-fns';

function increment(target, key) {
  if (!key) return;
  target[key] = (target[key] || 0) + 1;
}

function scorePost(post) {
  const explicitScore = post?.performance_score;
  if (explicitScore !== null && explicitScore !== undefined && Number.isFinite(Number(explicitScore))) {
    return Number(explicitScore);
  }
  return (
    Number(post?.impressions || 0) +
    Number(post?.reach || 0) +
    Number(post?.likes || 0) * 4 +
    Number(post?.comments || 0) * 6 +
    Number(post?.shares || 0) * 8 +
    Number(post?.saves || 0) * 6
  );
}

export function deriveCalendarStats(postsByDate, start, end, now = new Date()) {
  if (!start || !end) return null;

  const days = eachDayOfInterval({ start: startOfDay(start), end: startOfDay(end) });
  const startKey = format(start, 'yyyy-MM-dd');
  const endKey = format(end, 'yyyy-MM-dd');

  const visibleEntries = Object.entries(postsByDate || {})
    .filter(([dateKey]) => dateKey >= startKey && dateKey <= endKey)
    .sort(([a], [b]) => a.localeCompare(b));

  const published = [];
  const byPlatform = {};
  const byDayOfWeek = {};
  const byPostType = {};
  const publishedDates = new Set();

  visibleEntries.forEach(([dateKey, posts]) => {
    (posts || []).forEach((post) => {
      if (post?.status !== 'published') return;
      published.push(post);
      publishedDates.add(dateKey);
      increment(byPlatform, post.platform || 'unknown');
      increment(byPostType, post.post_type || 'unknown');
      increment(byDayOfWeek, format(parseISO(dateKey), 'EEEE'));
    });
  });

  const today = startOfDay(now);
  const postingGaps = days
    .filter((day) => day <= today)
    .map((day) => format(day, 'yyyy-MM-dd'))
    .filter((dateKey) => !publishedDates.has(dateKey));

  const bestPerformingPost = published.reduce((best, post) => {
    if (!best) return post;
    return scorePost(post) > scorePost(best) ? post : best;
  }, null);

  const weeks = Math.max(days.length / 7, 1);

  return {
    total_published: published.length,
    avg_per_week: Number((published.length / weeks).toFixed(1)),
    by_platform: byPlatform,
    by_day_of_week: byDayOfWeek,
    by_post_type: byPostType,
    best_performing_post: bestPerformingPost,
    posting_gaps: postingGaps,
    source: 'visible_range',
  };
}
