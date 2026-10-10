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

export const profileAPI = {
  get:               (signal) => api.get('/profile/', { signal }),
  update:            (data)   => api.patch('/profile/', data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined),
  changePassword:    (data)   => api.post('/profile/change-password/', data),
  agencyInfo:        (signal) => api.get('/profile/agency/', { signal }),
  disconnectAgency:  ()       => api.post('/profile/disconnect-agency/'),
  deleteAccount:     (data)   => api.delete('/profile/delete-account/', { data }),
};

export { authAPI } from './auth';

export const endUserAPI = {
  signup:        (data) => api.post('/end-user/signup/',    data),
  me:            ()     => api.get ('/end-user/me/'),
  updateProfile: (data) => api.put ('/end-user/profile/',   data),
  workspace:     ()     => api.get ('/end-user/workspace/'),
  updateWorkspace: (data) => api.put('/end-user/workspace/', data),
  incomingRequests: () => api.get ('/end-user/incoming-requests/'),
};

export const socialAuthAPI = {
  googleUrl:    () => `${apiBaseUrl()}/auth/social/google/start/`,
  facebookUrl:  () => `${apiBaseUrl()}/auth/social/facebook/start/`,
  microsoftUrl: () => `${apiBaseUrl()}/auth/social/microsoft/start/`,
};

export const invitationAPI = {
  send:       (data)         => api.post('/invitations/send/', data),
  getByToken: (token)        => api.get(`/invitations/token/${token}/`),
  respond:    (token, action) => api.post(`/invitations/token/${token}/respond/`, { action }),
  mine:       ()             => api.get('/invitations/mine/'),
  cancel:     (id)           => api.delete(`/invitations/${id}/cancel/`),
};

export const soloAPI = {
  setup: () => api.post('/workspace/setup-solo/'),
};

export const sessionsAPI = {
  list:      (signal)  => api.get  ('/auth/sessions/', { signal }),
  revoke:    (id)      => api.post (`/auth/sessions/${id}/revoke/`, {}),
  revokeAll: (keepJti) => api.post ('/auth/sessions/revoke-all/',  { keep_jti: keepJti || '' }),
};

export const mfaAPI = {
  status:               (signal) => api.get  ('/auth/mfa/status/', { signal }),
  setup:                ()       => api.post ('/auth/mfa/setup/', {}),
  verifySetup:          (code)   => api.post ('/auth/mfa/verify-setup/', { code }),
  login:                (data)   => api.post ('/auth/mfa/login/', data),
  disable:              (data)   => api.post ('/auth/mfa/disable/', data),
  regenerateBackupCodes: (code)   => api.post ('/auth/mfa/regenerate-backup-codes/', { code }),
};

export const apiKeysAPI = {
  list:    (includeInactive, signal, workspace) => api.get('/api-keys/', { signal, params: { ...(includeInactive ? { include_inactive: 1 } : {}), ...(workspace ? { client_id: workspace } : {}) } }),
  create:  (data, workspace) => api.post('/api-keys/', { ...data, ...(workspace ? { client_id: workspace } : {}) }),
  revoke:  (id, reason, workspace) => api.post(`/api-keys/${id}/revoke/`, { reason: reason || 'user_revoked', ...(workspace ? { client_id: workspace } : {}) }),
};

export const privacyAPI = {
  exportList:    (signal) => api.get  ('/privacy/export-request/', { signal }),
  exportRequest: ()       => api.post ('/privacy/export-request/', {}),
  // download is a direct file URL — no JSON wrapper

  deletionStatus:      (signal) => api.get ('/privacy/delete-account/', { signal }),
  deleteAccount:       (reason) => api.post ('/privacy/delete-account/',         { reason: reason || '' }),
  cancelDeleteAccount: ()       => api.post ('/privacy/delete-account/cancel/',  {}),

  processingStatus:    (signal)               => api.get  ('/privacy/processing-status/', { signal }),
  setProcessingPaused: (paused, clientId)     => api.post ('/privacy/processing-status/', {
    paused: !!paused, ...(clientId ? { client_id: clientId } : {}),
  }),

  consents:    (signal)                    => api.get ('/privacy/consents/', { signal }),
  setConsent:  (consentType, given, via)   => api.post('/privacy/consents/', {
    consent_type: consentType, given: !!given, given_via: via || 'settings_page',
  }),
};

export const organizationAPI = {
  list: () => api.get('/organizations/'),
  create: (data) => api.post('/organizations/', data),
  update: (id, data) => api.patch(`/organizations/${id}/`, data),
  workspaces: (id) => api.get(`/organizations/${id}/workspaces/`),
  createWorkspace: (id, data) => api.post(`/organizations/${id}/workspaces/`, data),
  selectWorkspace: (id, workspaceId) => api.post(`/organizations/${id}/select_workspace/`, { workspace_id: workspaceId }),
  members: (id) => api.get(`/organizations/${id}/members/`),
  updateMember: (id, userId, data) => api.put(`/organizations/${id}/team/${userId}/`, data),
  invitations: (id) => api.get(`/organizations/${id}/invitations/`),
  invite: (id, data) => api.post(`/organizations/${id}/invitations/`, data),
  cancelInvitation: (id, invitationId) => api.delete(`/organizations/${id}/invitations/${invitationId}/`),
  myInvitations: () => api.get('/organization-team/invitations/'),
  acceptInvitation: (id) => api.post(`/organization-team/invitations/${id}/accept/`, {}),
  invitation: (token) => api.get('/organization-team/invitation/', { params: { token } }),
  acceptToken: (token) => api.post('/organization-team/invitation/', { token }),
};
