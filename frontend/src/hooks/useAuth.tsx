/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
'use client';
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { PropsWithChildren } from 'react';
import { authAPI, mfaAPI } from '../services/domains/identity';
import { api } from '../services/http/client';
import { invalidateSession, onSessionInvalidated, notifySessionChanged, onSessionChanged } from '../lib/auth/session';
import { migrateLegacySession } from '../lib/auth/browser';
import { parseSessionUser } from '../lib/auth/contracts';
import type { SessionUser, SessionStatus } from '../lib/auth/contracts';
import { useAppStore } from '../stores/appStore';
import { apiError } from '../services/http/errors';

export interface AuthSession {
  user: SessionUser | null;
  loading: boolean;
  status: SessionStatus;
  login: (email: string, password: string, termsAccepted?: boolean) => Promise<SessionUser | { mfa_required: true; mfa_token: string }>;
  loginMfa: (token: string, options?: { code?: string; backupCode?: string }) => Promise<SessionUser>;
  logout: () => Promise<void>;
  can: (code: string) => boolean;
  refreshUser: () => Promise<SessionUser>;
  refreshAuth: (access?: string, refresh?: string) => Promise<SessionUser>;
  retry: () => void;
  isPending: boolean;
  accountType: SessionUser['account_type'] | null;
  isEndUser: boolean;
  isAgency: boolean;
}
const AuthContext = createContext<AuthSession | null>(null);

export function AuthProvider({ children, initialUser = null }: PropsWithChildren<{ initialUser?: SessionUser | null }>) {
  const [user, setUser] = useState<SessionUser | null>(initialUser);
  const [status, setStatus] = useState<SessionStatus>(initialUser ? 'authenticated' : 'initializing');
  const generation = useRef(0);
  const becomeAnonymous = useCallback(() => {
    generation.current += 1;
    useAppStore.getState().reset();
    setUser(null);
    setStatus('anonymous');
  }, []);
  useEffect(() => onSessionInvalidated(becomeAnonymous), [becomeAnonymous]);

  const refreshUser = useCallback(async () => {
    const current = generation.current;
    const response = await authAPI.me();
    const next = parseSessionUser(response.data);
    if (current === generation.current) { setUser(next); setStatus('authenticated'); }
    return next;
  }, []);
  const retry = useCallback(() => {
    const current = ++generation.current;
    setUser(null);
    setStatus('initializing');
    void migrateLegacySession().then(refreshUser).catch(error => {
      if (current !== generation.current) return;
      if (apiError(error).kind === 'authentication') becomeAnonymous();
      else { setUser(null); setStatus('unavailable'); }
    });
  }, [refreshUser, becomeAnonymous]);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) retry(); });
    return () => { active = false; generation.current += 1; };
  }, [retry]);
  useEffect(() => onSessionChanged(retry), [retry]);

  const login = async (email: string, password: string, termsAccepted?: boolean) => {
    generation.current += 1;
    const response = await authAPI.login(email, password, termsAccepted);
    if ('mfa_required' in response.data && response.data.mfa_required) return { mfa_required: true as const, mfa_token: 'session' };
    const next = await refreshUser();
    notifySessionChanged();
    return next;
  };
  const loginMfa = async (token: string, { code, backupCode }: { code?: string; backupCode?: string } = {}) => {
    generation.current += 1;
    await mfaAPI.login({ mfa_token: token, ...(code ? { code } : {}), ...(backupCode ? { backup_code: backupCode } : {}), terms_accepted: true });
    const next = await refreshUser();
    notifySessionChanged();
    return next;
  };
  const logout = async () => {
    // Revocation must succeed before claiming the server session is logged out.
    await api.delete('/auth/session/');
    invalidateSession();
  };
  const refreshAuth = useCallback(async () => {
    const next = await refreshUser();
    notifySessionChanged();
    return next;
  }, [refreshUser]);
  const can = useCallback((code: string) => !!user && (user.role === 'superadmin' || user.permissions?.[code] === true), [user]);
  const accountType = user?.account_type || null;
  return <AuthContext.Provider value={{ user, status, loading: status === 'initializing', login, loginMfa, logout,
    refreshUser, refreshAuth, retry, can, accountType,
    isPending: !!(user?.role === 'client' && !(user.workspace_id ?? user.client_id)),
    isEndUser: accountType === 'end_user', isAgency: accountType === 'agency_member',
  }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
