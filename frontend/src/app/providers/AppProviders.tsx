import type { ComponentType, PropsWithChildren } from 'react';
import MigrationBoundary from '../routes/MigrationBoundary';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../../services/queryClient';
import { AuthProvider } from '../../hooks/useAuth';
import { ThemeProvider } from '../../hooks/useTheme';
import { RealtimeProvider } from '../../hooks/useRealtime';
import RealtimeBridge from '../../components/RealtimeBridge';
import ErrorBoundary from '../../components/ui/ErrorBoundary';
import CookieBanner from '../../components/legal/CookieBanner';
import PageviewTracker from '../../components/PageviewTracker';
import { ToastProvider } from '../../components/ui/toast';

export default function AppProviders({
  children,
  router: HostRouter = BrowserRouter,
}: PropsWithChildren<{ router?: ComponentType<PropsWithChildren> }>) {
  return (
    <HostRouter>
      <PageviewTracker />
      <ErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
            <QueryClientProvider client={queryClient}>
              <RealtimeProvider>
                <RealtimeBridge />
                {HostRouter === BrowserRouter
                  ? <MigrationBoundary>{children}</MigrationBoundary>
                  : children}
                <ToastProvider />
                <CookieBanner />
              </RealtimeProvider>
            </QueryClientProvider>
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </HostRouter>
  );
}
