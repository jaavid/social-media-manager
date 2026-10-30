/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useEffect, useState } from 'react';

const STAGES = [
  { key: 'clicks', label: 'Total Clicks', color: 'var(--module-messaging)' },
  { key: 'website_clicks', label: 'Website Visits', color: 'var(--module-ai)' },
  { key: 'leads', label: 'Leads', color: 'var(--module-analytics)' },
  { key: 'sales', label: 'Conversions', color: 'var(--module-ads)' },
];
function fmt(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(Math.round(n));
}
export default function ROIFunnel({ clicks = 0, website_clicks = 0, leads = 0, sales = 0 }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setVisible(true), 50); return () => clearTimeout(timer); }, [clicks, website_clicks, leads, sales]);
  const values = { clicks, website_clicks, leads, sales };
  return (
    <div className="roi-funnel">
      {STAGES.map((stage, index) => {
        const val = values[stage.key] || 0;
        const prev = index === 0 ? val : (values[STAGES[index - 1].key] || 1);
        const percent = index === 0 ? 100 : (prev > 0 ? Math.round(val / prev * 100) : 0);
        return (
          <div key={stage.key} className="roi-funnel__stage" style={{ '--roi-stage-color': stage.color }}>
            <div className="roi-funnel__block" data-visible={visible}
              data-position={index === 0 ? 'first' : index === STAGES.length - 1 ? 'last' : 'middle'}
              style={{ '--roi-stage-width': `${100 - index * 14}%`, '--roi-stage-delay': `${index * 100}ms` }}>
              <div>
                <div className="roi-funnel__caption">{stage.label}</div>
                <div className="roi-funnel__value">{fmt(val)}</div>
              </div>
              {index > 0 && <div className="roi-funnel__conversion">
                <div className="roi-funnel__hint">conversion</div>
                <div className="roi-funnel__percent" data-signal={percent >= 20 ? 'success' : percent >= 5 ? 'warning' : 'danger'}>{percent}%</div>
              </div>}
            </div>
            {index < STAGES.length - 1 && <div className="roi-funnel__connector" aria-hidden="true">
              <div className="roi-funnel__connector-line" /><div className="roi-funnel__connector-arrow" />
            </div>}
          </div>
        );
      })}
    </div>
  );
}
