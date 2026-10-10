import { useLanguage } from '../../i18n';
/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
/**
 * EndUserDashboard — landing page for the B2C end-user under /u.
 *
 * MVP layout for . Stats cards are placeholders (real numbers come
 * once the analytics module is wired into this side in a later stage).
 */
import { useEffect, useState } from 'react';
import { AppLink as Link } from '../../core/navigation';
import {
  Sparkles, Plug, Users2, ArrowRight, BarChart3, MessageSquare, Calendar,
} from 'lucide-react';

import { endUserAPI } from '@/services/domains/identity';
import { useSession as useAuth } from '../../core/session';

export default function EndUserDashboard() {
  const { tr, formatNumber } = useLanguage();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    endUserAPI.me()
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const workspace = data?.workspace;
  const relations = data?.relations || { active: 0, pending: 0 };
  const firstName = (user?.first_name || (user?.email || '').split('@')[0] || '').trim();

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{tr("Hi,")} {firstName} 👋
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
            {workspace ? <>{tr("Here's what's happening with")} <strong style={{ color: 'var(--text-primary)' }}>{workspace.company || workspace.name}</strong>.</> : tr("Welcome to Ravinta.")}
          </p>
        </div>
        {workspace && (
          <span style={{
            padding: '4px 10px',
            background: 'var(--brand-primary-soft)',
            color: 'var(--brand-primary-hover)',
            border: '1px solid var(--brand-primary-glow)',
            borderRadius: 'var(--radius-pill)',
            fontSize: 11, fontWeight: 600,
            letterSpacing: '0.04em', textTransform: 'uppercase',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            <Sparkles size={11} strokeWidth={2.4} />
            {workspace.subscription_plan} {tr("plan")}</span>
        )}
      </header>

      <section style={{ padding: 20, border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)' }}>
        <h2>مجموعه و تیم شما</h2>
        <p>مجموعه بسازید، برندها را اضافه کنید یا دعوت همکاران را بپذیرید.</p>
        <Link to="/u/organizations">مدیریت مجموعه، برندها و اعضا</Link>
      </section>
      <section style={statsGrid}>
        <StatCard icon={BarChart3}     label={tr("Posts published")}   value="—" hint={loading ? tr("Loading…") : tr("No analytics yet")} />
        <StatCard icon={MessageSquare} label={tr("Engagement (7d)")}   value="—" hint={loading ? tr("Loading…") : tr("Connect a platform")} />
        <StatCard icon={Calendar}      label={tr("Scheduled")}         value="—" hint={loading ? tr("Loading…") : tr("Nothing in the queue")} />
        <StatCard icon={Users2}        label={tr("Active agencies")}   value={formatNumber(relations.active)} hint={relations.pending ? `${formatNumber(relations.pending)} ${tr('Pending invitations')}` : tr("Just you")} />
      </section>

      <section style={cardGrid}>
        <ActionCard
          icon={Plug}
          title={tr("Connect your social accounts")}
          body="Connect Facebook, Instagram, YouTube, LinkedIn or Google My Business to start tracking posts and engagement."
          cta="Open connections"
          to="/u/connections"
          tone="primary"
        />
        <ActionCard
          icon={Users2}
          title={relations.active ? tr("Working with an agency") : tr("Need help running socials?")}
          body={
            relations.active
              ? tr("Manage your agency permissions, pause access, or review activity any time.")
              : tr("Browse verified agencies in your industry. They can help — and you stay in control of your data.")
          }
          cta={relations.active ? tr("Manage agency") : tr("Find an agency")}
          to={relations.active ? '/u/agency' : '/u/agency/find'}
          tone="ghost"
          disabled
          disabledHint="Coming in the next release"
        />
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint }) {
  const { tr } = useLanguage();
  return (
    <div style={{
      padding: 16,
      background: 'var(--surface-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
    }}>
      <div style={{
        width: 32, height: 32,
        background: 'var(--brand-primary-glow)',
        color: 'var(--brand-primary-hover)',
        borderRadius: 'var(--radius-sm)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 10,
      }}>
        <Icon size={16} strokeWidth={2.2} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
        {tr(label)}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{hint}</div>
    </div>
  );
}

function ActionCard({ icon: Icon, title, body, cta, to, tone, disabled, disabledHint }) {
  const { tr } = useLanguage();
  const Wrap = disabled ? 'div' : Link;
  const wrapProps = disabled ? {} : { to };
  return (
    <Wrap
      {...wrapProps}
      style={{
        display: 'flex', flexDirection: 'column', gap: 10,
        padding: 18,
        background: tone === 'primary' ? 'var(--brand-primary-soft)' : 'var(--surface-card)',
        border: `1px solid ${tone === 'primary' ? 'var(--brand-primary-glow)' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius-lg)',
        textDecoration: 'none',
        color: 'inherit',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.7 : 1,
        transition: 'transform 120ms var(--ease-out), box-shadow 120ms var(--ease-out)',
      }}
    >
      <span style={{
        width: 36, height: 36,
        background: tone === 'primary' ? 'var(--brand-gradient)' : 'var(--surface-sunken)',
        color: tone === 'primary' ? '#fff' : 'var(--brand-primary-hover)',
        borderRadius: 'var(--radius-sm)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={18} strokeWidth={2.2} />
      </span>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{tr(title)}</div>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 'var(--line-height-body)' }}>{tr(body)}</p>
      <div style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: tone === 'primary' ? 'var(--brand-primary-hover)' : 'var(--text-secondary)' }}>
        {disabled ? (tr(disabledHint || "Coming soon")) : (<>{tr(cta)} <ArrowRight size={13} /></>)}
      </div>
    </Wrap>
  );
}

const statsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: 14,
};

const cardGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: 14,
};
