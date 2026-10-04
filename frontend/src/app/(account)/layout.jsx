import { serverSession } from '../../lib/auth/server';
import { Suspense } from 'react';
import AppProviders from '../../core/providers/AppProviders';

// These views resolve browser credentials and request-specific navigation state.
export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };
export default async function AccountLayout({ children }) {
  const session = await serverSession();
  // Only minimal identity data crosses to the provider; cookie values stay in the DAL.
  const initialUser = session.status === 'authenticated' ? session.user : null;
  return <Suspense fallback={<div role="status" aria-busy="true" />}>
    <AppProviders initialUser={initialUser}>{children}</AppProviders>
  </Suspense>;
}
