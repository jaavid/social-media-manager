/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
/**
 * SectionHeader — shared responsive heading with logical (RTL-safe) alignment.
 * Keep the optional style prop for unmigrated callers. New callers should use
 * className and design tokens instead of adding more inline styles.
 */
const TITLE_CLASSES = {
  1: 'text-[1.75rem] font-semibold',
  2: 'text-lg font-semibold',
  3: 'text-[0.9375rem] font-semibold',
};
const DESCRIPTION_CLASSES = {
  1: 'mt-1 text-sm',
  2: 'mt-0.5 text-[0.8125rem]',
  3: 'mt-0.5 text-xs',
};

export default function SectionHeader({
  title,
  description,
  actions,
  level = 2,
  eyebrow,
  align = 'left',
  style,
  className = '',
}) {
  const safeLevel = Number.isInteger(level) ? Math.min(Math.max(level, 1), 6) : 2;
  const Tag = `h${safeLevel}`;
  const visualLevel = TITLE_CLASSES[safeLevel] ? safeLevel : 2;
  const centered = align === 'center';

  return (
    <header
      className={`flex min-w-0 flex-wrap items-start gap-4 ${centered ? 'justify-center text-center' : 'justify-between text-start'} ${className}`}
      {...(style ? { style } : {})}
    >
      <div className={`min-w-0 ${centered ? 'flex-none' : 'flex-1'}`}>
        {eyebrow && (
          <div className="mb-1.5 inline-block text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--brand-primary-hover)]">
            {eyebrow}
          </div>
        )}
        {title && (
          <Tag className={`m-0 break-words leading-[var(--line-height-body)] tracking-tight text-[var(--text-primary)] ${TITLE_CLASSES[visualLevel]}`}>
            {title}
          </Tag>
        )}
        {description && (
          <p className={`m-0 break-words leading-[var(--line-height-body)] text-[var(--text-secondary)] ${centered ? 'max-w-[600px]' : ''} ${DESCRIPTION_CLASSES[visualLevel]}`}>
            {description}
          </p>
        )}
      </div>
      {actions && !centered && (
        <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2 max-sm:w-full" data-section-actions>
          {actions}
        </div>
      )}
    </header>
  );
}
