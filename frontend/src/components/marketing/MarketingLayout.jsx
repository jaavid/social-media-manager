/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import MarketingNav from './MarketingNav';
import MarketingFooter from './MarketingFooter';
import SkipLink from '../ui/SkipLink';
export default function MarketingLayout({ children }) {
  return (
    <div style={{ background: 'var(--surface-page)', color: 'var(--text-primary)' }}>
      <SkipLink targetId="marketing-main" />
      <MarketingNav />
      <main id="marketing-main" tabIndex={-1} style={{ outline: 'none' }}>
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
