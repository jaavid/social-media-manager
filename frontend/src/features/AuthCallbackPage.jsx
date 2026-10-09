import { publicMessage } from '../i18n/public-message';
/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */

/**
 * AuthCallbackPage — handles the redirect from social login (Google / Microsoft).
 * The backend establishes an HttpOnly session and redirects with a non-sensitive flow marker.
 * We fetch /me, then send the user to the appropriate account route.
 */
import { useEffect, useState } from 'react';
import { useAppNavigate as useNavigate } from '../core/navigation';
import { authAPI } from '@/services/domains/identity';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const params   = new URLSearchParams(window.location.search);
    const errorMsg = params.get('error');

    if (errorMsg) {
      setError(decodeURIComponent(errorMsg));
      setTimeout(() => navigate('/login'), 3500);
      return;
    }

    // Social login for an MFA-enabled account: the backend withholds JWTs
    // and sends a short-lived handshake token — finish on the login page's
    // second-factor step.
    const mfaToken = 'session';
    if (params.get('mfa_required') && mfaToken) {
      navigate('/login', { state: { mfaToken } });
      return;
    }

    const state = params.get('state');

    authAPI.me()
      .then(res => {
        const role = res.data.role;
        const onboardingComplete = res.data.onboarding_complete;
        const clientId = res.data.client_id;
        if (role === 'superadmin' || role === 'staff') {
          navigate('/admin');
        } else if (state === 'self' || (role === 'client' && !clientId)) {
          navigate('/pending');
        } else if (!onboardingComplete) {
          navigate('/dashboard/onboarding');
        } else {
          navigate('/dashboard');
        }
      })
      .catch(() => {
        setError("احراز هویت ناموفق بود. در حال تغییر مسیر به ورود…");
        setTimeout(() => navigate('/login'), 2000);
      });
  }, [navigate]);


  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {error ? (
          <>
            <div style={styles.errorIcon}>✕</div>
            <p style={styles.errorText}>{publicMessage(error, "انجام درخواست ممکن نشد. لطفاً اطلاعات واردشده را بررسی کنید.")}</p>
          </>
        ) : (
          <>
            <div style={styles.spinner} />
            <p style={styles.msg}>ورود به سیستم…</p>
          </>
        )}
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--surface-page)',
  },
  card: {
    background: 'var(--surface-card)',
    borderRadius: 20,
    padding: '48px 56px',
    textAlign: 'center',
    boxShadow: '0 25px 60px rgba(0,0,0,.4)',
    minWidth: 280,
  },
  spinner: {
    width: 44,
    height: 44,
    border: '4px solid var(--border-default)',
    borderTopColor: '#00d7ff',
    borderRadius: '50%',
    margin: '0 auto 20px',
    animation: 'spin 0.8s linear infinite',
  },
  msg: { fontSize: 15, color: 'var(--text-secondary)', margin: 0 },
  errorIcon: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: '#fef2f2',
    color: '#dc2626',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    fontWeight: 800,
    margin: '0 auto 16px',
  },
  errorText: { fontSize: 14, color: '#dc2626', margin: 0 },
};
