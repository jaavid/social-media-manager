'use client';
import type { PropsWithChildren } from 'react';
import { useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { NavigationProvider } from '../navigation';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '../../services/queryClient';
import { AuthProvider } from '../../hooks/useAuth';
import { useSession } from '../session';
import ErrorBoundary from '../../components/ui/ErrorBoundary';
const CookieBanner = dynamic(() => import('../../components/legal/CookieBanner'), { ssr: false });

export default function AppProviders({
  children,
}: PropsWithChildren) {
  return (
    <NavigationProvider>
      <ErrorBoundary>
        <AuthProvider>
          <SessionProviders>{children}</SessionProviders>
        </AuthProvider>
      </ErrorBoundary>
    </NavigationProvider>
  );
}

// Replacing the provider prevents one browser account from observing another
// account's cached requests, including cached data during the logout render.
function SessionProviders({ children }: PropsWithChildren) {
  const { user } = useSession();
  const identity = user ? JSON.stringify([user.id, user.email, user.role, user.account_type, user.workspace_id, user.client_id]) : 'anonymous';
  const queryClient = useMemo(createQueryClient, [identity]);
  useEffect(() => () => queryClient.clear(), [queryClient]);
  return (
    <QueryClientProvider key={identity} client={queryClient}>
      {children}
      <CookieBanner user={user} />
    </QueryClientProvider>
  );
}
