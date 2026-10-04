import { useAuth } from '../hooks/useAuth';
export type { SessionUser } from '../lib/auth/contracts';
export type { AuthSession as Session } from '../hooks/useAuth';
export function useSession() {
  const session = useAuth();
  if (!session) throw new Error('useSession requires AuthProvider');
  return session;
}
