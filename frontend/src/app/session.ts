import { useAuth } from '../hooks/useAuth';
export interface SessionUser {
  role: string;
  account_type: string;
  workspace_id?: number;
  client_id?: number;
  name?: string;
  email?: string;
  permissions?: Record<string, boolean>;
  [field: string]: unknown;
}
export interface Session {
  user: SessionUser | null;
  loading: boolean;
  status: string;
  logout: () => void;
  can: (permission: string) => boolean;
  isPending: boolean;
  isEndUser: boolean;
  isAgency: boolean;
  accountType: string | null;
  login: (
    email: string,
    password: string,
    termsAccepted?: boolean,
  ) => Promise<unknown>;
  loginMfa: (
    token: string,
    options?: { code?: string; backupCode?: string },
  ) => Promise<unknown>;
  refreshUser: () => Promise<SessionUser>;
  refreshAuth: (access?: string, refresh?: string) => Promise<SessionUser>;
}
/** Typed boundary over the legacy provider; a future host replaces this adapter. */
export function useSession(): Session {
  const session = useAuth() as unknown as Session | null;
  if (!session) throw new Error('useSession requires AuthProvider');
  return session;
}
