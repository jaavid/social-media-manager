/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import Link from '../components/marketing/MarketingLink';
import { MotionDiv } from '../components/marketing/Motion';
import { ArrowRight, Heart, Compass, Layers, Globe, Linkedin, Twitter } from 'lucide-react';

import MarketingLayout from '../components/marketing/MarketingLayout';
import Button from '../components/marketing/MarketingButton';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import Meta from '../components/Meta';

const VALUES = [
  {
    icon: Compass,
    color: 'var(--module-analytics)',
    title: "به طور پیش فرض صادقانه",
    body:
      "بدون الگوهای تاریک، بدون هزینه های غافلگیرکننده، بدون سوار شدن دستکاری. ما به ترکیبات اعتماد داریم - و همینطور محصولات خوب.",
  },
  {
    icon: Layers,
    color: 'var(--module-ai)',
    title: "کیفیت بیش از دامنه",
    body:
      "هر ویژگی تنها زمانی ارسال می‌شود که در دستان شما آشکار باشد. ما ترجیح می‌دهیم پنج کار را به زیبایی انجام دهیم تا پنجاه کار در نیمه راه.",
  },
  {
    icon: Heart,
    color: '#ef4444',
    title: "مشتریان در مرکز",
    body:
      "ما هر هفته با مشتریان صحبت می کنیم. نقشه راه منعکس کننده آن چیزی است که تیم‌های واقعی به آن نیاز دارند، نه آنچه که عرشه های هیئت مدیره می خواهند.",
  },
  {
    icon: Globe,
    color: '#f59e0b',
    title: "هند اول، آماده جهان",
    body:
      "ساخته شده در هند، برای جهان. صورت‌حساب روپیه، صورت‌حساب GST، انطباق با DPDP - و زیرساخت جهانی.",
  },
];

// Team roles and timeline are intentionally generic until we have real
// founders + milestones to feature publicly. We'd rather show nothing than
// invent it.
const TEAM = [];

const TIMELINE = [
  { date: '2024',  title: "نمونه اولیه",    body: "راوینتا به عنوان یک داشبورد یکپارچه برای تحلیل و آمار در سراسر پلتفرم‌هایی که آژانس‌ها واقعاً از آن استفاده می‌کنند شروع شد." },
  { date: '2025',  title: "ویرایشگر محتوا + صندوق ورودی",   body: "ویرایشگر محتوا محتوا با قالب‌بندی برای هر پلتفرم و صندوق ورودی یکپارچه در میان پیام‌های ارسالی، نظرات و نظرات." },
  { date: '2026',  title: "سیستم عامل بازاریابی (شما اینجا هستید)", body: "مرکز کنترل یکپارچه در تحلیل و آمار، پیام‌رسانی، تبلیغات، هوش مصنوعی و اتوماسیون." },
];

export default function AboutPage() {
  return (
    <MarketingLayout>
      <Meta
        title={"درباره ما"}
        description={"راوینتا سیستم عامل بازاریابی برای تیم‌های مدرن است - تحلیل و آمار، محتوا، پیام‌رسانی و هوش مصنوعی یکپارچه در 5 پلتفرم مهم."}
      />
      {/* Hero */}
      <section style={{ padding: '128px 32px 64px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0,
            background: 'var(--brand-mesh)',
            opacity: 0.30, filter: 'blur(80px) saturate(140%)',
          }}
        />
        <div style={{ position: 'relative', maxWidth: 760, margin: '0 auto' }}>
          <Badge variant="brand" size="md">درباره ما</Badge>
          <h1 style={{
            margin: '20px 0 18px',
            fontSize: 'clamp(40px, 5vw, 56px)',
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            ما در حال ساختن سیستم عامل بازاریابی مورد نظر خود در آخرین شرکت خود هستیم.
          </h1>
          <p style={{ margin: 0, fontSize: 18, lineHeight: 1.65, color: 'var(--text-secondary)' }}>
            راوینتا با یک تیم موسس ناامید و یک لیست طولانی از ابزارهای بازاریابی شکسته شروع شد. ما در حال ساختن محصول یکپارچه ای که می خواستیم در آخرین شرکت خود هستیم.
          </p>
        </div>
      </section>

      {/* Mission band */}
      <section style={{ padding: '64px 32px', background: 'var(--surface-card)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ maxWidth: 920, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            fontSize: 12, fontWeight: 600,
            letterSpacing: '0.10em', textTransform: 'uppercase',
            color: 'var(--brand-primary-hover)',
            marginBottom: 14,
          }}>
            ماموریت ما
          </div>
          <p style={{
            margin: 0,
            fontSize: 'clamp(22px, 3vw, 32px)',
            fontWeight: 500,
            letterSpacing: '-0.015em',
            color: 'var(--text-primary)',
            lineHeight: 1.4,
          }}>
            به هر تیم بازاریابی - از سازندگان انفرادی گرفته تا آژانس‌های جهانی - یک پلتفرم واحد و زیبا بدهید <span style={{ color: 'var(--brand-primary-hover)' }}>درک کنید، ایجاد کنید و رشد کنید</span>.
          </p>
        </div>
      </section>

      {/* Values */}
      <section style={{ padding: '96px 32px' }}>
        <div style={{ maxWidth: 'var(--container-xl)', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ margin: 0, fontSize: 'clamp(28px, 3.4vw, 40px)', fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>
              چگونه کار می کنیم.
            </h2>
            <p style={{ margin: '12px auto 0', maxWidth: 540, fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              چهار ارزشی که در هر تصمیم محصول نشان داده می‌شود.
            </p>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 20,
            }}
            className="about-values-grid"
          >
            {VALUES.map((v, i) => (
              <MotionDiv
                key={v.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                style={{
                  padding: 24,
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-xl)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <span style={{
                  display: 'inline-flex',
                  width: 38, height: 38,
                  borderRadius: 'var(--radius-md)',
                  background: v.color, color: '#fff',
                  alignItems: 'center', justifyContent: 'center',
                  marginBottom: 14,
                }}>
                  <v.icon size={18} strokeWidth={2.2} />
                </span>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {v.title}
                </h3>
                <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                  {v.body}
                </p>
              </MotionDiv>
            ))}
          </div>
          <style>{`
            @media (max-width: 980px) { .about-values-grid { grid-template-columns: 1fr 1fr !important; } }
            @media (max-width: 560px) { .about-values-grid { grid-template-columns: 1fr !important; } }
          `}</style>
        </div>
      </section>

      {/* Team */}
      <section style={{ padding: '96px 32px', background: 'var(--surface-card)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ maxWidth: 'var(--container-xl)', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <Badge variant="brand" size="md">تیم</Badge>
            <h2 style={{ margin: '14px 0 12px', fontSize: 'clamp(28px, 3.4vw, 40px)', fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>
              انسان های پشت راوینتا.
            </h2>
            <p style={{ margin: '0 auto', maxWidth: 540, fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              ما یک تیم کوچک و با تجربه در بنگلور و از راه دور هستیم.
            </p>
          </div>

          {TEAM.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 16,
              }}
              className="about-team-grid"
            >
              {TEAM.map((m, i) => (
                <MotionDiv
                  key={m.name}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  style={{
                    padding: 24,
                    background: 'var(--surface-page)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-xl)',
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}
                >
                  <Avatar name={m.name} size="lg" />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--brand-primary-hover)', fontWeight: 500, marginBottom: 2 }}>{m.role}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{m.bio}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <SocialChip icon={Linkedin} label={`${m.name} در لینکدین`} />
                    <SocialChip icon={Twitter}  label={`${m.name} در توییتر`} />
                  </div>
                </MotionDiv>
              ))}
            </div>
          ) : (
            <div style={{
              padding: '32px 24px',
              background: 'var(--surface-page)',
              border: '1px dashed var(--border-default)',
              borderRadius: 'var(--radius-xl)',
              textAlign: 'center',
              maxWidth: 560, margin: '0 auto',
            }}>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                با عمومی شدن نمایه های تیمی در اینجا ظاهر می‌شود. در این میان، ساده‌ترین راه برای ارتباط با ما از طریق ایمیل است{' '}
                <a href="https://github.com/cbsshekhawat18-lab/social-stats-social-media-manager" target="_blank" rel="noreferrer" style={{ color: 'var(--text-link)', fontWeight: 600 }}>
                  github.com/cbsshekhawat18-lab/social-stats-social-media-manager
                </a>.
              </p>
            </div>
          )}

          <p style={{ marginTop: 32, textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)' }}>
            ما در زمینه مهندسی، طراحی و موفقیت مشتری استخدام می کنیم.{' '}
            <Link to="/contact" style={{ color: 'var(--text-link)', fontWeight: 600, textDecoration: 'none' }}>تماس بگیرید →</Link>
          </p>

          <style>{`
            @media (max-width: 980px) { .about-team-grid { grid-template-columns: 1fr 1fr !important; } }
            @media (max-width: 560px) { .about-team-grid { grid-template-columns: 1fr !important; } }
          `}</style>
        </div>
      </section>

      {/* Timeline */}
      <section style={{ padding: '96px 32px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <Badge variant="brand" size="md">سفر</Badge>
            <h2 style={{ margin: '14px 0 12px', fontSize: 'clamp(28px, 3.4vw, 40px)', fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>
              چگونه به اینجا رسیدیم.
            </h2>
          </div>

          <ol style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            position: 'relative',
          }}>
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: 8, bottom: 8, left: 9,
                width: 2,
                background: 'linear-gradient(180deg, var(--brand-primary), transparent)',
                opacity: 0.4,
              }}
            />
            {TIMELINE.map((t) => (
              <li key={t.date} style={{ position: 'relative', paddingLeft: 36, marginBottom: 32 }}>
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: 0, top: 6,
                    width: 20, height: 20,
                    borderRadius: '50%',
                    background: 'var(--brand-gradient)',
                    boxShadow: '0 0 0 4px var(--brand-primary-glow)',
                  }}
                />
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--brand-primary-hover)' }}>
                  {t.date}
                </div>
                <h3 style={{ margin: '4px 0 6px', fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  {t.title}
                </h3>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                  {t.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '0 32px 120px', textAlign: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 'clamp(28px, 3.4vw, 40px)', fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>
          آیا می خواهید با ما بسازید؟
        </h2>
        <p style={{ margin: '12px auto 28px', maxWidth: 480, fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          ما در سراسر پشته استخدام می کنیم. یا فقط سلام کنید
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button as={Link} to="/contact" size="lg" iconRight={ArrowRight}>سلام کنید</Button>
          <Button as={Link} to="/signup"  variant="secondary" size="lg">راوینتا را رایگان امتحان کنید</Button>
        </div>
      </section>
    </MarketingLayout>
  );
}

function SocialChip({ icon: Icon, label }) {
  return (
    <span
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center',
        width: 22, height: 22,
        borderRadius: 'var(--radius-xs)',
        background: 'var(--surface-sunken)',
        color: 'var(--text-tertiary)',
      }}
    >
      <Icon size={11} strokeWidth={2} />
    </span>
  );
}
