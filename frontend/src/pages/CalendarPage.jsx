/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { addMonths, subMonths, format, parseISO, endOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar, List, BarChart2 } from 'lucide-react';
import { useAppSearchParams as useSearchParams } from '../app/navigation';
import { useSession as useAuth } from '../app/session';
import { useWorkspaces } from '../hooks/useData';
import {
  useCalendarPosts, useCalendarStats, useCalendarNotes,
  useCreatePost, useUpcomingPosts,
} from '../hooks/useCalendar';
import { PLATFORMS, PLATFORM_LIST } from '../services/platforms';
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

const STYLE_ID = 'cal-keyframes';
if (!document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes calFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .cal-fade { animation: calFadeIn 0.2s ease-out; }
  `;
  document.head.appendChild(style);
}

function fmt(n, formatNumber) {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return formatNumber(n);
}

const STATUS_BADGE = {
  published: { bg: '#D1FAE5', color: '#059669' },
  scheduled: { bg: '#e6fbff', color: '#007a9a' },
  draft: { bg: '#F1F5F9', color: 'var(--text-secondary)' },
  failed: { bg: '#FEE2E2', color: '#EF4444' },
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
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-tertiary)' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
          {t('calendar.noPosts', 'No posts this month')}
        </div>
        <div style={{ fontSize: 13 }}>{t('calendar.noPostsHint', 'Schedule your first post using the "+" button above.')}</div>
      </div>
    );
  }

  return (
    <div>
      {entries.map(([dateStr, posts]) => (
        <div key={dateStr} style={{ marginBottom: 24 }}>
          <div style={{
            position: 'sticky', top: 0, zIndex: 10,
            background: 'var(--surface-page)', padding: '8px 0',
            borderBottom: '2px solid var(--border-default)', marginBottom: 8,
          }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
              {isPersian
                ? formatDate(parseISO(dateStr), { weekday: 'long', month: 'long', day: 'numeric' })
                : format(parseISO(dateStr), 'EEEE, MMMM d')}
            </span>
            <span style={{ marginInlineStart: 8, fontSize: 12, color: 'var(--text-tertiary)' }}>
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
              <div key={post.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                background: 'var(--surface-card)', borderRadius: 10,
                border: '1px solid var(--border-default)',
                borderInlineStart: `4px solid ${platform.color}`,
                padding: '12px 16px', marginBottom: 8,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: platform.color + '20',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <SocialPlatformIcon platform={post.platform} size={18} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                      {post.title || tr('(no title)')}
                    </span>
                    <span style={{
                      padding: '1px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                      background: badge.bg, color: badge.color,
                    }}>
                      {tr(post.status)}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4,
                    overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', marginBottom: 4,
                  }}>
                    {post.caption || tr('(no caption)')}
                  </div>
                  {post.hashtags && (
                    <div style={{ fontSize: 11, color: '#007a9a' }}>
                      {formatNumber(post.hashtags.split(' ').filter(h => h.startsWith('#')).length)} {tr('hashtags')}
                    </div>
                  )}
                  {post.status === 'published' && (post.impressions > 0 || post.likes > 0) && (
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                      {post.impressions > 0 && <span>👁 {fmt(post.impressions, formatNumber)}</span>}
                      {post.likes > 0 && <span>❤️ {fmt(post.likes, formatNumber)}</span>}
                      {post.comments > 0 && <span>💬 {fmt(post.comments, formatNumber)}</span>}
                    </div>
                  )}
                </div>

                <div style={{ flexShrink: 0, textAlign: 'end' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>{timeStr}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => onPostClick(post)} style={listBtnStyle}>{t('common.view', 'View')}</button>
                    {isAdmin && post.status !== 'published' && (
                      <>
                        <button onClick={() => onEditPost(post)} style={listBtnStyle}>{t('common.edit', 'Edit')}</button>
                        <button onClick={() => onDeletePost(post.id)} style={{ ...listBtnStyle, color: '#EF4444', borderColor: '#FECACA' }}>
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { workspaces: clients } = useWorkspaces();
  const { isPersian, t, tr, formatDate, formatNumber } = useLanguage();
  const isAdmin = user?.role === 'superadmin' || user?.role === 'staff';
  const isEmbedded = !!propClientId;
  const showClientSelector = isAdmin && !propClientId;
  const queryClientId = searchParams.get('client');
  const queryView = searchParams.get('view');
  const parsedClientId = queryClientId ? parseInt(queryClientId, 10) : null;
  const initialView = ['month', 'list', 'stats'].includes(queryView) ? queryView : 'month';

  const [selectedClientId, setSelectedClientId] = useState(
    propClientId || parsedClientId || (isAdmin ? null : user?.client_id) || null
  );
  const clientId = selectedClientId;

  useEffect(() => {
    if (!clientId && !isAdmin && user?.client_id) setSelectedClientId(user.client_id);
  }, [user, isAdmin, clientId]);

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

  const [view, setView] = useState(initialView);
  const [platform, setPlatform] = useState('all');

  const updateSearch = useCallback((updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') next.delete(key);
      else next.set(key, String(value));
    });
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (parsedClientId && parsedClientId !== clientId) setSelectedClientId(parsedClientId);
    if (['month', 'list', 'stats'].includes(queryView) && queryView !== view) setView(queryView);
  }, [parsedClientId, queryView, clientId, view]);

  const [detailPost, setDetailPost] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formDate, setFormDate] = useState(null);
  const [editingPost, setEditingPost] = useState(null);

  const { postsByDate, loading: postsLoading, refetch: refetchPosts } =
    useCalendarPosts(clientId, month, year, platform === 'all' ? '' : platform, queryMonths);
  const { notesByDate } = useCalendarNotes(clientId, month, year, queryMonths);
  const { stats: apiStats } = useCalendarStats(clientId, month, year);
  const { upcoming } = useUpcomingPosts(clientId);
  const { create, update, remove, reschedule } = useCreatePost();

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

  function openPostDetail(post) { setDetailPost(post); setDetailOpen(true); }
  function closeDetail() { setDetailOpen(false); setTimeout(() => setDetailPost(null), 300); }

  function openFormForDate(date) {
    if (!isAdmin) return;
    setEditingPost(null);
    setFormDate(date);
    setFormOpen(true);
  }

  function openFormForEdit(post) {
    if (!isAdmin) return;
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
  const pageSubtitle = t('calendar.subtitle', 'Plan, review, and measure your scheduled content.');
  const monthTitle = isPersian
    ? formatDate(visibleRange.start, { month: 'long', year: 'numeric' })
    : format(currentDate, 'MMMM yyyy');

  if (showClientSelector && !clientId) {
    return (
      <div style={pageStyle}>
        <div style={{ maxWidth: 1480, margin: '0 auto' }}>
          <PageHeader
            title={pageTitle}
            subtitle={pageSubtitle}
            actions={(
              <select
                value=""
                onChange={event => {
                  const nextClientId = event.target.value ? parseInt(event.target.value, 10) : null;
                  setSelectedClientId(nextClientId);
                  updateSearch({ client: nextClientId });
                }}
                style={adminClientSelectStyle}
              >
                <option value="">{t('calendar.allUsers', 'All Users')}</option>
                {clients.map(client => <option key={client.id} value={client.id}>{client.company}</option>)}
              </select>
            )}
          />
          <div style={{ padding: 40, maxWidth: 500, margin: '60px auto', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>{pageTitle}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 0 }}>
              {t('calendar.selectUser', 'Select a user from the top-right dropdown to view their content calendar.')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: isEmbedded ? '100%' : 1480, margin: isEmbedded ? '0' : '0 auto' }}>
        <PageHeader
          title={pageTitle}
          subtitle={pageSubtitle}
          actions={showClientSelector ? (
            <select
              value={clientId || ''}
              onChange={event => {
                const nextClientId = event.target.value ? parseInt(event.target.value, 10) : null;
                setSelectedClientId(nextClientId);
                updateSearch({ client: nextClientId });
              }}
              style={adminClientSelectStyle}
            >
              <option value="">{t('calendar.allUsers', 'All Users')}</option>
              {clients.map(client => <option key={client.id} value={client.id}>{client.company}</option>)}
            </select>
          ) : null}
        />

        <div className="calendar-toolbar" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20, flexWrap: 'wrap', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: '1 1 260px', minWidth: 0 }}>
            <button onClick={prevMonth} style={navBtnStyle} aria-label={tr('Previous month')}>
              <ChevronLeft size={16} style={isPersian ? { transform: 'rotate(180deg)' } : undefined} />
            </button>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', minWidth: isEmbedded ? 140 : 160, textAlign: 'center' }}>
              {monthTitle}
            </div>
            <button onClick={nextMonth} style={navBtnStyle} aria-label={tr('Next month')}>
              <ChevronRight size={16} style={isPersian ? { transform: 'rotate(180deg)' } : undefined} />
            </button>
            <button onClick={goToday} style={todayBtnStyle}>{t('common.today', 'Today')}</button>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: '999 1 420px', minWidth: 0 }}>
            {[{ key: 'all', label: t('common.all', 'All'), color: '#00d7ff' }, ...PLATFORM_LIST.map(key => ({ key, ...PLATFORMS[key] }))].map(item => (
              <button key={item.key} onClick={() => setPlatform(item.key)} style={{
                padding: '5px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                background: platform === item.key ? '#00d7ff' : '#fff', color: platform === item.key ? '#fff' : 'var(--text-secondary)',
                border: platform === item.key ? '1px solid #00d7ff' : '1px solid var(--border-default)',
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {item.key === 'all' ? null : <SocialPlatformIcon platform={item.key} size={14} />}
                  {item.label?.split(' ')[0] || t('common.all', 'All')}
                </span>
              </button>
            ))}
          </div>

          <div style={{ marginInlineStart: isEmbedded ? 0 : 'auto', display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: isEmbedded ? 'flex-start' : 'flex-end', flex: '1 1 260px', minWidth: 0 }}>
            {isAdmin && (
              <button onClick={() => openFormForDate(new Date())} style={scheduleBtnStyle}>
                <Plus size={16} /> {t('calendar.schedulePost', 'Schedule Post')}
              </button>
            )}
            <div style={{ display: 'flex', border: '1px solid var(--border-default)', borderRadius: 8, overflow: 'hidden', flexWrap: 'wrap', maxWidth: '100%' }}>
              {views.map(item => (
                <button key={item.key} onClick={() => { setView(item.key); updateSearch({ view: item.key, client: clientId }); }} style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: view === item.key ? '#00d7ff' : '#fff', color: view === item.key ? '#fff' : 'var(--text-secondary)', transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}>
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {postsLoading && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)', fontSize: 14 }}>
            {t('calendar.loading', 'Loading calendar…')}
          </div>
        )}

        {!postsLoading && view === 'month' && (
          <div className="cal-fade">
            <CalendarGrid
              month={month}
              year={year}
              currentDate={currentDate}
              postsByDate={postsByDate}
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
              <div style={{ background: 'var(--surface-card)', borderRadius: 12, border: '1px solid var(--border-default)', padding: '16px 20px', marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                  📅 {t('calendar.comingUp', 'Coming up this week')}
                </div>
                <UpcomingPosts posts={upcoming} />
              </div>
            )}
            <ListView
              postsByDate={postsByDate}
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
              postsByDate={postsByDate}
            />
          </div>
        )}

        <PostDrawer
          post={detailPost}
          isOpen={detailOpen}
          onClose={closeDetail}
          onEdit={openFormForEdit}
          onDelete={handleDeletePost}
          onReschedule={handleReschedule}
        />
        <PostFormDrawer
          date={formDate}
          post={editingPost}
          isOpen={formOpen}
          onClose={closeForm}
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
