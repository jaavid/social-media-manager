import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { parseSessionUser } from './contracts';
import type { SessionUser } from './contracts';
type ServerSession = { status: 'authenticated'; user: SessionUser }
  | { status: 'anonymous'; user: null } | { status: 'unavailable'; user: null };

// Request-scoped React cache. No identity or private response enters a shared cache.
export const serverSession = cache(async (): Promise<ServerSession> => {
  const cookie = (await cookies()).get('sessionid');
  if (!cookie) return { status: 'anonymous', user: null };
  const backend = process.env.NEXT_BACKEND_URL || 'http://127.0.0.1:8000';
  try {
    const response = await fetch(`${backend}/api/auth/me/`, {
      headers: { Cookie: `sessionid=${encodeURIComponent(cookie.value)}`, 'X-Browser-Session': '1' },
      cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(15000),
    });
    if (response.status === 401) return { status: 'anonymous', user: null };
    if (!response.ok) return { status: 'unavailable', user: null };
    const user = parseSessionUser(await response.json());
    // Keep token-free identity small; optional feature/profile payloads stay in
    // the authenticated browser API rather than serialized into every RSC tree.
    const { id, role, account_type, workspace_id, client_id, name, email, permissions } = user;
    return { status: 'authenticated', user: { id, role, account_type, workspace_id, client_id, name, email, permissions } };
  } catch { return { status: 'unavailable', user: null }; }
});

/** Required for future private server fetches; API authorization remains final. */
export async function requireServerSession(roles?: SessionUser['role'][]): Promise<SessionUser> {
  const session = await serverSession();
  if (session.status === 'anonymous') redirect('/login');
  if (session.status === 'unavailable') throw new Error('Session service unavailable');
  if (roles && !roles.includes(session.user.role)) redirect('/403');
  return session.user;
}

export async function authorizeServerRoute(roles: SessionUser['role'][], accountTypes?: SessionUser['account_type'][]) {
  const session = await serverSession();
  if (session.status === 'anonymous' && (await cookies()).has('sessionid')) redirect('/login');
  // Anonymous legacy browsers can migrate at the client boundary. Outages show
  // the recovery guard; neither case can fetch/render private server data.
  if (session.status !== 'authenticated') return;
  const { user } = session;
  if (!roles.includes(user.role) || (accountTypes && !accountTypes.includes(user.account_type))) {
    redirect(['staff', 'superadmin'].includes(user.role) ? '/admin' : user.account_type === 'end_user' ? '/u' : '/dashboard');
  }
}
