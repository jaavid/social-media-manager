import GDPRRequestForm from './GDPRRequestForm';
/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import LegalPageLayout from '../components/marketing/LegalPageLayout';



export default function GDPRPage() {
  return (
    <LegalPageLayout
      eyebrow="GDPR"
      title="GDPR Compliance"
      effectiveDate="2026-01-01"
      lastUpdated="2026-04-15"
      intro="If you're an EU/EEA resident or a customer with EU/EEA users, this page explains how Social Stats honours the General Data Protection Regulation (GDPR)."
      sections={[
        {
          id: 'role',
          title: '1. Our role',
          body: (
            <>
              <p>Under GDPR, Social Stats acts as:</p>
              <ul>
                <li><strong>Data controller</strong> for your account data (your email, billing info, settings).</li>
                <li><strong>Data processor</strong> for content you upload or sync (e.g., social-media posts and metrics).</li>
              </ul>
            </>
          ),
        },
        {
          id: 'rights',
          title: '2. Your rights under GDPR',
          body: (
            <>
              <p>You have the right to:</p>
              <ul>
                <li><strong>Access</strong> — request a copy of all data we hold about you.</li>
                <li><strong>Rectify</strong> — correct inaccurate data.</li>
                <li><strong>Erase</strong> — request deletion ("right to be forgotten").</li>
                <li><strong>Restrict</strong> — limit how we process your data.</li>
                <li><strong>Object</strong> — opt out of specific processing activities.</li>
                <li><strong>Port</strong> — receive your data in a machine-readable format.</li>
              </ul>
              <p>
                We respond to verified requests within <strong>30 days</strong> at no cost. If your request is
                particularly complex, we may extend this by 60 days and notify you in writing.
              </p>
            </>
          ),
        },
        {
          id: 'dpa',
          title: '3. Data Processing Agreement (DPA)',
          body: (
            <p>
              Customers who process EU personal data via SocialStats can sign our standard{' '}
              <a href="https://github.com/cbsshekhawat18-lab/social-stats-social-media-manager/issues" target="_blank" rel="noreferrer">DPA</a> at no cost. Our DPA includes EU Standard Contractual Clauses
              (SCCs) for cross-border transfers and is updated annually.
            </p>
          ),
        },
        {
          id: 'subprocessors',
          title: '4. Sub-processors',
          body: (
            <>
              <p>We use the following sub-processors to provide Social Stats:</p>
              <ul>
                <li><strong>AWS (Frankfurt)</strong> — primary infrastructure, EU-region storage.</li>
                <li><strong>Anthropic</strong> — AI features (zero data retention contractually).</li>
                <li><strong>Sentry</strong> — error monitoring.</li>
                <li><strong>Postmark</strong> — transactional email.</li>
              </ul>
              <p>
                We notify customers 30 days before adding new sub-processors. The current list is always available at{' '}
                the administrator of this Social Stats instance.
              </p>
            </>
          ),
        },
        {
          id: 'transfers',
          title: '5. International data transfers',
          body: (
            <p>
              By default, EU customer data is stored in our Frankfurt region. Cross-border transfers (e.g., to AI
              providers) are governed by Standard Contractual Clauses and only happen when strictly necessary to
              deliver the requested feature.
            </p>
          ),
        },
        {
          id: 'request',
          title: '6. Submit a GDPR request',
          body: (
            <>
              <p>
                Use the form below to submit a verified data request. We'll confirm receipt within 48 hours and
                respond fully within 30 days.
              </p>
              <GDPRRequestForm />
            </>
          ),
        },
        {
          id: 'contact',
          title: '7. Contact our DPO',
          body: (
            <p>
              For data-protection questions, contact the administrator of this Social Stats instance. EU
              residents may also lodge a complaint with their local supervisory authority.
            </p>
          ),
        },
      ]}
    />
  );
}
