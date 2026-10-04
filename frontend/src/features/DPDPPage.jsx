import DPDPRequestForm from './DPDPRequestForm';
/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import LegalPageLayout from '../components/marketing/LegalPageLayout';



export default function DPDPPage() {
  return (
    <LegalPageLayout
      eyebrow="DPDP"
      title="DPDP Compliance (India)"
      effectiveDate="2026-01-01"
      lastUpdated="2026-04-15"
      intro="Social Stats is an India-headquartered company. This page explains how we comply with the Digital Personal Data Protection Act, 2023 (DPDP) for our Indian customers and users."
      sections={[
        {
          id: 'role',
          title: '1. Our role under DPDP',
          body: (
            <>
              <p>Under the DPDP Act 2023, Social Stats acts as:</p>
              <ul>
                <li><strong>Data Fiduciary</strong> for your account data — we determine the purpose and means of processing.</li>
                <li><strong>Data Processor</strong> for content you upload via Social Stats (we process on your behalf as a Data Fiduciary).</li>
              </ul>
            </>
          ),
        },
        {
          id: 'principles',
          title: '2. Principles we follow',
          body: (
            <ul>
              <li><strong>Lawful, fair, transparent</strong> — clear notice before any data is collected.</li>
              <li><strong>Purpose limitation</strong> — data is only used for the purposes you consented to.</li>
              <li><strong>Data minimisation</strong> — we collect only what's needed.</li>
              <li><strong>Accuracy</strong> — you can correct your data at any time.</li>
              <li><strong>Storage limitation</strong> — data is deleted when no longer needed.</li>
              <li><strong>Security</strong> — encryption at rest + in transit.</li>
            </ul>
          ),
        },
        {
          id: 'rights',
          title: '3. Your rights as a Data Principal',
          body: (
            <>
              <p>The DPDP Act gives you, as a Data Principal, the right to:</p>
              <ul>
                <li><strong>Access</strong> — request a summary of personal data we process about you.</li>
                <li><strong>Correct or erase</strong> — request correction or deletion of inaccurate data.</li>
                <li><strong>Withdraw consent</strong> — for any processing that depends on consent.</li>
                <li><strong>Nominate</strong> — designate another individual to exercise your rights in the event of incapacity.</li>
                <li><strong>Grievance redressal</strong> — escalate concerns to our Grievance Officer (below).</li>
              </ul>
            </>
          ),
        },
        {
          id: 'consent',
          title: '4. Consent & notice',
          body: (
            <p>
              Before processing any personal data, we provide a clear, plain-language notice describing what data
              we collect, why, and how to withdraw consent. Notices are available in English, Hindi, and 8 other
              Indian languages.
            </p>
          ),
        },
        {
          id: 'localization',
          title: '5. Data localisation',
          body: (
            <p>
              Personal data of Indian Data Principals is stored in our Mumbai region (AWS ap-south-1) by default.
              Cross-border transfers, where necessary (e.g., for AI features), happen only after an MeitY whitelist
              check and with appropriate contractual safeguards.
            </p>
          ),
        },
        {
          id: 'breach',
          title: '6. Personal data breach',
          body: (
            <p>
              In the unlikely event of a personal data breach, we'll notify the Data Protection Board of India and
              all affected Data Principals within <strong>72 hours</strong> of becoming aware of the breach,
              including its nature, scope, and remediation steps.
            </p>
          ),
        },
        {
          id: 'request',
          title: '7. Submit a DPDP request',
          body: (
            <>
              <p>
                Use the form below to submit a request. Our Grievance Officer will confirm receipt within 48 hours
                and respond fully within 30 days.
              </p>
              <DPDPRequestForm />
            </>
          ),
        },
        {
          id: 'grievance',
          title: '8. Grievance Officer',
          body: (
            <>
              <p>
                Our Grievance Officer can be reached at:
              </p>
              <p style={{ background: 'var(--surface-sunken)', padding: 16, borderRadius: 'var(--radius-md)', fontSize: 14 }}>
                <strong>Grievance Officer, Social Stats</strong><br />
                the administrator of this Social Stats instance<br />
                For postal correspondence, write to the Grievance Officer at the
                address shared in our reply to your email.
              </p>
              <p>
                You may also lodge a complaint with the Data Protection Board of India.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
