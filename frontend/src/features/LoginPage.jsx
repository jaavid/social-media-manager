import { publicMessage } from '../i18n/public-message';
/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useAppSearchParams } from '../core/navigation';
import { apiBaseUrl } from '../lib/runtime/config';

import { returnToForUser } from '../lib/auth/contracts';
import { useEffect, useState } from 'react';
import { AppLink as Link, useAppNavigate as useNavigate, useAppLocation as useLocation } from '../core/navigation';
import { ArrowRight, AlertCircle, Shield } from 'lucide-react';

import AuthLayout from '../components/auth/AuthLayout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Checkbox from '../components/ui/Checkbox';
import SocialPlatformIcon from '../components/ui/SocialPlatformIcon';
import { useSession as useAuth } from '../core/session';
import { useLanguage } from '../i18n';

const API_BASE = apiBaseUrl();

export default function LoginPage() {
  const { login, loginMfa } = useAuth();
  const { tr } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ssoConfig, setSsoConfig] = useState(null);
  // MFA second-factor step (set when /auth/login/ returns mfa_required,
  // or handed over by /auth/callback when a social login needs a TOTP code)
  const [mfaToken, setMfaToken] = useState(location.state?.mfaToken || '');
  useEffect(() => {
    if (location.state?.mfaToken) setMfaToken(location.state.mfaToken);
  }, [location.state?.mfaToken]);
  const [mfaCode, setMfaCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}/auth/sso/`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (alive && data?.enabled) setSsoConfig(data);
      })
      .catch(() => {
        // SSO is optional; password/social login must remain usable if the
        // capability probe is unavailable.
      });
    return () => { alive = false; };
  }, []);

  const [params] = useAppSearchParams();
  const urlError = params.get('error');
  const nextPath = params.get('next');

  function validate() {
    const e = {};
    if (!email.trim()) e.email = "وارد کردن ایمیل الزامی است.";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "یک نشانی ایمیل معتبر وارد کنید.";
    if (!password.trim()) e.password = "وارد کردن رمز عبور الزامی است.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function navigateFor(user) {
    if (nextPath) {
      navigate(returnToForUser(nextPath, user, location.hash || window.location.hash), { replace: true });
    } else if (user.role === 'superadmin' || user.role === 'staff') {
      navigate('/admin');
    } else if (user.account_type === 'end_user') {
      navigate(user.workspace_id || user.client_id ? '/u' : '/u/organizations');
    } else if (user.role === 'client' && !user.client_id) {
      navigate('/pending');
    } else if (user.role === 'client' && !user.onboarding_complete) {
      navigate('/dashboard/onboarding');
    } else {
      navigate('/dashboard');
    }
  }

  async function doLogin(emailVal, passwordVal) {
    setLoading(true);
    try {
      const user = await login(emailVal, passwordVal, true);
      if (user?.mfa_required) {
        // Password verified; a TOTP or backup code is still needed.
        setMfaToken(user.mfa_token);
        setMfaCode('');
        return;
      }
      navigateFor(user);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const status = err?.response?.status;
      setServerError(
        detail === 'email_not_verified'
          ? "پیش از ورود، ایمیل خود را تأیید کنید. لینک تأیید را در صندوق ورودی بررسی کنید."
          : status === 401
            ? tr('Incorrect email or password. Try again.')
            : status === 429
              ? tr('Too many attempts. Wait a moment and try again.')
              : status === 400
                ? tr('Check your login details and try again.')
                : tr('The login service is unavailable. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleMfaSubmit(ev) {
    ev.preventDefault();
    setServerError('');
    if (!mfaCode.trim()) return;
    setLoading(true);
    try {
      const user = await loginMfa(
        mfaToken,
        useBackupCode ? { backupCode: mfaCode.trim() } : { code: mfaCode.trim() },
      );
      navigateFor(user);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 && err?.response?.data?.error?.includes('expired')) {
        setMfaToken('');
        setServerError("نشست تأیید شما منقضی شده است. دوباره وارد شوید.");
      } else {
        setServerError(useBackupCode ? "کد پشتیبان نامعتبر است." : "کد تأیید نامعتبر است.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setServerError('');
    if (!validate()) return;
    await doLogin(email, password);
  }

  // ── MFA second-factor step ────────────────────────────────────────────────
  if (mfaToken) {
    return (
      <AuthLayout>
        <div
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
            padding: 32,
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <header style={{ marginBottom: 24 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: 0,
                color: 'var(--text-primary)',
              }}
            >
              {tr("تأیید دومرحله‌ای")}
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
              {tr(useBackupCode
                ? "یکی از کدهای پشتیبان خود را وارد کنید."
                : "کد ۶ رقمی برنامه احراز هویت را وارد کنید.")}
            </p>
          </header>

          <form onSubmit={handleMfaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input
              label={tr(useBackupCode ? "کد پشتیبان" : "کد تأیید")}
              type="text"
              inputMode={useBackupCode ? 'text' : 'numeric'}
              autoComplete="one-time-code"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              placeholder={useBackupCode ? 'xxxx-xxxx' : '123456'}
              size="lg"
              autoFocus
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
                  lineHeight: 'var(--line-height-body)',
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{publicMessage(serverError)}</span>
              </div>
            )}

            <Button type="submit" size="lg" iconRight={ArrowRight} fullWidth loading={loading}>
              {tr('Verify')}
            </Button>
          </form>

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <button
              type="button"
              onClick={() => { setUseBackupCode((v) => !v); setMfaCode(''); setServerError(''); }}
              style={{ background: 'none', border: 0, padding: 0, color: 'var(--text-link)', fontWeight: 500, cursor: 'pointer' }}
            >
              {tr(useBackupCode ? "استفاده از کد احراز هویت" : "استفاده از کد پشتیبان")}
            </button>
            <button
              type="button"
              onClick={() => { setMfaToken(''); setMfaCode(''); setServerError(''); }}
              style={{ background: 'none', border: 0, padding: 0, color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              {tr("بازگشت به ورود")}
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      footer={
        <>
          {tr("تازه به راوینتا آمده‌اید؟")}{' '}
          <Link to="/signup" style={{ color: 'var(--text-link)', fontWeight: 600, textDecoration: 'none' }}>
            {tr("ساخت حساب کاربری")}
          </Link>
        </>
      }
    >
      <div
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: 32,
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <header style={{ marginBottom: 24 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: 0,
              color: 'var(--text-primary)',
            }}
          >
            {tr("خوش آمدید")}
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
            {tr("وارد فضای کاری راوینتا شوید.")}
          </p>
        </header>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label={tr('Email')}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((p) => ({ ...p, email: undefined })); }}
            placeholder="you@company.com"
            error={errors.email ? tr(errors.email) : undefined}
            size="lg"
            autoFocus
          />

          <div>
            <Input
              label={tr('Password')}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((p) => ({ ...p, password: undefined })); }}
              placeholder={tr("رمز عبور خود را وارد کنید")}
              error={errors.password ? tr(errors.password) : undefined}
              size="lg"
            />
            <div style={{ marginTop: 6, textAlign: 'end' }}>
              <Link
                to="/forgot-password"
                style={{ fontSize: 12, color: 'var(--text-link)', fontWeight: 500, textDecoration: 'none' }}
              >
                {tr("رمز عبور را فراموش کرده‌اید؟")}
              </Link>
            </div>
          </div>

          <Checkbox
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            label={
              <>
                {tr("من با")}{' '}
                <Link to="/terms" style={{ color: 'var(--text-link)', fontWeight: 500 }}>{tr("شرایط استفاده از خدمات")}</Link>
                {' '}{tr('and')}{' '}
                <Link to="/privacy" style={{ color: 'var(--text-link)', fontWeight: 500 }}>{tr("سیاست حریم خصوصی")}</Link>
              </>
            }
          />

          {(serverError || urlError) && (
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
                lineHeight: 'var(--line-height-body)',
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{publicMessage(serverError || decodeURIComponent(urlError))}</span>
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            iconRight={ArrowRight}
            fullWidth
            loading={loading}
            disabled={!accepted}
          >
            {tr("ورود")}
          </Button>
        </form>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            margin: '20px 0',
            color: 'var(--text-tertiary)',
          }}
        >
          <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
          <span style={{ fontSize: 11, fontWeight: 600 }}>
            {tr("یا ادامه با")}
          </span>
          <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
        </div>

        {/* Social login row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => { window.location.href = `${API_BASE}/auth/social/google/start/`; }}
          >
            <SocialPlatformIcon platform="google" size={16} /> گوگل
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => { window.location.href = `${API_BASE}/auth/social/facebook/start/`; }}
          >
            <SocialPlatformIcon platform="facebook" size={16} /> فیس‌بوک
          </Button>
        </div>

        {ssoConfig && (
          <div style={{ marginTop: 8 }}>
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => { window.location.href = `${API_BASE}/auth/sso/start/`; }}
            >
              <Shield size={16} /> {tr(ssoConfig.label || "سازمان SSO")}
            </Button>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
