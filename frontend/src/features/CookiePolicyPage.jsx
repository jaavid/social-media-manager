import CookiePreferences from './CookiePreferences';
/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */

import LegalPageLayout from '../components/marketing/LegalPageLayout';



export default function CookiePolicyPage() {return (
    <LegalPageLayout
      eyebrow="Cookies"
      title="Cookie Policy"
      effectiveDate="2026-01-01"
      lastUpdated="2026-04-15"
      intro="We use cookies (and similar technologies) to keep you signed in, remember your preferences, and learn what's working. This page explains exactly what we use and lets you choose."
      sections={[
        {
          id: 'what-are-cookies',
          title: '1. What are cookies?',
          body: (
            <p>
              Cookies are small files that websites store on your device. They let us remember things across page
              loads — like your sign-in state — and they give us aggregate signal about which features get used.
            </p>
          ),
        },
        {
          id: 'categories',
          title: '2. Categories we use',
          body: (
            <>
              <p>We group cookies into four categories. Toggle the optional ones below.</p>
              <CookiePreferences />
            </>
          ),
        },
        {
          id: 'third-party',
          title: '3. Third-party cookies',
          body: (
            <>
              <p>
                We deliberately keep third-party cookies to a minimum. The ones we do use:
              </p>
              <ul>
                <li><strong>Plausible Analytics</strong> — privacy-friendly aggregate analytics (no personal data, no cross-site tracking).</li>
                <li><strong>Sentry</strong> — error reporting (essential, no personal content).</li>
              </ul>
            </>
          ),
        },
        {
          id: 'opt-out',
          title: '4. How to opt out',
          body: (
            <p>
              Toggle categories above and click <strong>Save preferences</strong>. Your choices are stored locally
              and respected on every visit. You can also block cookies entirely via your browser settings — note
              that doing so will prevent you from signing in.
            </p>
          ),
        },
        {
          id: 'changes',
          title: '5. Changes to this policy',
          body: (
            <p>
              We'll update this page if our cookie usage changes, and we'll alert returning users with a banner.
              Material changes are emailed to account owners 30 days in advance.
            </p>
          ),
        },
        {
          id: 'contact',
          title: '6. Contact',
          body: (
            <p>
              Questions? Contact the administrator of this Social Stats instance, or visit our{' '}
              <a href="/privacy">privacy policy</a>.
            </p>
          ),
        },
      ]}
    />
  );
}
