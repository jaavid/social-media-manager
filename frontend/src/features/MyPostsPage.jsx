import { useLanguage } from '@/i18n';
import DataState from '@/components/ui/DataState';
import Button from '@/components/ui/Button';
import { ReadState, AccountScope } from '@/components/ui/accountRecovery';
import LookupState from '@/components/ui/LookupState';
/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useMemo, useRef, useState } from 'react';
import { ExternalLink, MessageCircle, Heart, Play, Loader2, ChevronDown } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import DateRangePicker from '../components/ui/DateRangePicker';
import PlatformTabs from '../components/ui/PlatformTabs';
import SocialPlatformIcon from '../components/ui/SocialPlatformIcon';
import { useSession as useAuth } from '../core/session';
import { useDateRange, useOAuthStatus, usePosts, useLookups, useWorkspaces } from '../hooks/useData';
import { PLATFORMS, fmt } from '../services/platforms';

function EmptyState({ filtered }) {
  const { t } = useLanguage();
  return <DataState state={filtered ? 'no-results' : 'empty'} title={t(filtered ? 'recovery.noResults' : 'posts.empty')} />;
}
export default function MyPostsPage() {
  return <AccountScope>{(_identity, enabled, key) => enabled && <Posts key={key} />}</AccountScope>;
}
function Posts() {
  const { user } = useAuth();
  const { t, tr } = useLanguage();
  const postFocus = useRef(null), oauthFocus = useRef(null);
  const [workspace, setWorkspace] = useState('');
  const workspaceResource = useWorkspaces();
  const clientId = user?.client_id || workspace;
  const [range, setRange] = useDateRange(30);
  const [platform, setPlatform] = useState('all');
  const postResource = usePosts(clientId, platform, range);
  const { posts, total, hasMore, loading, loadingMore, loadMore } = postResource;
  const oauthResource = useOAuthStatus(clientId);
  const { status: oauthStatus } = oauthResource;
  const lookupResource = useLookups();
  const { lookups } = lookupResource;

  const platformLabelMap = (lookups.platforms || []).reduce((acc, item) => {
    acc[item.key] = item.label;
    return acc;
  }, {});

  const platformMeta = (key) => ({
    label: platformLabelMap[key] || PLATFORMS[key]?.label || key,
    color: PLATFORMS[key]?.color || 'var(--text-secondary)',
    bg: PLATFORMS[key]?.bg || 'var(--surface-sunken)',
  });

  const connectedPlatforms = useMemo(() => (
    Object.entries(oauthStatus)
      .filter(([, value]) => value.status === 'active')
      .map(([key]) => key)
  ), [oauthStatus]);

  return (
    <div className="app-page app-page--content app-page--xl">
      <PageHeader
        title="My Posts"
        subtitle="Review recent content performance across your connected accounts."
        actions={<div className="flex flex-wrap gap-3"><Button disabled={!clientId || postResource.query.isFetching} onClick={() => postResource.refetch()}>{t('recovery.refresh')}</Button>{!user?.client_id && <select aria-label={t('posts.workspace')} value={workspace} onChange={e => { setWorkspace(e.target.value); setPlatform('all'); }}><option value="">{t('posts.chooseWorkspace')}</option>{workspaceResource.workspaces.map(row => <option key={row.id} value={row.id}>{row.name || row.company || row.id}</option>)}</select>}<DateRangePicker range={range} onChange={setRange} /></div>}
        meta={[
          { label: 'Showing', value: total === null ? '—' : `${posts.length} of ${total}` },
          { label: 'Platforms', value: oauthResource.data ? connectedPlatforms.length : '—' },
          { label: 'View', value: platform === 'all' ? 'All Platforms' : (platformLabelMap[platform] || PLATFORMS[platform]?.label || platform) },
        ].map(({ label, value }) => <span key={label}>{tr(label)}: {value}</span>)}
      />

      <div className="app-surface app-surface--compact" style={styles.filterBar}>
        <PlatformTabs
          selected={platform}
          onChange={setPlatform}
          connected={connectedPlatforms}
          platforms={lookups.platforms || []}
        />
      </div>

      {!user?.client_id && <ReadState resource={workspaceResource} refresh={workspaceResource.refetch} />}
      {!clientId && <DataState state="empty" title={t('posts.chooseWorkspace')} />}
      <section ref={postFocus} tabIndex={-1} aria-label={t('posts.reader')}>{clientId && <ReadState resource={postResource} refresh={postResource.refetch} returnFocusRef={postFocus} />}</section>
      <section ref={oauthFocus} tabIndex={-1} aria-label={t('posts.connections')}>{clientId && <ReadState resource={oauthResource} refresh={oauthResource.refetch} returnFocusRef={oauthFocus} />}</section>
      <LookupState resource={lookupResource} />
      {loading ? (
        null
      ) : !postResource.error && !postResource.offline && total !== null && posts.length === 0 ? (
        <EmptyState filtered={postResource.datasetCount > 0 || platform !== 'all'} />
      ) : (
        <div style={styles.grid}>
          {posts.map((post) => {
            const postPlatformMeta = platformMeta(post.platform);
            const title = post.caption || post.title || `${postPlatformMeta.label} ${post.post_type || 'post'} — ${post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Draft'}`;
            const isVideo = post.video_views > 0 || post.post_type?.includes('video');
            return (
              <article key={post.id} style={styles.card}>
                <div style={{ ...styles.thumb, background: postPlatformMeta.bg }}>
                  {post.thumbnail_url ? (
                    <img src={post.thumbnail_url} alt="" style={styles.thumbImg} />
                  ) : isVideo ? (
                    <Play size={28} style={{ color: postPlatformMeta.color }} />
                  ) : (
                    <span style={styles.thumbIcon}>
                      <SocialPlatformIcon platform={post.platform} size={34} />
                    </span>
                  )}
                </div>

                <div style={styles.cardBody}>
                  <div style={styles.cardTop}>
                    <span style={{ ...styles.platformPill, color: postPlatformMeta.color, background: `${postPlatformMeta.color}14` }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <SocialPlatformIcon platform={post.platform} size={14} />
                        {postPlatformMeta.label}
                      </span>
                    </span>
                    <span style={styles.dateText}>
                      {post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Draft'}
                    </span>
                  </div>

                  <h3 style={styles.cardTitle}>{title}</h3>

                  <div style={styles.metricRow}>
                    <span style={styles.metricChip}>👁 {fmt(post.impressions)}</span>
                    <span style={styles.metricChip}><Heart size={12} /> {fmt(post.likes)}</span>
                    <span style={styles.metricChip}><MessageCircle size={12} /> {fmt(post.comments)}</span>
                    {post.video_views > 0 && <span style={styles.metricChip}><Play size={12} /> {fmt(post.video_views)}</span>}
                  </div>

                  {post.post_url && (
                    <a href={post.post_url} target="_blank" rel="noreferrer" style={styles.viewLink}>
                      <ExternalLink size={14} />
                      View Post
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Load More */}
      {hasMore && !loading && (
        <div style={styles.loadMoreWrap}>
          <button onClick={loadMore} disabled={loadingMore} style={styles.loadMoreBtn}>
            {loadingMore ? (
              <><Loader2 size={15} style={{ animation: 'spin .8s linear infinite' }} /> Loading…</>
            ) : (
              <><ChevronDown size={15} /> Load More ({total - posts.length} remaining)</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  filterBar: {
    marginBottom: 20,
  },
  loading: { textAlign: 'center', color: 'var(--text-tertiary)', padding: 60 },
  emptyState: {
    background: 'var(--surface-card)',
    border: '1px solid var(--border-default)',
    borderRadius: 16,
    padding: 48,
    textAlign: 'center',
    boxShadow: '0 1px 6px rgba(15,23,42,.05)',
  },
  emptyTitle: { margin: '12px 0 8px', fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' },
  emptyText: { margin: 0, color: 'var(--text-secondary)', fontSize: 14 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 18,
  },
  card: {
    background: 'var(--surface-card)',
    border: '1px solid var(--border-default)',
    borderRadius: 18,
    overflow: 'hidden',
    boxShadow: '0 1px 8px rgba(15,23,42,.05)',
  },
  thumb: {
    height: 170,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottom: '1px solid #eef2f7',
  },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  thumbIcon: { fontSize: 34 },
  cardBody: { padding: 18 },
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
  platformPill: {
    fontSize: 12,
    fontWeight: 700,
    borderRadius: 999,
    padding: '6px 10px',
  },
  dateText: { fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' },
  cardTitle: {
    margin: '0 0 14px',
    fontSize: 15,
    lineHeight: 'var(--line-height-body)',
    fontWeight: 700,
    color: 'var(--text-primary)',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  metricRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
  metricChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 9px',
    borderRadius: 10,
    background: 'var(--surface-page)',
    color: 'var(--text-secondary)',
    fontSize: 12,
    fontWeight: 600,
  },
  viewLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    color: '#00d7ff',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 700,
  },
  loadMoreWrap: {
    display: 'flex',
    justifyContent: 'center',
    padding: '24px 0 8px',
  },
  loadMoreBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 28px',
    borderRadius: 12,
    border: '1.5px solid var(--border-default)',
    background: 'var(--surface-card)',
    color: 'var(--text-secondary)',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 1px 4px rgba(15,23,42,.06)',
    transition: 'all 0.15s ease',
  },
};
