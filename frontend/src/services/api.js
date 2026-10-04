/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
// Compatibility facade. New features import only their domain public API.
export { profileAPI, authAPI, endUserAPI, socialAuthAPI, invitationAPI, soloAPI, sessionsAPI, mfaAPI, apiKeysAPI, privacyAPI } from './domains/identity';
export { manageRequestAPI, relationAPI, managementAPI } from './domains/marketplace';
export { botAPI, botTemplateAPI, botConversationAPI, aiPersonaAPI, botSettingsAPI } from './domains/bots';
export { leadAPI, activityAPI, inboxAPI, whatsappAPI } from './domains/messaging';
export { ctwaAPI, metaAdsAPI, notificationPrefsAPI, verificationAPI, disputeAPI, approvalAPI, agencyInviteAPI, marketplaceAPI, agencyAPI, reviewAPI, workspacesAPI, clientsAPI, oauthAPI } from './domains/accounts';
export { overviewAPI, adminAPI, syncLogsAPI, goalsAPI, insightsAPI, topPostsAPI, alertsAPI, roiAPI, gmbAPI, onboardingAPI, sharedReportsAPI, publicReportAPI, lookupsAPI, contentAPI, notificationAPI, auditAPI, notificationsAPI, competitorAPI, audienceAPI } from './domains/reporting';
export { calendarAPI, videoAPI, automationsAPI, composerAPI, socialAccountsAPI } from './domains/publishing';
export { captionAPI, postIdeasAPI, hashtagAPI, aiAPI, aiV2API } from './domains/intelligence';
export { api, api as default } from './http/client';
export { invalidateSession, onSessionInvalidated } from '../lib/auth/session';
