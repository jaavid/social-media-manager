/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { api } from '../http/client';
import { apiBaseUrl } from '../../lib/runtime/config';

export const ctwaAPI = {
  list:      (params)          => api.get   (`/ctwa-campaigns/`, { params }),
  get:       (id)              => api.get   (`/ctwa-campaigns/${id}/`),
  create:    (data, params)    => api.post  (`/ctwa-campaigns/`, data, { params }),
  update:    (id, data)        => api.put   (`/ctwa-campaigns/${id}/`, data),
  delete:    (id)              => api.delete(`/ctwa-campaigns/${id}/`),
  analytics: (id)              => api.get   (`/ctwa-campaigns/${id}/analytics/`),
  syncMeta:  (id)              => api.post  (`/ctwa-campaigns/${id}/sync-meta/`, {}),
  adBreakdown: (id)            => api.get   (`/ctwa-campaigns/${id}/ad-breakdown/`),
};

export const metaAdsAPI = {
  accounts:  ()        => api.get('/meta-ads/accounts/'),
  campaigns: (account) => api.get('/meta-ads/campaigns/', { params: { ad_account_id: account } }),
  ads:       (campaign) => api.get('/meta-ads/ads/', { params: { campaign_id: campaign } }),
  health:    ()        => api.get('/meta-ads/health/'),
};

export const notificationPrefsAPI = {
  get:    ()       => api.get ('/notifications/preferences/'),
  update: (rows)   => api.put ('/notifications/preferences/', { matrix: rows }),
};

export const verificationAPI = {
  submit:  (slug, documents) => api.post(`/agency/${slug}/verification/submit/`, { documents }),
  pending: ()                => api.get('/admin/verifications/pending/'),
  get:     (id)              => api.get(`/admin/verifications/${id}/`),
  approve: (id, note = '')   => api.post(`/admin/verifications/${id}/approve/`, { note }),
  reject:  (id, note = '')   => api.post(`/admin/verifications/${id}/reject/`,  { note }),
};

export const disputeAPI = {
  file:    (data)            => api.post('/disputes/file/', data),
  list:    (params)          => api.get('/admin/disputes/', { params }),
  get:     (id)              => api.get(`/admin/disputes/${id}/`),
  resolve: (id, payload)     => api.post(`/admin/disputes/${id}/resolve/`, payload),
};

export const approvalAPI = {
  pending: ()              => api.get('/approvals/pending/'),
  history: ()              => api.get('/approvals/history/'),
  get:     (id)            => api.get(`/approvals/${id}/`),
  approve: (id, payload)   => api.post(`/approvals/${id}/approve/`, payload || {}),
  reject:  (id, reason)    => api.post(`/approvals/${id}/reject/`,  { reason }),
};

export const agencyInviteAPI = {
  send:           (data)            => api.post('/end-user/invite-agency/', data),
  sent:           ()                => api.get ('/end-user/sent-agency-invites/'),
  invite:         (token)           => api.get (`/agency-invite/${token}/`),
  accept:         (token)           => api.post(`/agency-invite/${token}/accept/`,  {}),
  decline:        (token)           => api.post(`/agency-invite/${token}/decline/`, {}),
  agencyIncoming: (slug)            => api.get (`/agency/${slug}/incoming-invites/`),
};

export const marketplaceAPI = {
  list:       (params)        => api.get('/marketplace/agencies/', { params }),
  get:        (slug)          => api.get(`/marketplace/agencies/${slug}/`),
  featured:   ()              => api.get('/marketplace/featured/'),
  categories: ()              => api.get('/marketplace/categories/'),
  contact:    (slug, message) => api.post(`/marketplace/agencies/${slug}/contact/`, { message }),
};

export const agencyAPI = {
  get:    (slug)        => api.get (`/agency/${slug}/`),
  update: (slug, data)  => api.put (`/agency/${slug}/`, data),
};

export const reviewAPI = {
  list:    (slug, params)        => api.get(`/agencies/${slug}/reviews/`, { params }),
  create:  (slug, payload)       => api.post(`/agencies/${slug}/reviews/`, payload),
  update:  (id, payload)         => api.put(`/reviews/${id}/`, payload),
  delete:  (id)                  => api.delete(`/reviews/${id}/`),
  respond: (id, response)        => api.post(`/reviews/${id}/respond/`, { response }),
  helpful: (id)                  => api.post(`/reviews/${id}/helpful/`, {}),
};

export const workspacesAPI = {
  list:        ()           => api.get('/workspaces/'),
  get:         (id)         => api.get(`/workspaces/${id}/`),
  create:      (data)       => api.post('/workspaces/', data),
  update:      (id, data)   => api.patch(
    `/workspaces/${id}/`,
    data,
    data instanceof FormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : undefined
  ),
  delete:      (id)         => api.delete(`/workspaces/${id}/`),
  summary:     (id, params) => api.get(`/workspaces/${id}/summary/`, { params }),
  timeseries:  (id, params) => api.get(`/workspaces/${id}/timeseries/`, { params }),
  posts:       (id, params) => api.get(`/workspaces/${id}/posts/`, { params }),
  triggerSync: (id, platforms, socialAccountIds) => api.post(`/workspaces/${id}/trigger_sync/`, {
    platforms,
    ...(socialAccountIds ? { social_account_ids: socialAccountIds } : {}),
  }),
  syncStatus:  (id, params) => api.get(`/workspaces/${id}/sync_status/`, { params }),
  syncAll:     ()           => api.post('/admin/sync-all/'),
};

export const clientsAPI = workspacesAPI;

export const oauthAPI = {
  status:     (clientId)           => api.get(`/oauth/status/${clientId}/`),
  disconnect: (clientId, platform) => api.delete(`/oauth/disconnect/${clientId}/${platform}/`),
  // Connect URLs (redirect browser directly)
  facebookUrl: (clientId)           => `${apiBaseUrl()}/oauth/facebook/start/${clientId}/`,
  googleUrl:   (clientId, platform) => `${apiBaseUrl()}/oauth/google/start/${clientId}/?platform=${platform || 'all'}`,
  linkedinUrl: (clientId)           => `${apiBaseUrl()}/oauth/linkedin/start/${clientId}/`,
};
