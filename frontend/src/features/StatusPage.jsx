'use client';
/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { apiBaseUrl } from '../lib/runtime/config';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Meta from '../components/Meta';

/**
 * StatusPage — /status
 *
 * Polls /api/health/services/ every 30s for live per-service status.
 * Falls back to a "checking…" state on first load and an "API unreachable"
 * banner if the backend itself is down (we still render the page).
 *
 * History and incidents are displayed only when supplied by monitoring.
 */

const API = apiBaseUrl();
const HEALTH_URL = `${API}/health/services/`;
const POLL_MS = 30_000;

// Map backend status strings → UI status keys.
const TO_UI = {
  operational: 'operational',
  degraded:    'partial',
  outage:      'down',
};

const SEV = {
  operational: { color: 'var(--success)', bg: 'var(--success-bg)', label: "در حال فعالیت",    icon: CheckCircle2 },
  partial:     { color: 'var(--warning)', bg: 'var(--warning-bg)', label: "قطعی جزئی", icon: AlertTriangle },
  down:        { color: 'var(--danger)',  bg: 'var(--danger-bg)',  label: "قطعی عمده",   icon: XCircle },
  unknown:     { color: 'var(--text-tertiary)', bg: 'var(--surface-card-elevated)', label: "در حال بررسی…", icon: RefreshCw },
  minor:       { color: 'var(--warning)', bg: 'var(--warning-bg)', label: "جزئی",          icon: AlertTriangle },
  maintenance: { color: 'var(--info)',    bg: 'var(--info-bg)',    label: "نگهداری سامانه",    icon: AlertTriangle },
};

const FALLBACK_SERVICES = [
  { id: 'web',      name: "برنامه وب" },
  { id: 'api',      name: 'API' },
  { id: 'workers',  name: "پردازش‌های پس‌زمینه" },
  { id: 'realtime', name: "ارتباط بلادرنگ" },
  { id: 'db',       name: "پایگاه داده" },
  { id: 'meta',     name: "ادغام متا (فیس‌بوک + اینستاگرام)" },
  { id: 'google',   name: "اتصال گوگل (یوتیوب و نمایه کسب‌وکار)" },
  { id: 'linkedin', name: "ادغام لینکدین" },
  { id: 'pinbot',   name: 'واتس‌اپ (پین‌بات)' },
  { id: 'ai',       name: "راوینتا" },
];

export default function StatusPage() {
  const [data,  setData]  = useState(null);   // raw response
  const [error, setError] = useState(null);   // 'unreachable' | null
  const [lastChecked, setLastChecked] = useState(null);
  const [refreshing, setRefreshing]   = useState(true);

  const fetchHealth = async () => {
    setRefreshing(true);
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(HEALTH_URL, { signal: ctrl.signal, cache: 'no-store' });
      if (!res.ok) throw new Error(`http ${res.status}`);
      const j = await res.json();
      setData(j);
      setError(null);
      setLastChecked(new Date());
    } catch (e) {
      setError('unreachable');
      setLastChecked(new Date());
    } finally {
      clearTimeout(timeout);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const t = setInterval(fetchHealth, POLL_MS);
    return () => clearInterval(t);
  }, []);

  const services = useMemo(() => {
    if (data?.services?.length) return data.services.map(service => ({
      ...service, name: FALLBACK_SERVICES.find(item => item.id === service.id)?.name || service.name,
    }));
    return FALLBACK_SERVICES.map((s) => ({ ...s, status: 'unknown' }));
  }, [data]);

  const overall = useMemo(() => {
    if (error) return 'unknown';
    if (!data) return 'unknown';
    return TO_UI[data.overall] || 'unknown';
  }, [data, error]);

  const ov = SEV[overall];
  const Icon = ov.icon;

  return (
    <>
      <Meta
        title={"وضعیت سیستم"}
        description={"زمان فعال، تعمیر و نگهداری برنامه‌ریزی شده، و حوادث اخیر برای پلتفرم راوینتا."}
      />

      {/* Hero / overall status */}
      <section style={{ padding: '128px 32px 56px', position: 'relative', overflow: 'hidden' }}>
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0,
            background: overall === 'operational'
              ? 'radial-gradient(at center top, rgba(16,185,129,0.18), transparent 60%)'
              : overall === 'down'
                ? 'radial-gradient(at center top, rgba(239,68,68,0.18), transparent 60%)'
                : 'var(--brand-mesh)',
            opacity: 0.7, filter: 'blur(80px) saturate(140%)',
          }}
        />
        <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <Badge variant="brand" size="md">وضعیت</Badge>

          <div style={{
            marginTop: 24,
            display: 'inline-flex', alignItems: 'center', gap: 12,
            padding: '12px 18px',
            borderRadius: 'var(--radius-pill)',
            background: ov.bg,
            color: ov.color,
            border: `1px solid ${ov.color}`,
            fontSize: 14, fontWeight: 600,
          }}>
            <Icon size={16} className={refreshing ? 'spin' : undefined} />
            {error
              ? "API در دسترس نیست؛ وضعیت فعلی سرویس‌ها نامشخص است"
              : overall === 'operational'
                ? "همه سیستم ها عملیاتی هستند"
                : overall === 'unknown'
                  ? 'در حال بررسی…'
                  : ov.label}
          </div>

          <h1 style={{
            margin: '20px 0 12px',
            fontSize: 'clamp(36px, 4.4vw, 48px)',
            lineHeight: 1.05,
            letterSpacing: '-0.025em',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            وضعیت سیستم راوینتا
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>
            {lastChecked
              ? <>آخرین بررسی {lastChecked.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · هر 30 ثانیه به طور خودکار بازخوانی می‌شود</>
              : 'در حال بررسی…'}
            {data?.region && <> · منطقه <strong style={{ color: 'var(--text-secondary)' }}>{data.region}</strong></>}
            {' · '}
            <button
              type="button"
              onClick={fetchHealth}
              disabled={refreshing}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-link)',
                cursor: refreshing ? 'wait' : 'pointer',
                padding: 0,
                fontSize: 13,
                textDecoration: 'underline',
              }}
            >
              اکنون بازخوانی کنید
            </button>
          </p>
        </div>
      </section>

      {/* Service grid */}
      <section style={{ padding: '32px 32px 64px' }}>
        <div
          style={{
            maxWidth: 'var(--container-xl)',
            margin: '0 auto',
            background: 'var(--surface-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
          }}
        >
          {services.map((svc, i) => {
            const uiStatus = error || svc.status === 'unknown'
              ? 'unknown'
              : (TO_UI[svc.status] || svc.status); // accept both raw + UI keys
            const s = SEV[uiStatus] || SEV.unknown;
            const SvcIcon = s.icon;
            const days = Array.isArray(svc.history) ? svc.history : [];
            const uptime = typeof svc.uptime_percent === 'number' ? svc.uptime_percent : null;

            return (
              <div
                key={svc.id}
                style={{
                  padding: '18px 22px',
                  borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none',
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 2fr) auto',
                  alignItems: 'center',
                  gap: 16,
                }}
                className="status-row"
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {svc.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    {uptime != null && days.length ? `${uptime}٪ دسترس‌پذیری` : 'تاریخچهٔ پایش در دسترس نیست'}
                    {svc.latency_ms != null && uiStatus === 'operational' && (
                      <> · {svc.latency_ms}ms</>
                    )}
                    {svc.workers != null && (
                      <> · {svc.workers} کارگر{svc.workers === 1 ? '' : 's'}</>
                    )}
                  </div>
                </div>

                {/* 90-day uptime bars */}
                <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', minWidth: 0, height: 28 }}>
                  {days.map((d, idx) => {
                    const state = d.status;
                    const c = state === 'up' ? 'var(--success)' : state === 'partial' ? 'var(--warning)' : state === 'down' ? 'var(--danger)' : 'var(--text-tertiary)';
                    const isToday = idx === days.length - 1;
                    return (
                      <span
                        key={idx}
                        title={`${d.date}: ${d.status}`}
                        style={{
                          flex: 1, height: '100%',
                          background: c,
                          opacity: state === 'up' ? 0.85 : 1,
                          borderRadius: 1,
                          outline: isToday ? '1px solid var(--text-secondary)' : 'none',
                          outlineOffset: isToday ? 1 : 0,
                        }}
                      />
                    );
                  })}
                </div>

                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-pill)',
                  background: s.bg,
                  color: s.color,
                  fontSize: 11, fontWeight: 600,
                }}>
                  <SvcIcon size={12} />
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>

        <style>{`
          .spin { animation: status-spin 1s linear infinite; }
          @keyframes status-spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          @media (max-width: 880px) {
            .status-row { grid-template-columns: 1fr !important; }
            .status-row > div:nth-child(2) { display: none !important; }
          }
        `}</style>
      </section>

      {/* Recent incidents */}
      <section style={{ padding: '32px 32px 96px' }}>
        <div style={{ maxWidth: 'var(--container-xl)', margin: '0 auto' }}>
          <h2 style={{ margin: '0 0 18px', fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
            حوادث اخیر
          </h2>

          <div style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
          }}>
            {!data?.incidents?.length ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                تاریخچهٔ حوادث در دسترس نیست.
              </div>
            ) : (
              data.incidents.map((inc, i) => {
                const sev = SEV[inc.severity] || SEV.minor;
                return (
                  <article
                    key={inc.id}
                    style={{
                      padding: '18px 22px',
                      borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {inc.title}
                      </h3>
                      <Badge size="sm" variant={inc.severity === 'maintenance' ? 'info' : 'warning'}>
                        {sev.label}
                      </Badge>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>{inc.date}</div>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 'var(--line-height-body)' }}>
                      {inc.summary}
                    </p>
                  </article>
                );
              })
            )}
          </div>

          <p style={{ marginTop: 16, fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>
            از طریق پیوند موجود در اعلان‌های حادثه مشترک شوید{' '}
            <a href="/dashboard/account-settings" style={{ color: 'var(--text-link)' }}>تنظیمات حساب</a>.
          </p>
        </div>
      </section>
    </>
  );
}
