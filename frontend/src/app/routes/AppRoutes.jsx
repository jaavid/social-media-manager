/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import {
  AdminLayout,
  ClientLayout,
  AgencyLayout,
  RootRedirect,
} from '../layout/RouteLayouts';
import Protected from './Protected';

import { Routes, Route } from 'react-router-dom';
import { Suspense } from 'react';
import { Loader, LazyFallback } from '../layout/Loading';
import * as Pages from './pages';
const {
  PublicReportPage,
  PrivacyPolicyPage,
  TermsOfServicePage,
  DataDeletionPage,
  PendingDashboard,
  InvitationPage,
  SignupPage,
  VerifyEmailPage,
  ResetPasswordPage,
  ForBusinessesPage,
  ForAgenciesPage,
  FeaturesPage,
  CustomersPage,
  AboutPage,
  ContactPage,
  CookiePolicyPage,
  GDPRPage,
  DPDPPage,
  SecurityPage,
  HelpCenterPage,
  StatusPage,
  ChangelogPage,
  NotFoundPage,
  ServerErrorPage,
  MaintenancePage,
  BlogIndexPage,
  ProductPage,
  SolutionPage,
  CaseStudyPage,
  IntegrationsPage,
  AgenciesShowcasePage,
  AgencyShowcasePage,
  BlogPostPage,
  EndUserSignupPage,
  EndUserShell,
  EndUserDashboard,
  MyConnectionsPage,
  MyAgencyPage,
  ActivityLogPage,
  ApprovalsPage,
  NotificationPreferencesPage,
  ManageInvitePage,
  AgencyInviteResponsePage,
  MarketplacePage,
  AgencyProfilePage,
  BotFlowEditorPage,
  LoginPage,
  AuthCallbackPage,
  OAuthCallbackPage,
} = Pages;

// ── Protected route wrapper ───────────────────────────────────────────────────
// ── Admin layout — wraps admin/staff routes in AppShell ───────────────────────
export default function AppRoutes() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
        <Route path="/report/:token" element={<PublicReportPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/data-deletion" element={<DataDeletionPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/:slug" element={<CaseStudyPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/cookies" element={<CookiePolicyPage />} />
        <Route path="/gdpr" element={<GDPRPage />} />
        <Route path="/dpdp" element={<DPDPPage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/help" element={<HelpCenterPage />} />
        <Route path="/help/:category" element={<HelpCenterPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/changelog" element={<ChangelogPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/500" element={<ServerErrorPage />} />
        <Route path="/blog" element={<BlogIndexPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />

        {/* Marketingproduct pages (data-driven via productPages.js) */}
        <Route path="/product/:slug" element={<ProductPage />} />
        {/* Marketingsolution pages (data-driven via solutionPages.js) */}
        <Route path="/solutions/:slug" element={<SolutionPage />} />
        <Route path="/integrations" element={<IntegrationsPage />} />
        {/*marketing-flavoured agency showcase (public, SEO).
                The functional B2C marketplace lives at /marketplace. */}
        <Route path="/agencies" element={<AgenciesShowcasePage />} />
        <Route path="/agencies/:slug" element={<AgencyShowcasePage />} />
        <Route path="/invitation/:token" element={<InvitationPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/auth/end-user/signup" element={<EndUserSignupPage />} />
        <Route path="/invite/:token" element={<ManageInvitePage />} />
        <Route
          path="/agency-invite/:token"
          element={<AgencyInviteResponsePage />}
        />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/marketplace/:slug" element={<AgencyProfilePage />} />
        <Route path="/for-businesses" element={<ForBusinessesPage />} />
        <Route path="/for-agencies" element={<ForAgenciesPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ResetPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route
          path="/pending"
          element={
            <Protected roles={['client']}>
              <PendingDashboard />
            </Protected>
          }
        />

        <Route
          path="/admin/*"
          element={
            <Protected roles={['superadmin', 'staff']}>
              <AdminLayout />
            </Protected>
          }
        />

        {/* CTWA bot editor — full-screen, bypasses the AppShell */}
        <Route
          path="/admin/bot-flows/:id/edit"
          element={
            <Protected roles={['superadmin', 'staff']}>
              <Suspense fallback={<LazyFallback />}>
                <BotFlowEditorPage />
              </Suspense>
            </Protected>
          }
        />

        <Route
          path="/dashboard/*"
          element={
            <Protected roles={['client']}>
              <ClientLayout />
            </Protected>
          }
        />

        {/* Agency-member-only management pages.
                account_type guard prevents end_user clients from reaching
                /agency/billing or /agency/marketplace-profile. */}
        <Route
          path="/agency/*"
          element={
            <Protected roles={['client']} accountTypes={['agency_member']}>
              <AgencyLayout />
            </Protected>
          }
        />

        {/* End-user (B2C marketplace) shell*/}
        <Route
          path="/u"
          element={
            <Protected roles={['client']} accountTypes={['end_user']}>
              <EndUserShell />
            </Protected>
          }
        >
          <Route index element={<EndUserDashboard />} />
          <Route path="connections" element={<MyConnectionsPage />} />
          <Route path="agency" element={<MyAgencyPage />} />
          <Route path="agency/find" element={<MarketplacePage />} />
          <Route path="activity" element={<ActivityLogPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route
            path="notifications"
            element={<NotificationPreferencesPage />}
          />
        </Route>

        {/* Catch-all 404 — must be last */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
