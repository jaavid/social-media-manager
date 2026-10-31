/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useState, useCallback, useMemo, useRef } from 'react';
import { addMonths, subMonths, format, parseISO, endOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar, List, BarChart2, Layers3 } from 'lucide-react';
import { useAppSearchParams as useSearchParams } from '../core/navigation';
import { useSession as useAuth } from '../core/session';
import { useWorkspaces } from '../hooks/useData';
import {
  useCalendarPosts, useCalendarStats, useCalendarNotes,
  useCreatePost, useUpcomingPosts,
} from '../hooks/useCalendar';
import { PLATFORMS, usePlatformUiRegistry } from '../services/platforms';
import ChannelSources from '../components/calendar/ChannelSources';
import CalendarGrid from '../components/calendar/CalendarGrid';
import PostDrawer from '../components/calendar/PostDrawer';
import PostFormDrawer from '../components/calendar/PostFormDrawer';
import CalendarStats from '../components/calendar/CalendarStats';
import UpcomingPosts from '../components/calendar/UpcomingPosts';
import PageHeader from '../components/layout/PageHeader';
import SocialPlatformIcon from '../components/ui/SocialPlatformIcon';
import { useLanguage } from '../i18n';
import {
  addPersianMonths,
  startOfPersianMonth,
  persianMonthRange,
  gregorianMonthsCovering,
  dateKeyInRange,
} from '../utils/persianCalendar';
import { deriveCalendarStats } from '../utils/calendarStats';

function fmt(n, formatNumber) {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return formatNumber(n);
}

const STATUS_BADGE = {
  published: { bg: 'var(--success-bg)', color: 'var(--success)' },
  scheduled: { bg: 'var(--brand-primary-soft)', color: 'var(--brand-primary)' },
  draft: { bg: 'var(--surface-sunken)', color: 'var(--text-secondary)' },
  failed: { bg: 'var(--danger-bg)', color: 'var(--danger)' },
};

function ListView({
  postsByDate, onPostClick, onEditPost, onDeletePost, isAdmin,
  month, year, rangeStart, rangeEnd, isPersian, t, tr, formatDate, formatNumber,
}) {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const entries = Object.entries(postsByDate)
    .filter(([dateKey]) => isPersian
      ? dateKeyInRange(dateKey, rangeStart, rangeEnd)
      : dateKey.startsWith(prefix))
    .sort(([a], [b]) => a.localeCompare(b));

  if (entries.length === 0) {
    return (
      <div className="calendar-empty">
        <div className="calendar-empty-icon">📅</div>
        <div className="calendar-empty-heading">
          {t('calendar.noPosts', 'No posts this month')}
        </div>
        <div className="calendar-empty-description">{t('calendar.noPostsHint', 'Schedule your first post using the "+" button above.')}</div>
      </div>
    );
  }

  return (
    <div>
      {entries.map(([dateStr, posts]) => (
        <div key={dateStr} className="calendar-section-spacing">
          <div className="calendar-day-heading">
            <span className="calendar-day-title">
              {isPersian
                ? formatDate(parseISO(dateStr), { weekday: 'long', month: 'long', day: 'numeric' })
                : format(parseISO(dateStr), 'EEEE, MMMM d')}
            </span>
            <span className="calendar-day-count">
              {formatNumber(posts.length)} {t('common.posts', posts.length === 1 ? 'post' : 'posts')}
            </span>
          </div>

          {posts.map(post => {
            const platform = PLATFORMS[post.platform] || { color: 'var(--text-secondary)', label: post.platform };
            const badge = STATUS_BADGE[post.status] || STATUS_BADGE.draft;
            const timestamp = post.scheduled_at || post.published_at;
            const timeStr = timestamp
              ? isPersian
                ? formatDate(parseISO(timestamp), { hour: 'numeric', minute: '2-digit' })
                : format(parseISO(timestamp), 'h:mm a')
              : '';

            return (
              <div key={post.id} className="calendar-feed-post" style={{ '--calendar-platform-color': platform.color }}>
                <div className="calendar-feed-avatar" style={{ '--calendar-platform-tint': `color-mix(in srgb, ${platform.color} 13%, transparent)` }}>
                  <SocialPlatformIcon platform={post.platform} size={18} />
                </div>

                <div className="calendar-flex-fill">
                  <div className="calendar-post-heading">
                    <span className="calendar-post-title">
                      {post.title || tr('(no title)')}
                    </span>
                    <span className="calendar-status-badge" style={{ '--calendar-status-bg': badge.bg, '--calendar-status-color': badge.color }}>
                      {tr(post.status)}
                    </span>
                  </div>
                  <div className="calendar-post-excerpt">
                    {post.caption || tr('(no caption)')}
                  </div>
                  {post.hashtags && (
                    <div className="calendar-post-link">
                      {formatNumber(post.hashtags.split(' ').filter(h => h.startsWith('#')).length)} {tr('hashtags')}
                    </div>
                  )}
                  {post.status === 'published' && (post.impressions > 0 || post.likes > 0) && (
                    <div className="calendar-post-meta">
                      {post.impressions > 0 && <span>👁 {fmt(post.impressions, formatNumber)}</span>}
                      {post.likes > 0 && <span>❤️ {fmt(post.likes, formatNumber)}</span>}
                      {post.comments > 0 && <span>💬 {fmt(post.comments, formatNumber)}</span>}
                    </div>
                  )}
                </div>

                <div className="calendar-post-actions">
                  <div className="calendar-post-actions-heading">{timeStr}</div>
                  <div className="calendar-inline-actions">
                    <button onClick={event => onPostClick(post, event.currentTarget)} style={listBtnStyle}>{t('common.view', 'View')}</button>
                    {isAdmin && post.status !== 'published' && (
                      <>
                        <button onClick={event => onEditPost(post, event.currentTarget)} style={listBtnStyle}>{t('common.edit', 'Edit')}</button>
                        <button onClick={() => onDeletePost(post.id)} className="calendar-list-button calendar-list-button--danger">
                          {t('common.delete', 'Delete')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

const listBtnStyle = {
  padding: '4px 10px', borderRadius: 6,
  background: 'var(--surface-page)', border: '1px solid var(--border-default)',
  cursor: 'pointer', fontSize: 11, color: 'var(--text-secondary)',
};

export default function CalendarPage({ clientId: propClientId }) {
  const { platforms: calendarPlatforms } = usePlatformUiRegistry('scheduling');
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { workspaces: clients } = useWorkspaces();
  const { isPersian, language, t, tr, formatDate, formatNumber } = useLanguage();
  const isAdmin = user?.role === 'superadmin' || user?.role === 'staff';
  const isEmbedded = !!propClientId;
  const showClientSelector = isAdmin && !propClientId;
  const queryClientId = searchParams.get('client');
  const queryView = searchParams.get('view');
  const parsedClientId = queryClientId ? parseInt(queryClientId, 10) : null;
  const view = ['month', 'list', 'stats'].includes(queryView) ? queryView : 'month';

  const clientId = propClientId || parsedClientId || (isAdmin ? null : user?.client_id) || null;

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const visibleRange = useMemo(() => {
    if (isPersian) return persianMonthRange(currentDate);
    return {
      start: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
      end: endOfMonth(currentDate),
    };
  }, [currentDate, isPersian]);

  const queryMonths = useMemo(
    () => isPersian ? gregorianMonthsCovering(visibleRange.start, visibleRange.end) : null,
    [isPersian, visibleRange.start, visibleRange.end]
  );

  const [platform, setPlatform] = useState('all');

  const updateSearch = useCallback((updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') next.delete(key);
      else next.set(key, String(value));
    });
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const [detailPost, setDetailPost] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formDate, setFormDate] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  // Keep the calendar action alive as the detail panel is replaced by the editor.
  const calendarReturnFocusRef = useRef(null);

  const { postsByDate, loading: postsLoading, refetch: refetchPosts } =
    useCalendarPosts(clientId, month, year, platform === 'all' ? '' : platform, queryMonths);
  const { notesByDate } = useCalendarNotes(clientId, month, year, queryMonths);
  const { stats: apiStats } = useCalendarStats(clientId, month, year);
  const { upcoming } = useUpcomingPosts(clientId);
  const { create, update, remove, reschedule } = useCreatePost();

  const [sourceSelection, setSourceSelection] = useState({ clientId, value: '' });
  if (sourceSelection.clientId !== clientId) setSourceSelection({ clientId, value: '' });
  const selectedSource = sourceSelection.clientId === clientId ? sourceSelection.value : '';
  const setSelectedSource = value => setSourceSelection({ clientId, value });
  const filteredPostsByDate = useMemo(() => {
    if (!selectedSource) return postsByDate;
    return Object.fromEntries(Object.entries(postsByDate).map(([date, posts]) => [date,
      posts.filter(post => selectedSource === 'competitors' ? post.is_competitor
        : selectedSource === 'owned' ? !post.is_external : String(post.source_id) === selectedSource),
    ]).filter(([, posts]) => posts.length));
  }, [postsByDate, selectedSource]);

  const stats = useMemo(
    () => isPersian
      ? deriveCalendarStats(postsByDate, visibleRange.start, visibleRange.end)
      : apiStats,
    [isPersian, postsByDate, visibleRange.start, visibleRange.end, apiStats]
  );

  function prevMonth() {
    setCurrentDate(date => isPersian ? addPersianMonths(date, -1) : subMonths(date, 1));
  }

  function nextMonth() {
    setCurrentDate(date => isPersian ? addPersianMonths(date, 1) : addMonths(date, 1));
  }

  function goToday() {
    setCurrentDate(isPersian ? startOfPersianMonth(new Date()) : new Date());
  }

  function openPostDetail(post, trigger) {
    calendarReturnFocusRef.current = trigger || (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setDetailPost(post);
    setDetailOpen(true);
  }
  function closeDetail() { setDetailOpen(false); setTimeout(() => setDetailPost(null), 300); }

  function openFormForDate(date, trigger) {
    if (!isAdmin) return;
    calendarReturnFocusRef.current = trigger || (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setEditingPost(null);
    setFormDate(date);
    setFormOpen(true);
  }

  function openFormForEdit(post, trigger) {
    if (!isAdmin) return;
    if (trigger) calendarReturnFocusRef.current = trigger;
    setEditingPost(post);
    setFormDate(null);
    setFormOpen(true);
    setDetailOpen(false);
  }

  function closeForm() {
    setFormOpen(false);
    setTimeout(() => { setEditingPost(null); setFormDate(null); }, 300);
  }

  async function handleSavePost(data, postId) {
    let result;
    if (postId) result = await update(postId, data);
    else {
      if (!clientId) return { success: false, error: tr('No user selected.') };
      result = await create({ ...data, client: clientId });
    }
    if (result.success) { closeForm(); refetchPosts(); }
    return result;
  }

  async function handleDeletePost(postId) {
    const result = await remove(postId);
    if (result.success) { closeDetail(); refetchPosts(); }
    else alert(result.error);
  }

  async function handleReschedule(postId, datetime) {
    const result = await reschedule(postId, datetime);
    if (result.success) { setDetailPost(result.post); refetchPosts(); }
    else alert(result.error);
  }

  const views = [
    { key: 'month', icon: <Calendar size={14} />, label: t('calendar.month', 'Month') },
    { key: 'list', icon: <List size={14} />, label: t('calendar.list', 'List') },
    { key: 'stats', icon: <BarChart2 size={14} />, label: t('calendar.stats', 'Stats') },
  ];

  const pageTitle = t('calendar.title', 'Content Calendar');
  const monthTitle = isPersian
    ? formatDate(visibleRange.start, { month: 'long', year: 'numeric' })
    : format(currentDate, 'MMMM yyyy');

  if (showClientSelector && !clientId) {
    return (
      <div style={pageStyle}>
        <div className="calendar-container">
          <PageHeader
            title={pageTitle}
                        actions={(
              <select
                value=""
                onChange={event => {
                  const nextClientId = event.target.value ? parseInt(event.target.value, 10) : null;
                  updateSearch({ client: nextClientId });
                }}
                style={adminClientSelectStyle}
              >
                <option value="">{t('calendar.allUsers', 'All Users')}</option>
                {clients.map(client => <option key={client.id} value={client.id}>{client.company}</option>)}
              </select>
            )}
          />
          <div className="calendar-error-panel">
            <div className="calendar-error-icon">📅</div>
            <h2 className="calendar-error-heading">{pageTitle}</h2>
            <p className="calendar-error-description">
              {t('calendar.selectUser', 'Select a user from the top-right dropdown to view their content calendar.')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div className={isEmbedded ? 'calendar-container calendar-container--embedded' : 'calendar-container'}>
        <PageHeader
          title={pageTitle}
                    actions={showClientSelector ? (
            <select
              value={clientId || ''}
              onChange={event => {
                const nextClientId = event.target.value ? parseInt(event.target.value, 10) : null;
                updateSearch({ client: nextClientId });
              }}
              style={adminClientSelectStyle}
            >
              <option value="">{t('calendar.allUsers', 'All Users')}</option>
              {clients.map(client => <option key={client.id} value={client.id}>{client.company}</option>)}
            </select>
          ) : null}
        />

        <ChannelSources key={clientId} clientId={clientId} onRefresh={refetchPosts} selectedSource={selectedSource} onSelectSource={setSelectedSource} />
        <div className="calendar-toolbar">
          <div className="calendar-toolbar-title">
            <button onClick={prevMonth} style={navBtnStyle} aria-label={tr('Previous month')}>
              <ChevronLeft size={16} style={isPersian ? { transform: 'rotate(180deg)' } : undefined} />
            </button>
            <div className={isEmbedded ? 'calendar-current-period calendar-current-period--embedded' : 'calendar-current-period'}>
              {monthTitle}
            </div>
            <button onClick={nextMonth} style={navBtnStyle} aria-label={tr('Next month')}>
              <ChevronRight size={16} style={isPersian ? { transform: 'rotate(180deg)' } : undefined} />
            </button>
            <button onClick={goToday} style={todayBtnStyle}>{t('common.today', 'Today')}</button>
          </div>

          <div className="w-full min-w-0 flex-[1_1_100%] overflow-x-auto pb-1 [scrollbar-width:thin]"
            role="group" aria-label={isPersian ? 'فیلتر شبکهٔ اجتماعی' : 'Filter by social network'}>
            <div className="flex w-max min-w-full items-center gap-2">
              {[{ key: 'all', label: t('common.all', 'All') }, ...calendarPlatforms.map(p => ({ key: p.key, label: p.labels[language] || p.labels.en }))].map(item => (
                <button key={item.key} type="button" aria-pressed={platform === item.key}
                  onClick={() => setPlatform(item.key)}
                  className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${platform === item.key
                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-soft)] text-foreground'
                    : 'border-[var(--border-subtle)] bg-card text-[var(--text-secondary)] hover:bg-accent hover:text-foreground'}`}>
                  {item.key === 'all' ? <Layers3 size={15} aria-hidden /> : <SocialPlatformIcon platform={item.key} size={16} />}
                  {item.label || t('common.all', 'All')}
                </button>
              ))}
            </div>
          </div>

          <div className={isEmbedded ? 'calendar-toolbar-actions calendar-toolbar-actions--embedded' : 'calendar-toolbar-actions'}>
            {isAdmin && (
              <button onClick={event => openFormForDate(new Date(), event.currentTarget)} style={scheduleBtnStyle}>
                <Plus size={16} /> {t('calendar.schedulePost', 'Schedule Post')}
              </button>
            )}
            <div className="calendar-view-switcher">
              {views.map(item => (
                <button key={item.key} onClick={() => updateSearch({ view: item.key, client: clientId })} className={view === item.key ? 'calendar-view-button calendar-view-button--active' : 'calendar-view-button'}>
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {postsLoading && (
          <div className="calendar-loading-state">
            {t('calendar.loading', 'Loading calendar…')}
          </div>
        )}

        {!postsLoading && view === 'month' && (
          <div className="cal-fade">
            <CalendarGrid
              month={month}
              year={year}
              currentDate={currentDate}
              postsByDate={filteredPostsByDate}
              notesByDate={notesByDate}
              onDayClick={openFormForDate}
              onPostClick={openPostDetail}
              selectedPlatform={platform}
            />
          </div>
        )}

        {!postsLoading && view === 'list' && (
          <div className="cal-fade">
            {upcoming.length > 0 && (
              <div className="calendar-filter-panel">
                <div className="calendar-filter-title">
                  📅 {t('calendar.comingUp', 'Coming up this week')}
                </div>
                <UpcomingPosts posts={upcoming} />
              </div>
            )}
            <ListView
              postsByDate={filteredPostsByDate}
              onPostClick={openPostDetail}
              onEditPost={openFormForEdit}
              onDeletePost={handleDeletePost}
              isAdmin={isAdmin}
              month={month}
              year={year}
              rangeStart={visibleRange.start}
              rangeEnd={visibleRange.end}
              isPersian={isPersian}
              t={t}
              tr={tr}
              formatDate={formatDate}
              formatNumber={formatNumber}
            />
          </div>
        )}

        {!postsLoading && view === 'stats' && (
          <div className="cal-fade">
            <CalendarStats
              stats={stats}
              month={month}
              year={year}
              currentDate={currentDate}
              rangeStart={visibleRange.start}
              rangeEnd={visibleRange.end}
              postsByDate={filteredPostsByDate}
            />
          </div>
        )}

        <PostDrawer
          post={detailPost}
          isOpen={detailOpen}
          onClose={closeDetail}
          returnFocusRef={calendarReturnFocusRef}
          onEdit={openFormForEdit}
          onDelete={handleDeletePost}
          onReschedule={handleReschedule}
        />
        <PostFormDrawer
          date={formDate}
          post={editingPost}
          isOpen={formOpen}
          onClose={closeForm}
          returnFocusRef={calendarReturnFocusRef}
          onSave={handleSavePost}
          clientId={clientId}
          readOnly={!isAdmin}
        />
      </div>
    </div>
  );
}

const pageStyle = {
  padding: '28px 32px 40px', background: 'var(--surface-page)', minHeight: '100vh',
  width: '100%', maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box',
};

const navBtnStyle = {
  width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-card)',
  border: '1px solid var(--border-default)', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', transition: 'background 0.15s',
};

const todayBtnStyle = {
  padding: '6px 12px', borderRadius: 8, background: 'var(--surface-page)',
  border: '1px solid var(--border-default)', cursor: 'pointer', fontSize: 12,
  fontWeight: 600, color: 'var(--text-secondary)',
};

const scheduleBtnStyle = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
  background: '#00d7ff', color: 'var(--text-primary)', border: 'none', cursor: 'pointer',
  fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
};

const adminClientSelectStyle = {
  padding: '8px 14px', borderRadius: 10, border: '1.5px solid var(--border-default)',
  fontSize: 13, color: 'var(--text-primary)', background: 'var(--surface-card)', outline: 'none',
  minWidth: 200, fontWeight: 600,
};
