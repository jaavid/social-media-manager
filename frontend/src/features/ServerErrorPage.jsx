'use client';
/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useEffect, useState } from 'react';
import Link from '../components/marketing/MarketingLink';
import { AlertTriangle, RefreshCw, Activity, MessageCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import Meta from '../components/Meta';

export default function ServerErrorPage() {
  const [reference, setReference] = useState('');
  useEffect(() => setReference(Date.now().toString(36).toUpperCase()), []);
  return (
    <>
      <Meta
        title={"خطای سرور"}
        description={"در پایان ما مشکلی پیش آمد. به ما اطلاع داده شده و در حال بررسی آن هستیم."}
      />
      <section
        style={{
          padding: '160px 32px 120px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          minHeight: 'calc(100vh - 200px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(at center, rgba(239,68,68,0.12), transparent 60%)',
            filter: 'blur(80px)',
          }}
        />

        <div style={{ position: 'relative', maxWidth: 520, margin: '0 auto' }}>
          <div
            aria-hidden
            style={{
              width: 80, height: 80,
              margin: '0 auto 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 'var(--radius-2xl)',
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              border: '1px solid var(--danger)',
            }}
          >
            <AlertTriangle size={36} strokeWidth={1.8} />
          </div>

          <div style={{
            fontSize: 11, fontWeight: 700,
            letterSpacing: '0.10em', textTransform: 'uppercase',
            color: 'var(--danger)',
            marginBottom: 8,
          }}>
            خطای 500
          </div>
          <h1 style={{
            margin: 0,
            fontSize: 'clamp(28px, 3.4vw, 36px)',
            fontWeight: 600,
            letterSpacing: '-0.025em',
            color: 'var(--text-primary)',
          }}>
            در پایان ما مشکلی پیش آمد.
          </h1>
          <p style={{ margin: '12px auto 24px', maxWidth: 440, fontSize: 15, lineHeight: 'var(--line-height-body)', color: 'var(--text-secondary)' }}>
            به ما اطلاع داده شده است و در حال بررسی آن هستیم. در بیشتر موارد، به‌روزرسانی صفحه آن را حل می‌کند. اگر همچنان اتفاق می افتد، صفحه وضعیت ما را بررسی کنید یا با ما تماس بگیرید.
          </p>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button onClick={() => window.location.reload()} size="lg" icon={RefreshCw}>دوباره امتحان کنید</Button>
            <Button as={Link} to="/status"  variant="secondary" size="lg" icon={Activity}>وضعیت را بررسی کنید</Button>
            <Button as={Link} to="/contact" variant="ghost" size="lg" icon={MessageCircle}>آن را گزارش کنید</Button>
          </div>

          <p style={{ marginTop: 28, fontSize: 12, color: 'var(--text-tertiary)' }}>
            شناسه مرجع: <span style={{ fontFamily: 'var(--font-mono)' }}>{reference}</span>
          </p>
        </div>
      </section>
    </>
  );
}
