/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { fmt } from '../../services/platforms';

/** Map old caller-provided hex accents to canonical semantic tokens.
 * Legacy keys are compatibility metadata, never used as rendered literals.
 */
const ICON_ACCENTS = {
  '#6366f1': 'var(--module-ai)',
  '#22c55e': 'var(--success)',
  '#2563eb': 'var(--info)',
  '#ef4444': 'var(--danger)',
  '#f59e0b': 'var(--warning)',
  '#8b5cf6': 'var(--module-ai)',
  '#0891b2': 'var(--module-messaging)',
  '#059669': 'var(--module-analytics)',
  '#00CCF5': 'var(--brand-primary)',
};

export default function StatCard({ label, value, icon: Icon, color = 'var(--brand-primary)', sub, trend }) {
  const accent = ICON_ACCENTS[color] || (Object.values(ICON_ACCENTS).includes(color) ? color : 'var(--brand-primary)');
  const isPositive = trend > 0;
  return (
    <div className="ds-statcard ds-statcard--tokenized">
      <div className="ds-statcard__heading">
        <div className="ds-statcard__icon" style={{ '--stat-accent': accent }}>
          {Icon && <Icon size={15} strokeWidth={2.4} />}
        </div>
        <span className="ds-statcard__label">{label}</span>
      </div>
      <div className="ds-statcard__value">{fmt(value)}</div>
      {(typeof trend === 'number' && trend !== 0) || sub ? (
        <div className="ds-statcard__meta">
          {typeof trend === 'number' && trend !== 0 && (
            <span className="ds-statcard__trend" data-positive={isPositive}>
              {isPositive ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
          {sub && <span className="ds-statcard__sub">{sub}</span>}
        </div>
      ) : null}
    </div>
  );
}
