import { publicMessage } from '../../i18n/public-message';
/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useAuth } from '../../hooks/useAuth';
import { persistentStorage } from '../../lib/runtime/storage';

/**
 * End-user (B2C) self-signup. Multi-step wizard:
 *   1. Account — full name + email + password
 *   2. About   — industry + company name + phone (skippable except industry)
 *   3. Confirm — terms + go
 *
 * After signup Django establishes the browser session; we resolve /me and route to /u.
 */
import { useState } from 'react';
import { AppLink as Link, useAppNavigate as useNavigate } from '../../core/navigation';
import { ArrowRight, ArrowLeft, Check, Sparkles } from 'lucide-react';

import { endUserAPI } from '../../services/api';
import toast from '../../components/ui/toast';

const INDUSTRY_OPTIONS = [
  { value: 'real_estate',  label: "املاک و مستغلات" },
  { value: 'clinic',       label: "درمانگاه / بیمارستان" },
  { value: 'restaurant',   label: "رستوران / کافه" },
  { value: 'retail',       label: "خرده فروشی / تجارت الکترونیک" },
  { value: 'creator',      label: "خالق / تأثیرگذار" },
  { value: 'professional', label: "خدمات حرفه ای" },
  { value: 'other',        label: "دیگر" },
];

export default function EndUserSignupPage() {
  const { refreshAuth } = useAuth();
  const navigate = useNavigate();
  const [step,    setStep]    = useState(1);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    email:     '',
    password:  '',
    industry:  '',
    company_name: '',
    phone:     '',
    terms:     false,
  });

  const set = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  function next() {
    if (step === 1) {
      if (!form.full_name.trim()) return toast.error("نام خود را به ما بگویید");
      if (!form.email.trim())     return toast.error("ایمیل مورد نیاز است");
      if (form.password.length < 8) return toast.error("رمز عبور باید حداقل 8 کاراکتر باشد");
    }
    if (step === 2 && !form.industry) return toast.error("صنعتی را انتخاب کنید تا بتوانیم راوینتا را برای شما تنظیم کنیم");
    setStep((s) => Math.min(3, s + 1));
  }

  async function submit() {
    if (!form.terms) return toast.error("لطفاً شرایط خدمات را بپذیرید");
    setLoading(true);
    try {
      const res = await endUserAPI.signup({
        email:        form.email.trim().toLowerCase(),
        password:     form.password,
        full_name:    form.full_name.trim(),
        industry:     form.industry,
        company_name: form.company_name.trim() || form.full_name.trim(),
        phone:        form.phone.trim(),
        terms_accepted: true,
      });
      const { user, workspace } = res.data;
      await refreshAuth();
      persistentStorage.setItem('end_user_signup_workspace', JSON.stringify(workspace || {}));
      toast.success(`به راوینتا خوش آمدید، ${user?.first_name || ''}!`);
      // Trigger a fresh /me bootstrap by routing through /auth-callback so the
      // existing useAuth hook picks up the new session.
      navigate('/u');
    } catch (e) {
      const data = e?.response?.data || {};
      const errs = data.errors || {};
      const first = Object.values(errs)[0] || data.detail || "ثبت نام انجام نشد";
      toast.error(publicMessage(String(first)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{
        width: '100%', maxWidth: 460,
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        padding: 28,
      }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{
            width: 32, height: 32,
            background: 'var(--brand-gradient)',
            borderRadius: 'var(--radius-sm)',
            color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={16} strokeWidth={2.4} />
          </span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              با راوینتا شروع کنید
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              رایگان برای همیشه · بدون آژانس مورد نیاز است
            </div>
          </div>
        </header>

        <Stepper current={step} />

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label={"نام کامل شما"} value={form.full_name} onChange={set('full_name')} placeholder={"پریا سینگ"} autoFocus />
            <Field label={"ایمیل"} type="email" value={form.email} onChange={set('email')} placeholder="you@yourbiz.com" />
            <Field label={"گذرواژه"} type="password" value={form.password} onChange={set('password')} placeholder={"حداقل 8 کاراکتر"} />
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <Label>چه کار می‌کنید؟</Label>
              <select value={form.industry} onChange={set('industry')} style={selectStyle}>
                <option value="">یکی را انتخاب کنید…</option>
                {INDUSTRY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <Field label={"نام تجاری (اختیاری)"} value={form.company_name} onChange={set('company_name')} placeholder={"پیش‌فرض نام شما"} />
            <Field label={"تلفن (اختیاری)"} value={form.phone} onChange={set('phone')} placeholder="+91 …" />
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Summary form={form} />
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 'var(--line-height-body)' }}>
              <input
                type="checkbox"
                checked={form.terms}
                onChange={(e) => setForm((s) => ({ ...s, terms: e.target.checked }))}
                style={{ marginTop: 3 }}
              />
              <span>
                من قبول دارم <Link to="/terms" style={{ color: 'var(--brand-primary-hover)' }}>شرایط استفاده از خدمات</Link>{' '}
                و <Link to="/privacy" style={{ color: 'var(--brand-primary-hover)' }}>سیاست حریم خصوصی</Link>.
              </span>
            </label>
          </div>
        )}

        <footer style={{ display: 'flex', gap: 8, marginTop: 22 }}>
          {step > 1 && (
            <button type="button" onClick={() => setStep(step - 1)} style={btnGhost}>
              <ArrowLeft size={14} /> بازگشت
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < 3 && (
            <button type="button" onClick={next} style={btnPrimary}>
              ادامه <ArrowRight size={14} />
            </button>
          )}
          {step === 3 && (
            <button type="button" onClick={submit} disabled={loading || !form.terms} style={btnPrimary}>
              {loading ? 'در حال ساخت…' : "ایجاد حساب"} <Check size={14} />
            </button>
          )}
        </footer>

        <p style={{ marginTop: 16, fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>
          آیا از قبل حساب کاربری دارید؟ <Link to="/login" style={{ color: 'var(--brand-primary-hover)', fontWeight: 600 }}>ورود</Link>
        </p>
      </div>
    </div>
  );
}

function Stepper({ current }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          style={{
            flex: 1, height: 4, borderRadius: 4,
            background: n <= current ? 'var(--brand-primary)' : 'var(--border-subtle)',
            transition: 'background 0.2s',
          }}
        />
      ))}
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div>
      <Label>{label}</Label>
      <input {...props} style={inputStyle} />
    </div>
  );
}

function Label({ children }) {
  return (
    <label style={{
      display: 'block',
      fontSize: 11, fontWeight: 600,
      letterSpacing: '0.04em', textTransform: 'uppercase',
      color: 'var(--text-tertiary)',
      marginBottom: 4,
    }}>
      {children}
    </label>
  );
}

function Summary({ form }) {
  const rows = [
    ["نام",     form.full_name],
    ["ایمیل",    form.email],
    ["صنعت", INDUSTRY_OPTIONS.find((i) => i.value === form.industry)?.label || form.industry],
    ["تجارت", form.company_name || form.full_name],
    ["تلفن",    form.phone || '—'],
  ];
  return (
    <div style={{
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      padding: 14,
      background: 'var(--surface-sunken)',
    }}>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: 'flex', gap: 12, fontSize: 13, padding: '4px 0' }}>
          <span style={{ width: 80, color: 'var(--text-tertiary)' }}>{k}</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  background: 'var(--surface-sunken)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-sm)',
  fontSize: 14, color: 'var(--text-primary)',
  outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const selectStyle = { ...inputStyle };

const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '10px 16px',
  background: 'var(--brand-primary)',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  fontSize: 13, fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
};

const btnGhost = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '10px 14px',
  background: 'transparent',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  fontSize: 13, fontWeight: 500,
  fontFamily: 'inherit',
  cursor: 'pointer',
};
