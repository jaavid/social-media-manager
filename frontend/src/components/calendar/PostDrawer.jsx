/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useState } from 'react';
import { X, ExternalLink, Edit2, Trash2, Calendar, RefreshCw } from 'lucide-react';
import { PLATFORMS } from '../../services/platforms';
import SocialPlatformIcon from '../ui/SocialPlatformIcon';
import { useLanguage } from '../../i18n';

const STATUS_BADGE = {
  published: { bg: '#D1FAE5', color: '#059669', label: 'Published' },
  scheduled: { bg: '#DBEAFE', color: '#2563EB', label: 'Scheduled' },
  draft: { bg: '#F1F5F9', color: '#64748B', label: 'Draft' },
  failed: { bg: '#FEE2E2', color: '#EF4444', label: 'Failed' },
};

function compactNumber(value, formatNumber) {
  const number = Number(value || 0);
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1)}M`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(1)}K`;
  return formatNumber(number);
}

export default function PostDrawer({ post, isOpen, onClose, onEdit, onDelete, onReschedule }) {
  const { isPersian, tr, formatDate, formatNumber } = useLanguage();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [newDatetime, setNewDatetime] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  if (!post) return null;

  const platform = PLATFORMS[post.platform] || { color: '#64748B', label: post.platform };
  const badge = STATUS_BADGE[post.status] || STATUS_BADGE.draft;
  const bestTime = post.scheduled_at || post.published_at;
  const dateDisplay = bestTime
    ? formatDate(bestTime, {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
      })
    : '—';

  const performanceScore = Number(post.performance_score || 0);
  const scoreMax = 1000;

  async function handleReschedule() {
    if (!newDatetime) return;
    setRescheduling(true);
    await onReschedule(post.id, newDatetime);
    setRescheduling(false);
    setRescheduleMode(false);
    setNewDatetime('');
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'var(--overlay-backdrop)',
          zIndex: 1000,
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 0.25s',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      />

      <div style={{
        position: 'fixed', top: 0, bottom: 0, insetInlineEnd: 0,
        width: 420,
        maxWidth: '100vw',
        background: 'var(--surface-card)',
        boxShadow: isPersian ? '4px 0 24px rgba(0,0,0,0.12)' : '-4px 0 24px rgba(0,0,0,0.12)',
        zIndex: 1001,
        transform: isOpen ? 'translateX(0)' : isPersian ? 'translateX(-100%)' : 'translateX(100%)',
        transition: 'transform 0.25s ease-out',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border-default)',
          display: 'flex', alignItems: 'center', gap: 12,
          background: platform.color + '10',
          position: 'sticky', top: 0, zIndex: 1,
        }}>
          <SocialPlatformIcon platform={post.platform} size={28} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
              {platform.label}
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '1px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: badge.bg, color: badge.color, marginTop: 2,
            }}>
              {tr(badge.label)}
            </div>
          </div>
          <button onClick={onClose} aria-label={tr('Close')} style={iconButtonStyle}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px', flex: 1 }}>
          {post.title && (
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 8 }}>
              {post.title}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--text-secondary)', fontSize: 13 }}>
            <Calendar size={14} />
            <span>{dateDisplay}</span>
          </div>

          {post.caption && (
            <div style={{
              background: 'var(--surface-sunken)', borderRadius: 8, padding: '12px 14px',
              fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12,
              whiteSpace: 'pre-wrap',
            }}>
              {post.caption}
            </div>
          )}

          {post.hashtags && (
            <div style={{ marginBottom: 12, fontSize: 13, color: '#2563EB' }}>
              {post.hashtags}
            </div>
          )}

          {post.media_url && (
            <div style={{ marginBottom: 14, borderRadius: 8, overflow: 'hidden' }}>
              <img
                src={post.media_url}
                alt={tr('Post media')}
                style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }}
                onError={event => { event.currentTarget.style.display = 'none'; }}
              />
            </div>
          )}

          {post.status === 'published' && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                {tr('Performance')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[
                  { icon: '👁', label: 'Impressions', value: post.impressions },
                  { icon: '📡', label: 'Reach', value: post.reach },
                  { icon: '❤️', label: 'Likes', value: post.likes },
                  { icon: '💬', label: 'Comments', value: post.comments },
                  { icon: '📤', label: 'Shares', value: post.shares },
                  { icon: '🔖', label: 'Saves', value: post.saves },
                  { icon: '▶️', label: 'Views', value: post.video_views },
                ].filter(metric => metric.value > 0).map(metric => (
                  <div key={metric.label} style={{
                    background: 'var(--surface-sunken)', borderRadius: 8, padding: '8px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 16 }}>{metric.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {compactNumber(metric.value, formatNumber)}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{tr(metric.label)}</div>
                  </div>
                ))}
              </div>

              {performanceScore > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    <span>{tr('Performance Score')}</span>
                    <span>{formatNumber(Math.min(performanceScore, scoreMax))} {tr('pts')}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--border-default)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      width: `${Math.min((performanceScore / scoreMax) * 100, 100)}%`,
                      background: '#2563EB', transition: 'width 0.8s ease',
                    }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {post.post_url && (
            <a
              href={post.post_url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8,
                background: platform.color, color: '#fff',
                textDecoration: 'none', fontSize: 13, fontWeight: 600,
                marginBottom: 14,
              }}
            >
              <ExternalLink size={14} />
              {tr('View on')} {platform.label}
            </a>
          )}

          {post.notes && (
            <div style={{
              background: '#FFFBEB', border: '1px solid #FDE68A',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 12, color: '#92400E', marginBottom: 14,
            }}>
              <strong>{tr('Agency note')}:</strong> {post.notes}
            </div>
          )}

          {post.status === 'scheduled' && (
            <div style={{ marginBottom: 14 }}>
              {!rescheduleMode ? (
                <button
                  onClick={() => setRescheduleMode(true)}
                  style={secondaryFullButtonStyle}
                >
                  <RefreshCw size={14} /> {tr('Reschedule')}
                </button>
              ) : (
                <div style={{ background: 'var(--surface-sunken)', borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    {tr('New scheduled time')}:
                  </div>
                  <input
                    type="datetime-local"
                    value={newDatetime}
                    onChange={event => setNewDatetime(event.target.value)}
                    data-ltr="true"
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 6,
                      border: '1px solid var(--border-default)', fontSize: 13,
                      marginBottom: 8, boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleReschedule}
                      disabled={!newDatetime || rescheduling}
                      style={{
                        flex: 1, padding: '8px', borderRadius: 6,
                        background: '#2563EB', color: '#fff',
                        border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                        opacity: (!newDatetime || rescheduling) ? 0.6 : 1,
                      }}
                    >
                      {rescheduling ? tr('Saving…') : tr('Confirm')}
                    </button>
                    <button
                      onClick={() => { setRescheduleMode(false); setNewDatetime(''); }}
                      style={cancelButtonStyle}
                    >
                      {tr('Cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {post.status !== 'published' && (
          <div style={{
            padding: '14px 20px', borderTop: '1px solid var(--border-default)',
            display: 'flex', gap: 8,
            position: 'sticky', bottom: 0, background: 'var(--surface-card)', zIndex: 1,
          }}>
            <button
              onClick={() => onEdit?.(post)}
              style={{ ...secondaryFullButtonStyle, flex: 1, width: 'auto' }}
            >
              <Edit2 size={14} /> {tr('Edit')}
            </button>
            {!deleteConfirm ? (
              <button
                onClick={() => setDeleteConfirm(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '9px 16px', borderRadius: 8,
                  background: '#FEF2F2', border: '1px solid #FECACA',
                  color: '#EF4444', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                }}
              >
                <Trash2 size={14} /> {tr('Delete')}
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => { onDelete?.(post.id); setDeleteConfirm(false); }}
                  style={{
                    padding: '9px 14px', borderRadius: 8,
                    background: '#EF4444', color: '#fff',
                    border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  }}
                >
                  {tr('Confirm Delete')}
                </button>
                <button onClick={() => setDeleteConfirm(false)} style={cancelButtonStyle}>
                  {tr('Cancel')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

const iconButtonStyle = {
  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4,
};

const secondaryFullButtonStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 8,
  background: 'var(--surface-sunken)', border: '1px solid var(--border-default)',
  color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600,
  cursor: 'pointer', width: '100%',
};

const cancelButtonStyle = {
  padding: '8px 12px', borderRadius: 6,
  background: 'var(--surface-card)', border: '1px solid var(--border-default)',
  cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)',
};
