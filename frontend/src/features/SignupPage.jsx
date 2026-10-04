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
import { persistentStorage } from '../lib/runtime/storage';

/**
 * SignupPage — /signup?invite=TOKEN
 * Email/password signup for clients. Also supports Google/Facebook social signup.
 * After submit → "check your email" success state with resend.
 */
import { useEffect, useState } from 'react';
import { AppLink as Link, useAppNavigate as useNavigate } from '../core/navigation';
import { ArrowRight, AlertCircle, CheckCircle, Mail, RefreshCw, Building2 } from 'lucide-react';

import AuthLayout from '../components/auth/AuthLayout';
import PasswordStrength from '../components/auth/PasswordStrength';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Checkbox from '../components/ui/Checkbox';
import Confetti from '../components/ui/Confetti';
import SocialPlatformIcon from '../components/ui/SocialPlatformIcon';
import { useSession as useAuth } from '../core/session';
import { authAPI, invitationAPI } from '../services/api';

const API_BASE = apiBaseUrl();

export default function SignupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useAppSearchParams();
  const inviteToken = params.get('invite');

  const [inv, setInv] = useState(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [resending, setResending] = useState(false);
  const [resentMsg, setResentMsg] = useState('');

  // Redirect already-logged-in users
  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  // Fetch invitation preview
  useEffect(() => {
    if (!inviteToken) return;
    invitationAPI.getByToken(inviteToken).then((res) => setInv(res.data)).catch(() => {});
    persistentStorage.setItem('pending_invite_token', inviteToken);
  }, [inviteToken]);

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
    if (!fullName.trim()) e.fullName = "نام کامل الزامی است.";
    if (!email.trim()) e.email = "وارد کردن ایمیل الزامی است.";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "یک نشانی ایمیل معتبر وارد کنید.";
    if (!password) e.password = "وارد کردن رمز عبور الزامی است.";
    else if (password.length < 8) e.password = "رمز عبور باید حداقل 8 کاراکتر باشد.";
    if (!confirmPwd) e.confirmPwd = "لطفاً رمز عبور خود را تأیید کنید.";
    else if (password !== confirmPwd) e.confirmPwd = "رمزهای عبور مطابقت ندارند.";
    if (!accepted) e.terms = "شما باید شرایط خدمات را بپذیرید.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setServerError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await authAPI.signup({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        terms_accepted: true,
      });
      setDone(true);
    } catch (err) {
      const data = err?.response?.data;
      if (data?.errors) {
        const m = {};
        if (data.errors.full_name) m.fullName = data.errors.full_name;
        if (data.errors.email) m.email = data.errors.email;
        if (data.errors.password) m.password = data.errors.password;
        setErrors(m);
      } else {
        setServerError(data?.detail || "مشکلی پیش آمد. لطفا دوباره امتحان کنید.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setResentMsg('');
    try {
      await authAPI.resendVerification(email);
      setResentMsg("یک ایمیل تأیید جدید ارسال شده است.");
    } catch {
      setResentMsg("امکان ارسال مجدد وجود ندارد. لطفا دوباره امتحان کنید.");
    } finally {
      setResending(false);
    }
  }

  function handleGoogle() {
    if (inviteToken) persistentStorage.setItem('pending_invite_token', inviteToken);
    window.location.href = `${API_BASE}/auth/social/google/start/`;
  }
  function handleFacebook() {
    if (inviteToken) persistentStorage.setItem('pending_invite_token', inviteToken);
    window.location.href = `${API_BASE}/auth/social/facebook/start/`;
  }

  // ───────────────────────────── Success state ─────────────────────────────
  if (done) {
    return (
      <>
        <Confetti />
        <AuthLayout
          heroTitle={"آخرین مرحله."}
          heroSub={"ما به تازگی یک پیوند تأیید به صندوق ورودی شما ارسال کردیم - آن را برای فعال کردن حساب خود باز کنید."}
        >
        <div
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
            padding: 32,
            boxShadow: 'var(--shadow-md)',
            textAlign: 'center',
          }}
        >
          <div
            aria-hidden
            style={{
              width: 56, height: 56,
              margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--brand-primary-soft)',
              borderRadius: '50%',
              color: 'var(--brand-primary-hover)',
            }}
          >
            <Mail size={26} strokeWidth={1.8} />
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
            صندوق ورودی خود را بررسی کنید
          </h1>
          <p style={{ margin: '8px 0 20px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            ما یک پیوند تأیید را به <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>. روی لینک موجود در ایمیل کلیک کنید تا حساب کاربری خود را فعال کنید.
          </p>

          {resentMsg && (
            <div
              role="status"
              style={{
                padding: '10px 12px',
                marginBottom: 14,
                background: resentMsg.startsWith('A new') ? 'var(--success-bg)' : 'var(--danger-bg)',
                border: `1px solid ${resentMsg.startsWith('A new') ? 'var(--success)' : 'var(--danger)'}`,
                borderRadius: 'var(--radius-md)',
                color: resentMsg.startsWith('A new') ? 'var(--success)' : 'var(--danger)',
                fontSize: 13,
              }}
            >
              {publicMessage(resentMsg, "درخواست شما پردازش شد.")}
            </div>
          )}

          <Button
            variant="secondary"
            size="md"
            icon={RefreshCw}
            fullWidth
            loading={resending}
            onClick={handleResend}
          >
            ایمیل تأیید مجدد را ارسال کنید
          </Button>
          <div style={{ marginTop: 14, fontSize: 13, color: 'var(--text-secondary)' }}>
            قبلاً تأیید شده‌اید؟{' '}
            <Link to="/login" style={{ color: 'var(--text-link)', fontWeight: 600, textDecoration: 'none' }}>
              ورود
            </Link>
          </div>
        </div>
        </AuthLayout>
      </>
    );
  }

  // ───────────────────────────── Form state ──────────────────────────────────
  return (
    <AuthLayout
      footer={
        <>
          آیا از قبل حساب کاربری دارید؟{' '}
          <Link to="/login" style={{ color: 'var(--text-link)', fontWeight: 600, textDecoration: 'none' }}>
            ورود
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
        <header style={{ marginBottom: 22 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            حساب خود را ایجاد کنید
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
            آزمایشی رایگان 14 روزه خود را شروع کنید. بدون نیاز به کارت اعتباری
          </p>
        </header>

        {inv && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '10px 12px',
              marginBottom: 18,
              background: 'var(--brand-primary-soft)',
              border: '1px solid var(--brand-primary-glow)',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              color: 'var(--text-secondary)',
            }}
          >
            <Building2 size={15} style={{ color: 'var(--brand-primary-hover)', flexShrink: 0, marginTop: 1 }} />
            <span>
              شما توسط دعوت شده اید <strong style={{ color: 'var(--text-primary)' }}>{inv.agency_name}</strong>. برای پیوستن به فضای کاری آنها در زیر ثبت نام کنید.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label={"نام کامل"}
            autoComplete="name"
            value={fullName}
            onChange={(e) => { setFullName(e.target.value); clearField('fullName'); }}
            placeholder={"نام کامل شما"}
            error={publicMessage(errors.fullName, "انجام درخواست ممکن نشد. لطفاً اطلاعات واردشده را بررسی کنید.")}
            size="lg"
            autoFocus
          />

          <Input
            label={"ایمیل کاری"}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearField('email'); }}
            placeholder="you@company.com"
            error={publicMessage(errors.email, "انجام درخواست ممکن نشد. لطفاً اطلاعات واردشده را بررسی کنید.")}
            size="lg"
          />

          <div>
            <Input
              label={"گذرواژه"}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearField('password'); }}
              placeholder={"حداقل 8 کاراکتر"}
              error={publicMessage(errors.password, "انجام درخواست ممکن نشد. لطفاً اطلاعات واردشده را بررسی کنید.")}
              size="lg"
            />
            <PasswordStrength password={password} />
          </div>

          <Input
            label={"تکرار گذرواژه"}
            type="password"
            autoComplete="new-password"
            value={confirmPwd}
            onChange={(e) => { setConfirmPwd(e.target.value); clearField('confirmPwd'); }}
            placeholder={"رمز عبور خود را دوباره وارد کنید"}
            error={publicMessage(errors.confirmPwd, "انجام درخواست ممکن نشد. لطفاً اطلاعات واردشده را بررسی کنید.")}
            success={!!confirmPwd && confirmPwd === password && password.length >= 8 && !errors.confirmPwd}
            size="lg"
          />

          <Checkbox
            checked={accepted}
            onChange={(e) => { setAccepted(e.target.checked); if (errors.terms) clearField('terms'); }}
            label={
              <>
                من با{' '}
                <Link to="/terms" style={{ color: 'var(--text-link)', fontWeight: 500 }}>شرایط استفاده</Link>
                {' '}و{' '}
                <Link to="/privacy" style={{ color: 'var(--text-link)', fontWeight: 500 }}>سیاست حریم خصوصی</Link>
              </>
            }
          />
          {errors.terms && (
            <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: -6 }}>{publicMessage(errors.terms, "انجام درخواست ممکن نشد. لطفاً اطلاعات واردشده را بررسی کنید.")}</div>
          )}

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
            ایجاد حساب
          </Button>
        </form>

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
          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            یا ثبت نام کنید
          </span>
          <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Button variant="secondary" size="lg" fullWidth onClick={handleGoogle}>
            <SocialPlatformIcon platform="google" size={16} /> گوگل
          </Button>
          <Button variant="secondary" size="lg" fullWidth onClick={handleFacebook}>
            <SocialPlatformIcon platform="facebook" size={16} /> فیس‌بوک
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
