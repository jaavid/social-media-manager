/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, mfaAPI, invalidateSession, onSessionInvalidated } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('initializing');

  const becomeAnonymous = useCallback(() => {
    setUser(null);
    setStatus('anonymous');
    setLoading(false);
  }, []);

  useEffect(() => onSessionInvalidated(becomeAnonymous), [becomeAnonymous]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      authAPI.me()
        .then(res => { setUser(res.data); setStatus('authenticated'); })
        .catch(() => { invalidateSession(); becomeAnonymous(); })
        .finally(() => setLoading(false));
    } else {
      becomeAnonymous();
    }
  }, []);

  const login = async (email, password, termsAccepted) => {
    const res = await authAPI.login(email, password, termsAccepted);
    // MFA handshake: the backend returns {mfa_required, mfa_token} with no
    // token pair. Surface it to the caller instead of poisoning storage.
    if (res.data?.mfa_required) {
      return { mfa_required: true, mfa_token: res.data.mfa_token };
    }
    localStorage.setItem('access_token',  res.data.access);
    localStorage.setItem('refresh_token', res.data.refresh);
    const me = await authAPI.me();
    setUser(me.data);
    setStatus('authenticated');
    return me.data;
  };

  // Second factor: exchange the mfa_token + TOTP/backup code for real tokens.
  const loginMfa = async (mfaToken, { code, backupCode } = {}) => {
    const res = await mfaAPI.login({
      mfa_token: mfaToken,
      ...(code ? { code } : {}),
      ...(backupCode ? { backup_code: backupCode } : {}),
      terms_accepted: true,
    });
    localStorage.setItem('access_token',  res.data.access);
    localStorage.setItem('refresh_token', res.data.refresh);
    const me = await authAPI.me();
    setUser(me.data);
    setStatus('authenticated');
    return me.data;
  };

  const logout = () => {
    invalidateSession();
  };

  const refreshUser = useCallback(async () => {
    const me = await authAPI.me();
    setUser(me.data);
    setStatus('authenticated');
    return me.data;
  }, []);

  // Called after invitation acceptance or solo setup returns new tokens.
  const refreshAuth = useCallback(async (newAccessToken, newRefreshToken) => {
    if (newAccessToken) localStorage.setItem('access_token', newAccessToken);
    if (newRefreshToken) localStorage.setItem('refresh_token', newRefreshToken);
    const me = await authAPI.me();
    setUser(me.data);
    setStatus('authenticated');
    return me.data;
  }, []);

  // Check if the current user has a given permission code.
  // Superadmin always returns true. Others check the permissions dict from /me.
  const can = useCallback((code) => {
    if (!user) return false;
    if (user.role === 'superadmin') return true;
    return user.permissions?.[code] === true;
  }, [user]);

  // True when a client is logged in but has no client_id yet (self-registered, no agency)
  const isPending = !!(user && user.role === 'client' && !(user.workspace_id ?? user.client_id));

  // Account-type helpers. account_type is set on UserProfile and surfaced
  // by /auth/me/. Possible values: 'end_user' | 'agency_member' | 'legacy'
  // (default for accounts created before the field existed).
  const accountType = user?.account_type || null;
  const isEndUser   = accountType === 'end_user';
  const isAgency    = accountType === 'agency_member';

  return (
    <AuthContext.Provider value={{
      user, loading, status, login, loginMfa, logout, can,
      refreshUser, refreshAuth, isPending,
      accountType, isEndUser, isAgency,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
