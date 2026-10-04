import { publicMessage } from '../i18n/public-message';
import { useAppSearchParams } from '../core/navigation';
/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
/**
 * VerifyEmailPage — /verify-email?token=UUID
 * Verifies token → stores JWT → redirects to /pending.
 */
import { useEffect, useState } from 'react';
import { AppLink as Link, useAppNavigate as useNavigate } from '../core/navigation';
import { CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

import AuthLayout from '../components/auth/AuthLayout';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { authAPI } from '../services/api';
import { useSession as useAuth } from '../core/session';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();
  const [params] = useAppSearchParams();
  const token = params.get('token');

  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage("هیچ نشانه تأییدی در URL یافت نشد.");
      return;
    }
    authAPI
      .verifyEmail(token)
      .then(async (res) => {
        const { access, refresh } = res.data;
        await refreshAuth(access, refresh);
        setStatus('success');
        setTimeout(() => navigate('/pending', { replace: true }), 2000);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err?.response?.data?.error || "این پیوند تأیید نامعتبر است یا منقضی شده است.");
      });
  }, []);

  return (
    <AuthLayout
      heroTitle={
        status === 'success' ? "شما تأیید شده اید." :
        status === 'error'   ? "ایمیل شما تأیید نشد." :
                               "فقط یک لحظه…"
      }
      heroSub={
        status === 'success' ? "به راوینتا خوش آمدید. بیایید فضای کاری شما را تنظیم کنیم." :
        status === 'error'   ? "پیوندهای تأیید پس از 24 ساعت منقضی می‌شوند. در صورت نیاز یک مورد جدید را دوباره ارسال کنید." :
                               "ما در حال فعال کردن حساب راوینتا شما هستیم."
      }
    >
      <div style={cardStyle}>
        {status === 'loading' && (
          <>
            <div aria-hidden style={iconBubbleStyle}>
              <Spinner size="md" />
            </div>
            <h1 style={titleStyle}>در حال تأیید ایمیل شما…</h1>
            <p style={subStyle}>این معمولا فقط یک ثانیه طول می کشد.</p>
          </>
        )}

        {status === 'success' && (
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div aria-hidden style={{ ...iconBubbleStyle, background: 'var(--success-bg)', color: 'var(--success)' }}>
              <CheckCircle size={28} strokeWidth={1.8} />
            </div>
            <h1 style={titleStyle}>ایمیل تأیید شد!</h1>
            <p style={subStyle}>حساب شما فعال است. در حال تغییر مسیر به داشبورد شما…</p>
          </motion.div>
        )}

        {status === 'error' && (
          <>
            <div aria-hidden style={{ ...iconBubbleStyle, background: 'var(--danger-bg)', color: 'var(--danger)' }}>
              <XCircle size={28} strokeWidth={1.8} />
            </div>
            <h1 style={titleStyle}>تأیید نشد</h1>
            <p style={subStyle}>{publicMessage(message, "انجام درخواست ممکن نشد. لطفاً اطلاعات واردشده را بررسی کنید.")}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
              <Button as={Link} to="/signup" size="md" fullWidth>
                بازگشت به ثبت نام
              </Button>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                قبلاً تأیید شده‌اید؟{' '}
                <Link to="/login" style={{ color: 'var(--text-link)', fontWeight: 600, textDecoration: 'none' }}>
                  ورود
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}

const cardStyle = {
  background: 'var(--surface-card)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-xl)',
  padding: 32,
  boxShadow: 'var(--shadow-md)',
  textAlign: 'center',
};

const iconBubbleStyle = {
  width: 56, height: 56,
  margin: '0 auto 16px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--brand-primary-soft)',
  borderRadius: '50%',
  color: 'var(--brand-primary-hover)',
};

const titleStyle = {
  margin: 0,
  fontSize: 22, fontWeight: 600,
  letterSpacing: '-0.02em',
  color: 'var(--text-primary)',
};

const subStyle = {
  margin: '8px 0 0',
  fontSize: 14, lineHeight: 1.6,
  color: 'var(--text-secondary)',
};
