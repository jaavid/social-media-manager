import { publicMessage, publicInvitationStatus } from '../i18n/public-message';
/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { persistentStorage } from '../lib/runtime/storage';

/**
 * InvitationPage — /invitation/:token
 * Public-readable invitation. If the user isn't logged in, we stash the token
 * and bounce them to /login (which will return here after auth).
 * If logged in, we show Accept / Reject UI.
 */
import { useEffect, useState } from 'react';
import { AppLink as Link, useAppNavigate as useNavigate, useAppParams as useParams } from '../core/navigation';
import { Building2, CheckCircle, XCircle, Clock } from 'lucide-react';

import AuthLayout from '../components/auth/AuthLayout';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { invitationAPI } from '../services/api';
import { useSession as useAuth } from '../core/session';

export default function InvitationPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, refreshAuth } = useAuth();

  const [inv, setInv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [responding, setResponding] = useState('');
  const [done, setDone] = useState('');

  useEffect(() => {
    invitationAPI.getByToken(token)
      .then((res) => setInv(res.data))
      .catch((e) => setError(e?.response?.data?.error || "دعوتنامه یافت نشد."))
      .finally(() => setLoading(false));
  }, [token]);

  // Stash & redirect to login if not authenticated
  useEffect(() => {
    if (!loading && inv && !user) {
      persistentStorage.setItem('pending_invite_token', token);
      navigate(`/login?next=/invitation/${token}`, { replace: true });
    }
  }, [loading, inv, user, token, navigate]);

  async function handleRespond(action) {
    setResponding(action);
    setError('');
    try {
      const res = await invitationAPI.respond(token, action);
      if (action === 'accept') {
        await refreshAuth(res.data.access, res.data.refresh);
        setDone('accepted');
        setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
      } else {
        setDone('rejected');
      }
    } catch (e) {
      setError(e?.response?.data?.error || "مشکلی پیش آمد.");
    } finally {
      setResponding('');
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  let content;
  if (loading) {
    content = <CenteredState icon={<Spinner size="md" />} title={"در حال بارگیری دعوت…"} />;
  } else if (error && !inv) {
    content = (
      <CenteredState
        icon={<XCircle size={28} strokeWidth={1.8} />}
        iconColor="var(--danger)"
        iconBg="var(--danger-bg)"
        title={"دعوتنامه یافت نشد"}
        description={publicMessage(error, "انجام درخواست ممکن نشد. لطفاً اطلاعات واردشده را بررسی کنید.")}
        action={<Button as={Link} to="/login" variant="secondary" fullWidth>بازگشت به ورود</Button>}
      />
    );
  } else if (done === 'accepted') {
    content = (
      <CenteredState
        icon={<CheckCircle size={28} strokeWidth={1.8} />}
        iconColor="var(--success)"
        iconBg="var(--success-bg)"
        title={"دعوت پذیرفته شد!"}
        description={"هدایت شما به داشبورد شما…"}
      />
    );
  } else if (done === 'rejected') {
    content = (
      <CenteredState
        icon={<XCircle size={28} strokeWidth={1.8} />}
        iconColor="var(--danger)"
        iconBg="var(--danger-bg)"
        title={"دعوت رد شد"}
        description={`شما دعوت نامه را رد کرده اید ${inv?.agency_name}.`}
        action={<Button as={Link} to="/pending" variant="secondary" fullWidth>بازگشت به داشبورد</Button>}
      />
    );
  } else if (inv?.is_expired || inv?.status === 'expired') {
    content = (
      <CenteredState
        icon={<Clock size={28} strokeWidth={1.8} />}
        iconColor="var(--warning)"
        iconBg="var(--warning-bg)"
        title={"دعوتنامه منقضی شده است"}
        description={"این دعوت منقضی شده است. از آژانس بخواهید که یک مورد جدید ارسال کند."}
        action={<Button as={Link} to="/login" variant="secondary" fullWidth>بازگشت به ورود</Button>}
      />
    );
  } else if (inv?.status && inv.status !== 'pending') {
    content = (
      <CenteredState
        icon={<Building2 size={28} strokeWidth={1.8} />}
        title={"قبلاً پاسخ داده شده است"}
        description={`وضعیت این دعوت: ${publicInvitationStatus(inv.status)}.`}
        action={<Button as={Link} to="/dashboard" variant="secondary" fullWidth>به داشبورد بروید</Button>}
      />
    );
  } else if (inv) {
    // Active pending invitation
    content = (
      <div style={cardStyle}>
        <div aria-hidden style={{ ...iconBubbleStyle, background: 'var(--brand-primary-soft)', color: 'var(--brand-primary-hover)' }}>
          <Building2 size={26} strokeWidth={1.8} />
        </div>
        <h1 style={titleStyle}>شما دعوت شده اید</h1>
        <p style={subStyle}>
          <strong style={{ color: 'var(--text-primary)' }}>{inv.agency_name}</strong> می‌خواهد تحلیل و آمار رسانه‌های اجتماعی شما را در راوینتا مدیریت کند.
        </p>

        <div
          style={{
            marginTop: 14,
            padding: '12px 14px',
            background: 'var(--surface-sunken)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'left',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
            آژانس
          </div>
          <div style={{ marginTop: 4, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            {inv.agency_name}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {inv.agency_email}
          </div>

          {inv.message && (
            <div
              style={{
                marginTop: 12,
                padding: '10px 12px',
                background: 'var(--surface-card)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13,
                fontStyle: 'italic',
                color: 'var(--text-secondary)',
                lineHeight: 1.55,
              }}
            >
              "{inv.message}"
            </div>
          )}
        </div>

        {error && (
          <div
            role="alert"
            style={{
              marginTop: 12,
              padding: '10px 12px',
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--danger)',
              fontSize: 13,
              textAlign: 'left',
            }}
          >
            {publicMessage(error, "انجام درخواست ممکن نشد. لطفاً اطلاعات واردشده را بررسی کنید.")}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 18 }}>
          <Button
            variant="secondary"
            size="md"
            icon={XCircle}
            disabled={!!responding}
            loading={responding === 'reject'}
            onClick={() => handleRespond('reject')}
            fullWidth
          >
            رد کردن
          </Button>
          <Button
            size="md"
            icon={CheckCircle}
            disabled={!!responding}
            loading={responding === 'accept'}
            onClick={() => handleRespond('accept')}
            fullWidth
          >
            قبول کنید
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AuthLayout
      heroTitle={"به آژانس خود در راوینتا بپیوندید."}
      heroSub={"دعوت نامه را بپذیرید تا آژانس خود را به تحلیل و آمار شبکه‌های اجتماعی خود دسترسی دهد."}
    >
      {content}
    </AuthLayout>
  );
}

// ── small centered state helper ─────────────────────────────────────────
function CenteredState({ icon, iconColor, iconBg, title, description, action }) {
  return (
    <div style={{ ...cardStyle, textAlign: 'center' }}>
      <div
        aria-hidden
        style={{
          ...iconBubbleStyle,
          background: iconBg || 'var(--brand-primary-soft)',
          color: iconColor || 'var(--brand-primary-hover)',
        }}
      >
        {icon}
      </div>
      {title && <h1 style={titleStyle}>{title}</h1>}
      {description && <p style={{ ...subStyle, margin: '8px 0 0' }}>{description}</p>}
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
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
  borderRadius: '50%',
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
