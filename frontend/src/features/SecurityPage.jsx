/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import Link from '../components/marketing/MarketingLink';
import { ShieldCheck, Lock, Server, FileCheck, Eye, AlertTriangle, ArrowRight, Award } from 'lucide-react';
import MarketingLayout from '../components/marketing/MarketingLayout';
import Button from '../components/marketing/MarketingButton';
import Badge from '../components/marketing/MarketingBadge';
import Meta from '../components/Meta';

const COMMITMENTS = [
  {
    icon: Lock,
    color: '#3b82f6',
    title: "رمزگذاری در همه جا",
    body:
      "TLS 1.3 در حال حمل و نقل. AES-256-GCM (Fernet) در حالت استراحت برای نشانه‌های OAuth، کلیدهای API و اسرار مشتری. کلیدها هر سه ماه یکبار می چرخند.",
  },
  {
    icon: Server,
    color: '#10b981',
    title: "زیرساخت های سخت شده",
    body:
      "استقرار AWS multi-AZ. جداسازی در هر محیط کاهش WAF + DDoS. وصله خودکار + اسکن آسیب پذیری روزانه.",
  },
  {
    icon: Eye,
    color: '#8b5cf6',
    title: "ورود حسابرسی، همیشه روشن",
    body:
      "هر اقدام - auth، OAuth connect، انتشار، تغییر نقش - با بازیگر، مهر زمانی، IP و نتیجه ثبت می‌شود. قابل جستجو برای 1 سال در رشد، سفارشی در سازمانی.",
  },
  {
    icon: FileCheck,
    color: '#f59e0b',
    title: "آماده رعایت الزامات",
    body:
      "GDPR + هند DPDP مطابق با طراحی. SOC 2 Type II در حال انجام است (هدف Q3 2026). HIPAA، ISO 27001 در مورد قراردادهای سازمانی.",
  },
];

const CERTIFICATIONS = [
  { name: 'GDPR',          status: 'Compliant',    description: "حفاظت از داده‌های اتحادیه اروپا / منطقه اقتصادی اروپا." },
  { name: "هند DPDP",    status: 'Compliant',    description: "قانون حفاظت از داده هند 2023." },
  { name: "SOC 2 نوع II", status: 'In progress', description: "حسابرسی در حال انجام است، انتظار می رود سه ماهه سوم 2026." },
  { name: 'ISO 27001',     status: 'Roadmap',     description: "برای سال 2027 هدف گذاری شده است." },
];

export default function SecurityPage() {
  return (
    <MarketingLayout>
      <Meta
        title={"امنیت"}
        description={"رمزگذاری در حالت استراحت با Fernet، TLS 1.3 در حال انتقال، گزارش حسابرسی در هر اقدام، مطابق با GDPR + DPDP. SOC 2 Type II در حال انجام است."}
      />
      {/* Hero */}
      <section style={{ padding: '128px 32px 56px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0,
            background: 'var(--brand-mesh)',
            opacity: 0.30, filter: 'blur(80px) saturate(140%)',
          }}
        />
        <div style={{ position: 'relative', maxWidth: 760, margin: '0 auto' }}>
          <Badge variant="brand" size="md" icon={ShieldCheck}>امنیت</Badge>
          <h1 style={{
            margin: '20px 0 18px',
            fontSize: 'clamp(40px, 5vw, 56px)',
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            امنیت بر اساس طراحی.
          </h1>
          <p style={{ margin: 0, fontSize: 18, lineHeight: 1.65, color: 'var(--text-secondary)' }}>
            راوینتا بر اساس همان امنیت اولیه ای است که بانک ها و بیمارستان ها به آن تکیه می‌کنند. ما با داده‌های شما - و داده‌های مشتریانتان - طوری رفتار می‌کنیم که مانند داده‌های ما باشد.
          </p>
        </div>
      </section>

      {/* Commitments grid */}
      <section style={{ padding: '32px 32px 96px' }}>
        <div
          style={{
            maxWidth: 'var(--container-xl)',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 20,
          }}
          className="security-grid"
        >
          {COMMITMENTS.map((c) => (
            <article
              key={c.title}
              style={{
                padding: 28,
                background: 'var(--surface-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <span style={{
                display: 'inline-flex',
                width: 40, height: 40,
                borderRadius: 'var(--radius-md)',
                background: c.color, color: '#fff',
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 14,
              }}>
                <c.icon size={18} strokeWidth={2.2} />
              </span>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
                {c.title}
              </h3>
              <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.65, color: 'var(--text-secondary)' }}>
                {c.body}
              </p>
            </article>
          ))}
        </div>
        <style>{`
          @media (max-width: 880px) { .security-grid { grid-template-columns: 1fr !important; } }
        `}</style>
      </section>

      {/* Certifications */}
      <section style={{ padding: '64px 32px', background: 'var(--surface-card)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ maxWidth: 'var(--container-xl)', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2 style={{ margin: 0, fontSize: 'clamp(28px, 3.4vw, 36px)', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              گواهینامه ها و انطباق.
            </h2>
            <p style={{ margin: '12px auto 0', maxWidth: 560, fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              امروز کجا هستیم و به کجا می رویم.
            </p>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 16,
            }}
            className="security-cert-grid"
          >
            {CERTIFICATIONS.map((cert) => (
              <div
                key={cert.name}
                style={{
                  padding: 20,
                  background: 'var(--surface-page)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <span style={{
                  display: 'inline-flex',
                  width: 36, height: 36,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--brand-primary-soft)',
                  color: 'var(--brand-primary-hover)',
                  alignItems: 'center', justifyContent: 'center',
                  marginBottom: 12,
                }}>
                  <Award size={16} strokeWidth={2.2} />
                </span>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {cert.name}
                </div>
                <div style={{ marginTop: 4 }}>
                  <Badge
                    size="sm"
                    variant={cert.status === 'Compliant' ? 'success' : cert.status === 'In progress' ? 'warning' : 'default'}
                  >
                    {({ Compliant: 'مطابق الزامات', 'In progress': 'در حال انجام', Roadmap: 'در برنامه توسعه' })[cert.status] || cert.status}
                  </Badge>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {cert.description}
                </p>
              </div>
            ))}
          </div>
          <style>{`
            @media (max-width: 980px) { .security-cert-grid { grid-template-columns: 1fr 1fr !important; } }
            @media (max-width: 480px) { .security-cert-grid { grid-template-columns: 1fr !important; } }
          `}</style>
        </div>
      </section>

      {/* Bug bounty + reporting */}
      <section style={{ padding: '96px 32px' }}>
        <div
          style={{
            maxWidth: 800, margin: '0 auto',
            padding: 40,
            background: 'var(--surface-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-2xl)',
            boxShadow: 'var(--shadow-md)',
            display: 'flex', gap: 24, alignItems: 'flex-start',
          }}
          className="security-bounty"
        >
          <span
            style={{
              flexShrink: 0,
              width: 56, height: 56,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <AlertTriangle size={26} strokeWidth={1.8} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--text-primary)' }}>
              آسیب پذیری پیدا کردید؟
            </h3>
            <p style={{ margin: '8px 0 16px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              ما یک برنامه پاداش باگ خصوصی را با پرداخت تا سقف اجرا می کنیم <strong>₹1,00,000</strong> برای مسائل بحرانی. گزارش خصوصی از طریق <a href="https://github.com/cbsshekhawat18-lab/social-stats-social-media-manager/security/advisories/new" target="_blank" rel="noreferrer" style={{ color: 'var(--text-link)' }}>توصیه های امنیتی گیت‌هاب</a>{' '}
              با مراحل بازتولید و ارزیابی تاثیر. ما ظرف 24 ساعت تأیید می کنیم و در 72 ساعت تریاژ می کنیم.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button as="a" href="https://github.com/cbsshekhawat18-lab/social-stats-social-media-manager/security/advisories/new" size="md" iconRight={ArrowRight}>
                یک آسیب پذیری را گزارش کنید
              </Button>
              <Button as={Link} to="/status" variant="secondary" size="md">
                وضعیت سامانه
              </Button>
            </div>
          </div>
          <style>{`
            @media (max-width: 640px) { .security-bounty { flex-direction: column !important; } }
          `}</style>
        </div>
      </section>

      {/* Bottom links */}
      <section style={{ padding: '0 32px 120px', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>
          به دنبال ما{' '}
          <Link to="/privacy" style={{ color: 'var(--text-link)', fontWeight: 500 }}>سیاست حفظ حریم خصوصی</Link>,{' '}
          <Link to="/gdpr"    style={{ color: 'var(--text-link)', fontWeight: 500 }}>اطلاعات GDPR</Link>,{' '}
          یا <Link to="/dpdp" style={{ color: 'var(--text-link)', fontWeight: 500 }}>جزئیات DPDP</Link>?
        </p>
      </section>
    </MarketingLayout>
  );
}
