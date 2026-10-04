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
 * ResetPasswordPage — handles two flows:
 *   /forgot-password           → request reset link (email → success state)
 *   /reset-password?token=UUID → confirm new password
 */
import { useState } from 'react';
import { AppLink as Link, useAppNavigate as useNavigate } from '../core/navigation';
import { ArrowRight, AlertCircle, CheckCircle, Mail } from 'lucide-react';

import AuthLayout from '../components/auth/AuthLayout';
import PasswordStrength from '../components/auth/PasswordStrength';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { authAPI } from '../services/api';

export default function ResetPasswordPage() {
  const [params] = useAppSearchParams();
  const token = params.get('token');
  return token ? <ResetForm token={token} /> : <ForgotForm />;
}

// ─── Forgot password (request reset link) ────────────────────────────────
function ForgotForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) { setError("وارد کردن ایمیل الزامی است."); return; }
    setError('');
    setLoading(true);
    try {
      await authAPI.passwordResetRequest(email.trim().toLowerCase());
      setDone(true);
    } catch {
      setError("مشکلی پیش آمد. لطفا دوباره امتحان کنید.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthLayout
        heroTitle={"کمک در راه است."}
        heroSub={"اگر ایمیل را بشناسیم، در یکی دو دقیقه آینده پیوند بازنشانی دریافت خواهید کرد."}
      >
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div aria-hidden style={iconBubbleStyle}>
            <Mail size={26} strokeWidth={1.8} />
          </div>
          <h1 style={titleStyle}>صندوق ورودی خود را بررسی کنید</h1>
          <p style={{ ...subStyle, margin: '8px 0 20px' }}>
            اگر <strong style={{ color: 'var(--text-primary)' }}>{email}</strong> ثبت شده است، پیوند بازنشانی در راه است.
          </p>
          <Button as={Link} to="/login" variant="secondary" size="md" fullWidth>
            بازگشت به ورود
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      footer={
        <>
          آن را به خاطر دارید؟{' '}
          <Link to="/login" style={{ color: 'var(--text-link)', fontWeight: 600, textDecoration: 'none' }}>
            بازگشت به ورود
          </Link>
        </>
      }
    >
      <div style={cardStyle}>
        <header style={{ marginBottom: 22 }}>
          <h1 style={titleStyle}>رمز عبور خود را بازنشانی کنید</h1>
          <p style={subStyle}>ایمیل خود را وارد کنید — ما یک پیوند امن برای بازنشانی رمز عبور شما ارسال خواهیم کرد.</p>
        </header>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label={"ایمیل"}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            placeholder="you@company.com"
            error={publicMessage(error, "انجام درخواست ممکن نشد. لطفاً اطلاعات واردشده را بررسی کنید.")}
            size="lg"
            autoFocus
          />
          <Button type="submit" size="lg" iconRight={ArrowRight} fullWidth loading={loading}>
            پیوند بازنشانی را ارسال کنید
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}

// ─── Reset password (confirm new password) ───────────────────────────────
function ResetForm({ token }) {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState('');

  function clearField(field) {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function validate() {
    const e = {};
    if (!password) e.password = "وارد کردن رمز عبور الزامی است.";
    else if (password.length < 8) e.password = "رمز عبور باید حداقل 8 کاراکتر باشد.";
    if (!confirm) e.confirm = "لطفاً رمز عبور خود را تأیید کنید.";
    else if (password !== confirm) e.confirm = "رمزهای عبور مطابقت ندارند.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setServerError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await authAPI.passwordResetConfirm(token, password);
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 2200);
    } catch (err) {
      const data = err?.response?.data;
      if (data?.errors?.password) setErrors((p) => ({ ...p, password: data.errors.password }));
      else setServerError(data?.error || "این پیوند بازنشانی نامعتبر است یا منقضی شده است.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthLayout
        heroTitle={"همه چیز آماده است."}
        heroSub={"رمز عبور شما به روز شده است. هدایت شما برای ورود به سیستم…"}
      >
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div aria-hidden style={{ ...iconBubbleStyle, background: 'var(--success-bg)', color: 'var(--success)' }}>
            <CheckCircle size={26} strokeWidth={1.8} />
          </div>
          <h1 style={titleStyle}>رمز عبور به روز شد</h1>
          <p style={subStyle}>رمز عبور شما با موفقیت تغییر کرده است.</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      footer={
        <Link to="/login" style={{ color: 'var(--text-link)', fontWeight: 600, textDecoration: 'none' }}>
          بازگشت به ورود
        </Link>
      }
    >
      <div style={cardStyle}>
        <header style={{ marginBottom: 22 }}>
          <h1 style={titleStyle}>یک رمز عبور جدید تنظیم کنید</h1>
          <p style={subStyle}>رمز عبور قوی ای را انتخاب کنید که قبلاً از آن استفاده نکرده اید.</p>
        </header>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <Input
              label={"گذرواژه جدید"}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearField('password'); }}
              placeholder={"حداقل 8 کاراکتر"}
              error={publicMessage(errors.password, "انجام درخواست ممکن نشد. لطفاً اطلاعات واردشده را بررسی کنید.")}
              size="lg"
              autoFocus
            />
            <PasswordStrength password={password} />
          </div>

          <Input
            label={"تکرار گذرواژه"}
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); clearField('confirm'); }}
            placeholder={"رمز عبور خود را دوباره وارد کنید"}
            error={publicMessage(errors.confirm, "انجام درخواست ممکن نشد. لطفاً اطلاعات واردشده را بررسی کنید.")}
            success={!!confirm && confirm === password && password.length >= 8 && !errors.confirm}
            size="lg"
          />

          {serverError && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '10px 12px',
                background: 'var(--danger-bg)',
                border: '1px solid var(--danger)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--danger)',
                fontSize: 13,
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{publicMessage(serverError, "انجام درخواست ممکن نشد. لطفاً اطلاعات واردشده را بررسی کنید.")}</span>
            </div>
          )}

          <Button type="submit" size="lg" iconRight={ArrowRight} fullWidth loading={loading}>
            رمز عبور را به روز کنید
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}

// ── shared styles ────────────────────────────────────────────────────────
const cardStyle = {
  background: 'var(--surface-card)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-xl)',
  padding: 32,
  boxShadow: 'var(--shadow-md)',
  textAlign: 'left',
};

const iconBubbleStyle = {
  width: 56,
  height: 56,
  margin: '0 auto 16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--brand-primary-soft)',
  borderRadius: '50%',
  color: 'var(--brand-primary-hover)',
};

const titleStyle = {
  margin: 0,
  fontSize: 22,
  fontWeight: 600,
  letterSpacing: '-0.02em',
  color: 'var(--text-primary)',
};

const subStyle = {
  margin: '6px 0 0',
  fontSize: 14,
  color: 'var(--text-secondary)',
  lineHeight: 1.6,
};
