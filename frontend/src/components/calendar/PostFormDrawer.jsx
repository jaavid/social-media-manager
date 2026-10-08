/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useState, useEffect, useMemo } from 'react';
import { isBefore } from 'date-fns';
import { X, AlertCircle } from 'lucide-react';
import { connectedPlatforms, PLATFORMS, usePlatformUiRegistry } from '../../services/platforms';
import usePlatformConnections from '../../hooks/usePlatformConnections';
import { useSuggestedTimes } from '../../hooks/useCalendar';
import SocialPlatformIcon from '../ui/SocialPlatformIcon';
import { useLanguage } from '../../i18n';

const CHAR_LIMITS = {
  facebook: 63206,
  instagram: 2200,
  linkedin: 3000,
  youtube: 5000,
  google_my_business: 1500,
  telegram: 4096,
  bale: 4096,
};

const POST_TYPES = ['image', 'video', 'reel', 'story', 'carousel', 'text', 'article', 'short'];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getMinScheduleValue() {
  const now = new Date();
  const pad = value => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function toLocalDateTime(value) {
  const date = new Date(value);
  const pad = item => String(item).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function CharCounter({ text, limit, formatNumber }) {
  const count = (text || '').length;
  const pct = count / limit;
  const color = pct > 0.95 ? '#EF4444' : pct > 0.80 ? '#F59E0B' : '#10B981';
  return (
    <div style={{ fontSize: 11, color, textAlign: 'end', marginTop: 2 }}>
      {formatNumber(count)} / {formatNumber(limit)}
    </div>
  );
}

function SuggestRow({ clientId, platform }) {
  const { suggestions, source } = useSuggestedTimes(clientId, platform);
  const { tr, formatNumber } = useLanguage();
  if (!suggestions.length) return null;

  return (
    <div style={{
      background: '#EFF6FF', border: '1px solid #BFDBFE',
      borderRadius: 8, padding: '8px 12px', marginTop: 6, fontSize: 12,
    }}>
      <span style={{ color: '#2563EB', fontWeight: 600 }}>
        💡 {tr('Best times for')} {PLATFORMS[platform]?.label || platform}:{' '}
      </span>
      <span style={{ color: '#1e40af' }}>
        {suggestions.slice(0, 4).map(suggestion => (
          suggestion.note || `${tr(DAY_NAMES[suggestion.day_of_week])} ${formatNumber(suggestion.hour)}:${String(suggestion.minute || 0).padStart(2, '0')}`
        )).join('، ')}
      </span>
      {source === 'industry' && <span style={{ color: '#64748B' }}> ({tr('industry')})</span>}
    </div>
  );
}

export default function PostFormDrawer({ date, post, isOpen, onClose, onSave, clientId, readOnly }) {
  const { isPersian, tr, formatDate, formatNumber } = useLanguage();
  const isEdit = !!post;
  const {
    status: connectionStatus,
    loaded: connectionsLoaded,
    error: connectionError,
  } = usePlatformConnections(isOpen ? clientId : null);

  const [platform, setPlatform] = useState(post?.platform || 'instagram');
  const [postType, setPostType] = useState(post?.post_type || 'image');
  const [title, setTitle] = useState(post?.title || '');
  const [caption, setCaption] = useState(post?.caption || '');
  const [hashtags, setHashtags] = useState(post?.hashtags || '');
  const [mediaUrl, setMediaUrl] = useState(post?.media_url || '');
  const [postUrl, setPostUrl] = useState(post?.post_url || '');
  const [status, setStatus] = useState(post?.status === 'scheduled' ? 'scheduled' : 'draft');
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState(post?.notes || '');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const { platforms: platformRegistry } = usePlatformUiRegistry();
  const compatiblePlatforms = useMemo(
    () => connectedPlatforms(platformRegistry, connectionStatus, postType),
    [platformRegistry, connectionStatus, postType]
  );
  const selectablePlatforms = useMemo(() => {
    if (!isEdit || !platform || compatiblePlatforms.some(item => item.key === platform)) {
      return compatiblePlatforms;
    }
    const savedPlatform = platformRegistry.find(item => item.key === platform);
    return savedPlatform ? [savedPlatform, ...compatiblePlatforms] : compatiblePlatforms;
  }, [compatiblePlatforms, isEdit, platform, platformRegistry]);

  useEffect(() => {
    if (
      !isOpen || isEdit || !connectionsLoaded || connectionError ||
      compatiblePlatforms.some(item => item.key === platform)
    ) return;
    setPlatform(compatiblePlatforms[0]?.key || '');
  }, [compatiblePlatforms, connectionError, connectionsLoaded, isEdit, isOpen, platform]);

  useEffect(() => {
    if (!isOpen) return;

    if (post) {
      setPlatform(post.platform || 'instagram');
      setPostType(post.post_type || 'image');
      setTitle(post.title || '');
      setCaption(post.caption || '');
      setHashtags(post.hashtags || '');
      setMediaUrl(post.media_url || '');
      setPostUrl(post.post_url || '');
      setStatus(post.status === 'scheduled' ? 'scheduled' : 'draft');
      setNotes(post.notes || '');
      setScheduledAt(post.scheduled_at ? toLocalDateTime(post.scheduled_at) : '');
    } else {
      setPlatform('instagram');
      setPostType('image');
      setTitle('');
      setCaption('');
      setHashtags('');
      setMediaUrl('');
      setPostUrl('');
      setStatus('draft');
      setNotes('');
      if (date) {
        const selectedDate = new Date(date);
        selectedDate.setHours(10, 0, 0, 0);
        setScheduledAt(toLocalDateTime(selectedDate));
      } else {
        setScheduledAt('');
      }
    }

    setError('');
    setErrors({});
    setSaving(false);
  }, [isOpen, post, date]);

  const charLimit = CHAR_LIMITS[platform] || 2200;
  const hashCount = hashtags.trim().split(/\s+/).filter(token => token.startsWith('#')).length;
  const selectedPlatform = PLATFORMS[platform] || { color: '#64748B', label: platform };

  const clearFieldError = (field) => {
    setErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateForm = (finalStatus) => {
    const nextErrors = {};
    if (!platform) nextErrors.platform = tr('Please select a platform.');
    if (!caption.trim() && !title.trim()) {
      nextErrors.caption = tr('Caption is required. Add a caption or at least an internal title.');
    }
    if (finalStatus === 'scheduled' && !scheduledAt) {
      nextErrors.scheduledAt = tr('Please pick a date and time to schedule this post.');
    }
    if (finalStatus === 'scheduled' && scheduledAt && isBefore(new Date(scheduledAt), new Date())) {
      nextErrors.scheduledAt = tr('The scheduled time must be in the future.');
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  async function handleSave(forcedStatus) {
    setError('');
    const finalStatus = forcedStatus || status;
    if (finalStatus === 'scheduled') setStatus('scheduled');

    if (!validateForm(finalStatus)) {
      const missing = [];
      if (!platform) missing.push(tr('Platform'));
      if (!caption.trim() && !title.trim()) missing.push(tr('Caption'));
      if (finalStatus === 'scheduled' && !scheduledAt) missing.push(tr('Scheduled Date & Time'));
      if (finalStatus === 'scheduled' && scheduledAt && isBefore(new Date(scheduledAt), new Date())) {
        missing.push(tr('Scheduled Date & Time (must be in the future)'));
      }
      setError(missing.length
        ? `${tr('Required fields missing')}: ${missing.join('، ')}.`
        : tr('Please fix the highlighted fields before saving.'));
      return;
    }

    setSaving(true);
    const payload = {
      platform,
      post_type: postType,
      title,
      caption,
      hashtags,
      media_url: mediaUrl,
      post_url: postUrl,
      status: finalStatus,
      notes,
    };
    if (finalStatus === 'scheduled' && scheduledAt) payload.scheduled_at = new Date(scheduledAt).toISOString();
    if (!isEdit && clientId) payload.client = clientId;

    const result = await onSave(payload, post?.id);
    setSaving(false);
    if (result?.success === false) setError(result.error || tr('Save failed.'));
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'var(--overlay-backdrop)', zIndex: 1000,
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 0.25s',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      />

      <div style={{
        position: 'fixed', top: 0, bottom: 0, insetInlineEnd: 0,
        width: 460, maxWidth: '100vw',
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
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          position: 'sticky', top: 0, background: 'var(--surface-card)', zIndex: 1,
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
            {isEdit ? tr('Edit Post') : tr('Schedule Post')}
          </div>
          {date && !isEdit && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {formatDate(date instanceof Date ? date : new Date(date), { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          )}
          <button onClick={onClose} aria-label={tr('Close')} style={closeButtonStyle}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px', flex: 1 }}>
          <Field label={tr('Platform')} required error={errors.platform}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {selectablePlatforms.map(item => {
                const key = item.key;
                const active = platform === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setPlatform(key); clearFieldError('platform'); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '6px 12px', borderRadius: 8,
                      background: active ? item.color : 'var(--surface-sunken)',
                      color: active ? '#fff' : 'var(--text-secondary)',
                      border: errors.platform
                        ? '1px solid #ef4444'
                        : active ? `1px solid ${item.color}` : '1px solid var(--border-default)',
                      cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    }}
                  >
                    <SocialPlatformIcon platform={key} size={14} />
                    {item.labels.short}
                  </button>
                );
              })}
              {selectablePlatforms.length === 0 && (
                <span role="status" style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
                  {connectionError
                    ? tr('Connection status is temporarily unavailable. Your saved selection has not been changed.')
                    : tr('No connected platform supports this post type.')}
                </span>
              )}
            </div>
          </Field>

          <Field label={tr('Post Type')}>
            <select value={postType} onChange={event => setPostType(event.target.value)} style={inputStyle}>
              {POST_TYPES.map(type => <option key={type} value={type}>{tr(type)}</option>)}
            </select>
          </Field>

          <Field label={tr('Internal Title')}>
            <input
              type="text"
              value={title}
              onChange={event => { setTitle(event.target.value); clearFieldError('caption'); }}
              placeholder={tr('Agency reference label')}
              style={inputStyle}
            />
          </Field>

          <Field label={tr('Caption')} required error={errors.caption}>
            <textarea
              value={caption}
              onChange={event => { setCaption(event.target.value); clearFieldError('caption'); }}
              placeholder={`${tr('Write your')} ${selectedPlatform.label} ${tr('caption')}…`}
              rows={5}
              style={{ ...inputStyle, ...(errors.caption ? inputErrorStyle : {}), resize: 'vertical', fontFamily: 'inherit', lineHeight: 'var(--line-height-body)' }}
            />
            <CharCounter text={caption} limit={charLimit} formatNumber={formatNumber} />
          </Field>

          <Field label={tr('Hashtags')} suffix={hashCount > 0 ? `${formatNumber(hashCount)} ${tr(hashCount === 1 ? 'hashtag' : 'hashtags')}` : null}>
            <input
              type="text"
              value={hashtags}
              onChange={event => setHashtags(event.target.value)}
              placeholder="#socialmedia #marketing"
              style={inputStyle}
              data-ltr="true"
            />
          </Field>

          <Field label={tr('Media URL (optional)')}>
            <input type="url" value={mediaUrl} onChange={event => setMediaUrl(event.target.value)} placeholder="https://…" style={inputStyle} data-ltr="true" />
          </Field>

          <Field label={tr('Post URL (optional)')}>
            <input type="url" value={postUrl} onChange={event => setPostUrl(event.target.value)} placeholder="https://…" style={inputStyle} data-ltr="true" />
          </Field>

          <Field label={tr('Status')}>
            <div style={{ display: 'flex', gap: 8 }}>
              {['draft', 'scheduled'].map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStatus(item)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 8,
                    background: status === item ? (item === 'scheduled' ? '#2563EB' : 'var(--surface-sunken)') : 'var(--surface-card)',
                    color: status === item ? (item === 'scheduled' ? '#fff' : 'var(--text-primary)') : 'var(--text-tertiary)',
                    border: status === item ? `1px solid ${item === 'scheduled' ? '#2563EB' : 'var(--border-default)'}` : '1px solid var(--border-default)',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  }}
                >
                  {tr(item)}
                </button>
              ))}
            </div>
          </Field>

          {status === 'scheduled' && (
            <Field label={tr('Scheduled Date & Time')} required error={errors.scheduledAt}>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={event => { setScheduledAt(event.target.value); clearFieldError('scheduledAt'); }}
                min={getMinScheduleValue()}
                style={{ ...inputStyle, ...(errors.scheduledAt ? inputErrorStyle : {}) }}
                data-ltr="true"
              />
              {scheduledAt && (
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 5 }}>
                  {tr('Display date')}: {formatDate(new Date(scheduledAt), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </div>
              )}
              {clientId && <SuggestRow clientId={clientId} platform={platform} />}
            </Field>
          )}

          <Field label={tr('Internal Notes (not shown to user)')}>
            <textarea
              value={notes}
              onChange={event => setNotes(event.target.value)}
              placeholder={tr('e.g. Waiting on final image from designer')}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </Field>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: 8, padding: '12px 14px',
              color: '#B91C1C', fontSize: 13, marginBottom: 12, lineHeight: 'var(--line-height-body)',
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {!readOnly && (
          <div style={{
            padding: '14px 20px', borderTop: '1px solid var(--border-default)',
            display: 'flex', gap: 8,
            position: 'sticky', bottom: 0, background: 'var(--surface-card)', zIndex: 1,
          }}>
            <button onClick={() => handleSave('draft')} disabled={saving} style={{ ...footerButtonStyle, background: 'var(--surface-sunken)', color: 'var(--text-primary)' }}>
              {tr('Save as Draft')}
            </button>
            <button onClick={() => handleSave('scheduled')} disabled={saving} style={{ ...footerButtonStyle, background: '#2563EB', color: '#fff', borderColor: '#2563EB' }}>
              {saving ? tr('Saving…') : tr('Schedule Post')}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function Field({ label, required, suffix, error, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>
        {label} {required && <span style={requiredAsteriskStyle}>*</span>}
        {suffix && <span style={{ marginInlineStart: 8, fontWeight: 400, color: 'var(--text-tertiary)' }}>{suffix}</span>}
      </label>
      {children}
      {error && <div style={fieldErrorStyle}>{error}</div>}
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: 'var(--text-secondary)', marginBottom: 6,
};

const requiredAsteriskStyle = {
  color: '#ef4444', marginInlineStart: 2, fontWeight: 800,
};

const inputStyle = {
  width: '100%', padding: '9px 11px', borderRadius: 8,
  border: '1px solid var(--border-default)', fontSize: 13,
  boxSizing: 'border-box', background: 'var(--surface-card)',
  outline: 'none', color: 'var(--text-primary)', textAlign: 'start',
};

const inputErrorStyle = {
  borderColor: '#ef4444',
  background: '#fef2f2',
};

const fieldErrorStyle = {
  marginTop: 6,
  fontSize: 12,
  color: '#dc2626',
};

const closeButtonStyle = {
  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4,
};

const footerButtonStyle = {
  flex: 1, padding: '10px', borderRadius: 8,
  border: '1px solid var(--border-default)',
  cursor: 'pointer', fontSize: 13, fontWeight: 600,
};
