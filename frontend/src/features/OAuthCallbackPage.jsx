/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
/**
 * OAuthCallbackPage
 * All OAuth platform connections (Facebook, Google, LinkedIn) land here.
 * URL: /oauth/callback?connected=facebook&client_id=3
 *      /oauth/callback?error=facebook_consumer_token&client_id=3
 *
 * Waits for auth to finish loading, then navigates to the correct settings
 * page passing the result via React Router state so SettingsPage shows a banner.
 */
import { useEffect } from 'react';
import { useAppNavigate as useNavigate } from '../core/navigation';
import { useSession as useAuth } from '../core/session';

export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return; // wait for JWT to be verified

    const params    = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const error     = params.get('error');
    const clientId  = params.get('client_id');

    const routerState = { oauthConnected: connected || null, oauthError: error || null };

    if (!user) {
      // Not logged in — send to login but keep a note so user can retry
      navigate('/login', { replace: true });
      return;
    }

    const isAdmin = user.role === 'superadmin' || user.role === 'staff';

    if (isAdmin && clientId) {
      navigate(`/admin/workspace/${clientId}/settings`, { state: routerState, replace: true });
    } else if (isAdmin) {
      navigate('/admin', { replace: true });
    } else {
      navigate('/dashboard/settings', { state: routerState, replace: true });
    }
  }, [loading, user, navigate]);

  return (
    <div className="oauth-callback-page">
      <div className="oauth-callback-card">
        <div className="oauth-callback-spinner" />
        <p className="oauth-callback-message">در حال نهایی شدن اتصال…</p>
      </div>
    </div>
  );
}

