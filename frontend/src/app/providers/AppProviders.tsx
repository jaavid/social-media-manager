import type { PropsWithChildren } from 'react';
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

export default function AppProviders({ children }: PropsWithChildren) {
  return (
    <BrowserRouter>
      <PageviewTracker />
      <ErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
            <QueryClientProvider client={queryClient}>
              <RealtimeProvider>
                <RealtimeBridge />
                {children}
                <ToastProvider />
                <CookieBanner />
              </RealtimeProvider>
            </QueryClientProvider>
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
