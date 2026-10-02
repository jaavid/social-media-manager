/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Suspense } from 'react';
import { useSession as useAuth } from '../session';
import AppShell from '../layout/AppShell';
import { Loader, LazyFallback } from '../layout/Loading';
import * as Pages from '../routes/pages';
const {
  AnalyticsModule,
  MessagingModule,
  AdsModule,
  SettingsPage,
  EditClientPage,
  ClientDashboard,
  ROICalculatorPage,
  AllClientsPage,
  ManagementPage,
  UserSettingsPage,
  ClientOnboardingPage,
  HomePage,
  AgencyMarketplaceProfilePage,
  AdminTrustQueuePage,
  BotFlowsListPage,
  LeadsPage,
  LeadDetailPage,
  BotConversationsPage,
  BotConversationDetailPage,
  BotAnalyticsPage,
  CTWACampaignsPage,
  CTWACampaignDetailPage,
  TemplatesGalleryPage,
  HandoffQueuePage,
  BotSettingsPage,
} = Pages;
export function AdminLayout() {
  return (
    <AppShell isAdmin>
      <Suspense fallback={<LazyFallback />}>
        <Routes>
          {/* Default → analytics module */}
          <Route index element={<Navigate to="analytics" replace />} />

          {/* Modules */}
          <Route path="analytics/*" element={<AnalyticsModule isAdmin />} />
          <Route path="messaging/*" element={<MessagingModule />} />
          <Route path="ads/*" element={<AdsModule />} />

          {/* Outside-module pages */}
          <Route path="workspaces" element={<AllClientsPage />} />
          <Route path="clients" element={<AllClientsPage />} />
          <Route path="management" element={<ManagementPage />} />
          <Route path="account-settings" element={<UserSettingsPage />} />
          <Route path="trust" element={<AdminTrustQueuePage />} />

          {/* Agency-only pages moved to /agency/*. Redirect any stale links. */}
          <Route
            path="marketplace-profile"
            element={<Navigate to="/agency/marketplace-profile" replace />}
          />

          {/* CTWA bot builder list (full editor lives at top-level /bot-flows/:id/edit
              so it can use the entire viewport without the AppShell chrome) */}
          <Route path="bot-flows" element={<BotFlowsListPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="leads/:id" element={<LeadDetailPage />} />
          <Route path="conversations" element={<BotConversationsPage />} />
          <Route
            path="conversations/:id"
            element={<BotConversationDetailPage />}
          />
          <Route path="handoff" element={<HandoffQueuePage />} />
          <Route path="bot-settings" element={<BotSettingsPage />} />
          <Route
            path="bot-flows/:id/analytics"
            element={<BotAnalyticsPage />}
          />
          <Route path="ctwa" element={<CTWACampaignsPage />} />
          <Route path="ctwa/:id" element={<CTWACampaignDetailPage />} />
          <Route path="bot-templates" element={<TemplatesGalleryPage />} />

          {/* Per-client deep-dive */}
          <Route
            path="workspace/:workspaceId/*"
            element={<AdminClientView />}
          />
          <Route path="client/:clientId/*" element={<AdminClientView />} />

          {/* Legacy URL redirects → new module routes */}
          <Route
            path="dashboard"
            element={<Navigate to="/admin/analytics/dashboard" replace />}
          />
          <Route
            path="analytics"
            element={<Navigate to="/admin/analytics/analytics" replace />}
          />
          <Route
            path="reports"
            element={<Navigate to="/admin/analytics/reports" replace />}
          />
          <Route
            path="calendar"
            element={<Navigate to="/admin/analytics/calendar" replace />}
          />
          <Route
            path="roi"
            element={<Navigate to="/admin/analytics/roi" replace />}
          />
          <Route
            path="alerts"
            element={<Navigate to="/admin/analytics/alerts" replace />}
          />
          <Route
            path="synclogs"
            element={<Navigate to="/admin/analytics/synclogs" replace />}
          />
          <Route
            path="caption-writer"
            element={<Navigate to="/admin/analytics/caption-writer" replace />}
          />
          <Route
            path="post-ideas"
            element={<Navigate to="/admin/analytics/post-ideas" replace />}
          />
          <Route
            path="hashtags"
            element={<Navigate to="/admin/analytics/hashtags" replace />}
          />

          <Route
            path="whatsapp"
            element={<Navigate to="/admin/messaging" replace />}
          />
          <Route
            path="whatsapp/inbox"
            element={<Navigate to="/admin/messaging/inbox" replace />}
          />
          <Route
            path="whatsapp/contacts"
            element={<Navigate to="/admin/messaging/contacts" replace />}
          />
          <Route
            path="whatsapp/templates"
            element={<Navigate to="/admin/messaging/templates" replace />}
          />
          <Route
            path="whatsapp/campaigns"
            element={<Navigate to="/admin/messaging/campaigns" replace />}
          />
          <Route
            path="whatsapp/settings"
            element={<Navigate to="/admin/messaging/account" replace />}
          />

          <Route path="onboarding" element={<Navigate to="/admin" replace />} />

          {/* Catch-all → analytics */}
          <Route path="*" element={<Navigate to="analytics" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
function AdminClientView() {
  const { clientId: legacyClientId, workspaceId } = useParams();
  const clientId = workspaceId || legacyClientId;
  return (
    <Suspense fallback={<LazyFallback />}>
      <Routes>
        <Route index element={<ClientDashboard clientId={clientId} />} />
        <Route path="settings" element={<SettingsPage clientId={clientId} />} />
        <Route path="edit" element={<EditClientPage clientId={clientId} />} />
        <Route path="roi" element={<ROICalculatorPage clientId={clientId} />} />
      </Routes>
    </Suspense>
  );
}

// ── Client layout — wraps client routes in AppShell ───────────────────────────
export function ClientLayout() {
  const { user } = useAuth();
  return (
    <AppShell isAdmin={false}>
      <Suspense fallback={<LazyFallback />}>
        <Routes>
          <Route index element={<Navigate to="analytics" replace />} />

          <Route
            path="analytics/*"
            element={<AnalyticsModule clientId={user?.client_id} />}
          />
          <Route path="messaging/*" element={<MessagingModule />} />
          <Route path="ads/*" element={<AdsModule />} />

          <Route
            path="settings"
            element={<SettingsPage clientId={user?.client_id} />}
          />
          <Route path="account-settings" element={<UserSettingsPage />} />
          <Route path="onboarding" element={<ClientOnboardingPage />} />

          {/* Legacy URL redirects */}
          <Route
            path="posts"
            element={<Navigate to="/dashboard/analytics/posts" replace />}
          />
          <Route
            path="calendar"
            element={<Navigate to="/dashboard/analytics/calendar" replace />}
          />
          <Route
            path="roi"
            element={<Navigate to="/dashboard/analytics/roi" replace />}
          />
          <Route
            path="caption-writer"
            element={
              <Navigate to="/dashboard/analytics/caption-writer" replace />
            }
          />
          <Route
            path="post-ideas"
            element={<Navigate to="/dashboard/analytics/post-ideas" replace />}
          />
          <Route
            path="hashtags"
            element={<Navigate to="/dashboard/analytics/hashtags" replace />}
          />

          <Route
            path="whatsapp"
            element={<Navigate to="/dashboard/messaging" replace />}
          />
          <Route
            path="whatsapp/inbox"
            element={<Navigate to="/dashboard/messaging/inbox" replace />}
          />
          <Route
            path="whatsapp/contacts"
            element={<Navigate to="/dashboard/messaging/contacts" replace />}
          />
          <Route
            path="whatsapp/templates"
            element={<Navigate to="/dashboard/messaging/templates" replace />}
          />
          <Route
            path="whatsapp/campaigns"
            element={<Navigate to="/dashboard/messaging/campaigns" replace />}
          />
          <Route
            path="whatsapp/settings"
            element={<Navigate to="/dashboard/messaging/account" replace />}
          />

          <Route path="*" element={<Navigate to="analytics" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

// ── Root: marketing home for guests, dashboard redirect for users ────────────
export function RootRedirect() {
  const { user, loading, isPending } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <HomePage />;
  if (user.role === 'superadmin' || user.role === 'staff')
    return <Navigate to="/admin" replace />;
  if (isPending) return <Navigate to="/pending" replace />;
  // Account-type-aware client routing. End users land in their dedicated
  // shell; agency members and legacy clients use the shared dashboard.
  if (user.account_type === 'end_user') return <Navigate to="/u" replace />;
  return <Navigate to="/dashboard" replace />;
}

// ── Agency layout — wraps agency-member-only management pages in AppShell ────
export function AgencyLayout() {
  return (
    <AppShell isAdmin={false}>
      <Suspense fallback={<LazyFallback />}>
        <Routes>
          <Route
            index
            element={<Navigate to="marketplace-profile" replace />}
          />
          <Route
            path="marketplace-profile"
            element={<AgencyMarketplaceProfilePage />}
          />
          <Route
            path="*"
            element={<Navigate to="marketplace-profile" replace />}
          />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
