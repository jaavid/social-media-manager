'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Anonymous visits render marketing without starting a session. */
export default function ReturningUserRedirect() {
  const router = useRouter();
  useEffect(() => {
    let active = true;
    import('../../services/api').then(({ authAPI }) => authAPI.me()).then(({ data: user }) => {
      if (!active) return;
      const destination = ['superadmin', 'staff'].includes(user.role) ? '/admin'
        : user.role === 'client' && !(user.workspace_id ?? user.client_id) ? '/pending'
        : user.account_type === 'end_user' ? '/u' : '/dashboard';
      router.replace(destination);
    }).catch(() => {});
    return () => { active = false; };
  }, [router]);
  return null;
}
