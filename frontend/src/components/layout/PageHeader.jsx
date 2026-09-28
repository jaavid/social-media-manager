/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '../../i18n';

function localized(value, tr) {
  return typeof value === 'string' ? tr(value) : value;
}

export default function PageHeader({ title, subtitle, action, actions, backHref, meta = [], eyebrow = null }) {
  const navigate = useNavigate();
  const { isPersian, tr } = useLanguage();
  const actionContent = action || actions || null;

  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    const onScroll = () => setPinned(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={`page-header-sticky${pinned ? ' is-pinned' : ''}`}
      style={{
        padding: '20px 24px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        background: 'transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
        {backHref && (
          <button
            onClick={() => navigate(backHref)}
            aria-label={tr('Back')}
            style={{
              width: 36, height: 36,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              background: 'var(--surface-card)',
              color: 'var(--text-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
              WebkitTapHighlightColor: 'transparent',
              transition: 'var(--transition-fast)',
            }}
            onMouseEnter={(event) => { event.currentTarget.style.background = 'var(--surface-hover)'; }}
            onMouseLeave={(event) => { event.currentTarget.style.background = 'var(--surface-card)'; }}
          >
            <ChevronLeft size={16} style={isPersian ? { transform: 'rotate(180deg)' } : undefined} />
          </button>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          {eyebrow && (
            <div style={{
              fontSize: 11, fontWeight: 600,
              color: 'var(--brand-primary-hover)',
              textTransform: 'uppercase', letterSpacing: 0.6,
              marginBottom: 6,
            }}>
              {localized(eyebrow, tr)}
            </div>
          )}
          <h1 style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {localized(title, tr)}
          </h1>
          {subtitle && (
            <p style={{
              margin: '4px 0 0',
              fontSize: 14,
              fontWeight: 400,
              color: 'var(--text-secondary)',
              lineHeight: 1.45,
            }}>
              {localized(subtitle, tr)}
            </p>
          )}
          {meta?.length > 0 && (
            <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
              {meta.map((item, index) => (
                <span key={index} style={{
                  fontSize: 12, color: 'var(--text-tertiary)',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                  {localized(item, tr)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      {actionContent && <div style={{ flexShrink: 0, display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actionContent}</div>}
    </div>
  );
}
