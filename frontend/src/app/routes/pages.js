/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { lazy } from 'react';
// ── Modules (sub-routers) ──────────────────────────────────────────────────
const AnalyticsModule = lazy(() => import('./modules/AnalyticsModule'));
const MessagingModule = lazy(() => import('./modules/MessagingModule'));
const AdsModule = lazy(() => import('./modules/AdsModule'));

// ── Eagerly loaded (critical path) ──────────────────────────────────────────
import LoginPage from '../../pages/LoginPage';
import AuthCallbackPage from '../../pages/AuthCallbackPage';
import OAuthCallbackPage from '../../pages/OAuthCallbackPage';

// ── Pages outside the modules (settings/admin/legacy detail views) ──────────
const SettingsPage = lazy(() => import('../../features/settings/SettingsPage'));
const EditClientPage = lazy(() => import('../../pages/EditClientPage'));
const ClientDashboard = lazy(() => import('../../pages/ClientDashboard'));
const ROICalculatorPage = lazy(() => import('../../pages/ROICalculatorPage'));
const AllClientsPage = lazy(
  () => import('../../features/workspaces/AllClientsPage'),
);
const ManagementPage = lazy(
  () => import('../../features/management/ManagementPage'),
);
const UserSettingsPage = lazy(
  () => import('../../features/settings/UserSettingsPage'),
);
const ClientOnboardingPage = lazy(
  () => import('../../pages/ClientOnboardingPage'),
);
const PublicReportPage = lazy(() => import('../../pages/PublicReportPage'));
const PrivacyPolicyPage = lazy(() => import('../../pages/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('../../pages/TermsOfServicePage'));
const DataDeletionPage = lazy(() => import('../../pages/DataDeletionPage'));
const PendingDashboard = lazy(() => import('../../pages/PendingDashboard'));
const InvitationPage = lazy(() => import('../../pages/InvitationPage'));
const SignupPage = lazy(() => import('../../pages/SignupPage'));
const VerifyEmailPage = lazy(() => import('../../pages/VerifyEmailPage'));
const ResetPasswordPage = lazy(() => import('../../pages/ResetPasswordPage'));
const HomePage = lazy(() => import('../../pages/HomePage'));
const ForBusinessesPage = lazy(() => import('../../pages/ForBusinessesPage'));
const ForAgenciesPage = lazy(() => import('../../pages/ForAgenciesPage'));
const FeaturesPage = lazy(() => import('../../pages/FeaturesPage'));
const CustomersPage = lazy(() => import('../../pages/CustomersPage'));
const AboutPage = lazy(() => import('../../pages/AboutPage'));
const ContactPage = lazy(() => import('../../pages/ContactPage'));
const CookiePolicyPage = lazy(() => import('../../pages/CookiePolicyPage'));
const GDPRPage = lazy(() => import('../../pages/GDPRPage'));
const DPDPPage = lazy(() => import('../../pages/DPDPPage'));
const SecurityPage = lazy(() => import('../../pages/SecurityPage'));
const HelpCenterPage = lazy(() => import('../../pages/HelpCenterPage'));
const StatusPage = lazy(() => import('../../pages/StatusPage'));
const ChangelogPage = lazy(() => import('../../pages/ChangelogPage'));
const NotFoundPage = lazy(() => import('../../pages/NotFoundPage'));
const ServerErrorPage = lazy(() => import('../../pages/ServerErrorPage'));
const MaintenancePage = lazy(() => import('../../pages/MaintenancePage'));
const BlogIndexPage = lazy(() => import('../../pages/BlogIndexPage'));
const ComingSoonMarketingPage = lazy(
  () => import('../../pages/marketing/ComingSoonPage'),
);
const ProductPage = lazy(() => import('../../pages/marketing/ProductPage'));
const SolutionPage = lazy(() => import('../../pages/marketing/SolutionPage'));
const CaseStudyPage = lazy(() => import('../../pages/marketing/CaseStudyPage'));
const IntegrationsPage = lazy(() => import('../../pages/IntegrationsPage'));
const AgenciesShowcasePage = lazy(
  () => import('../../pages/marketing/AgenciesShowcasePage'),
);
const AgencyShowcasePage = lazy(
  () => import('../../pages/marketing/AgencyShowcasePage'),
);
const BlogPostPage = lazy(() => import('../../pages/BlogPostPage'));

// ── End-user (B2C marketplace) — ────────────────────────────────────
const EndUserSignupPage = lazy(
  () => import('../../pages/end-user/EndUserSignupPage'),
);
const EndUserShell = lazy(() => import('../../pages/end-user/EndUserShell'));
const EndUserDashboard = lazy(
  () => import('../../pages/end-user/EndUserDashboard'),
);
const MyConnectionsPage = lazy(
  () => import('../../pages/end-user/MyConnectionsPage'),
);
const MyAgencyPage = lazy(() => import('../../pages/end-user/MyAgencyPage'));
const ActivityLogPage = lazy(
  () => import('../../pages/end-user/ActivityLogPage'),
);
const ApprovalsPage = lazy(() => import('../../pages/end-user/ApprovalsPage'));
const NotificationPreferencesPage = lazy(
  () => import('../../pages/end-user/NotificationPreferencesPage'),
);

// ── Marketplace flows — ────────────────────────────────────
const ManageInvitePage = lazy(
  () => import('../../pages/marketplace/ManageInvitePage'),
);
const AgencyInviteResponsePage = lazy(
  () => import('../../pages/marketplace/AgencyInviteResponsePage'),
);
const MarketplacePage = lazy(
  () => import('../../pages/marketplace/MarketplacePage'),
);
const AgencyProfilePage = lazy(
  () => import('../../pages/marketplace/AgencyProfilePage'),
);
const AgencyMarketplaceProfilePage = lazy(
  () => import('../../pages/agency/AgencyMarketplaceProfilePage'),
);
const AdminTrustQueuePage = lazy(
  () => import('../../pages/admin/AdminTrustQueuePage'),
);

// ── CTWA bot builder ────────────────────────────────────────────────────────
const BotFlowsListPage = lazy(
  () => import('../../pages/bots/BotFlowsListPage'),
);
const BotFlowEditorPage = lazy(
  () => import('../../pages/bots/BotFlowEditorPage'),
);
const LeadsPage = lazy(() => import('../../pages/leads/LeadsPage'));
const LeadDetailPage = lazy(() => import('../../pages/leads/LeadDetailPage'));
const BotConversationsPage = lazy(
  () => import('../../pages/bots/BotConversationsPage'),
);
const BotConversationDetailPage = lazy(
  () => import('../../pages/bots/BotConversationDetailPage'),
);
const BotAnalyticsPage = lazy(
  () => import('../../pages/bots/BotAnalyticsPage'),
);
const CTWACampaignsPage = lazy(
  () => import('../../pages/ctwa/CTWACampaignsPage'),
);
const CTWACampaignDetailPage = lazy(
  () => import('../../pages/ctwa/CTWACampaignDetailPage'),
);
const TemplatesGalleryPage = lazy(
  () => import('../../pages/bots/TemplatesGalleryPage'),
);
const HandoffQueuePage = lazy(
  () => import('../../pages/bots/HandoffQueuePage'),
);
const BotSettingsPage = lazy(() => import('../../pages/bots/BotSettingsPage'));

export {
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
  PublicReportPage,
  PrivacyPolicyPage,
  TermsOfServicePage,
  DataDeletionPage,
  PendingDashboard,
  InvitationPage,
  SignupPage,
  VerifyEmailPage,
  ResetPasswordPage,
  HomePage,
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
  ComingSoonMarketingPage,
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
  AgencyMarketplaceProfilePage,
  AdminTrustQueuePage,
  BotFlowsListPage,
  BotFlowEditorPage,
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
  LoginPage,
  AuthCallbackPage,
  OAuthCallbackPage,
};
