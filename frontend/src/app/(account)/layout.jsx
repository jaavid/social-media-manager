import { Suspense } from 'react';
import AppProviders from '../../core/providers/AppProviders';

// These views resolve browser credentials and request-specific navigation state.
export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };
export default function AccountLayout({ children }) {
  return <Suspense fallback={<div role="status" aria-busy="true" />}>
    <AppProviders>{children}</AppProviders>
  </Suspense>;
}
