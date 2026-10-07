/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { api, publicApi } from '../http/client';
import { ensureCsrf } from '@/lib/auth/browser';

export const overviewAPI = {
  get: (params) => api.get('/overview/', { params }),
};

export const adminAPI = {
  createWorkspace: (data) => api.post('/admin/create-workspace/', data),
};

export const syncLogsAPI = {
  list: (params, signal) => api.get('/synclogs/', { params, signal }),
};

export const goalsAPI = {
  list:     (params)   => api.get('/goals/', { params }),
  create:   (data)     => api.post('/goals/', data),
  update:   (id, data) => api.put(`/goals/${id}/`, data),
  delete:   (id)       => api.delete(`/goals/${id}/`),
  progress: (params)   => api.get('/goals/progress/', { params }),
};

export const insightsAPI = {
  list:     (params) => api.get('/insights/', { params }),
  generate: (data)   => api.post('/insights/generate/', data),
};

export const topPostsAPI = {
  list:    (params) => api.get('/top-posts/', { params }),
  allTime: (params) => api.get('/top-posts/all-time/', { params }),
  run:     ()       => api.post('/top-posts/run/'),
};

export const alertsAPI = {
  list:        (params, config = {}) => api.get('/alerts/', { ...config, params }),
  markRead:    (id)     => api.post(`/alerts/${id}/mark_read/`),
  markAllRead: (params) => api.post('/alerts/mark_all_read/', null, { params }),
  runCheck:    ()       => api.post('/alerts/run_check/'),
};

export const roiAPI = {
  getSettings:  (clientId)        => api.get(`/roi/settings/${clientId}/`),
  saveSettings: (clientId, data)  => api.put(`/roi/settings/${clientId}/`, data),
  calculate:    (data)            => api.post('/roi/calculate/', data),
  getLive:      (params)          => api.get('/roi/live/', { params }),
  getReports:   (params, signal)  => api.get('/roi/reports/', { params, signal }),
};

export const gmbAPI = {
  info:    (clientId)         => api.get(`/gmb/info/${clientId}/`),
  reviews: (clientId, params) => api.get(`/gmb/reviews/${clientId}/`, { params }),
};

export const onboardingAPI = {
  list:   (params) => api.get('/onboarding/', { params }),
  update: (id, data) => api.patch(`/onboarding/${id}/`, data),
};

export const sharedReportsAPI = {
  list:   (params, signal) => api.get('/shared-reports/', { params, signal }),
  create: (data)   => api.post('/shared-reports/', data),
  delete: (id)     => api.delete(`/shared-reports/${id}/`),
  update: (id, data) => api.patch(`/shared-reports/${id}/`, data),
};

export const publicReportAPI = {
  get:    (token, signal)  => publicApi.get(`/public/report/${token}/`, { signal }),
  verify: async (token, password) => publicApi.post(`/public/report/${token}/verify/`, { password }, { headers: { 'X-CSRFToken': await ensureCsrf() } }),
};

export const lookupsAPI = {
  get: () => publicApi.get('/public/lookups/'),
};

export const contentAPI = {
  getPublic: (key) => publicApi.get(`/public/content/${key}/`),
};

export const notificationAPI = {
  list:     (config = {}) => api.get('/notifications/', config),
  markRead: (id) => api.post(`/notifications/${id}/read/`),
  markAll:  ()   => api.post('/notifications/read-all/'),
};

export const auditAPI = {
  list: (params) => api.get('/audit/log/', { params }),
};

export const notificationsAPI = {
  getPreferences: ()       => api.get('/notifications/preferences/'),
  putPreferences: (matrix) => api.put('/notifications/preferences/', { matrix }),
  approvalQueue:  (params) => api.get('/composer/approvals/', { params }),
};

export const competitorAPI = {
  list:       (params)   => api.get('/competitors/', { params }),
  get:        (id)       => api.get(`/competitors/${id}/`),
  create:     (data)     => api.post('/competitors/', data),
  update:     (id, data) => api.patch(`/competitors/${id}/`, data),
  delete:     (id)       => api.delete(`/competitors/${id}/`),
  timeline:   (id, params) => api.get(`/competitors/${id}/timeline/`, { params }),
  posts:      (id, params) => api.get(`/competitors/${id}/posts/`, { params }),
  insights:   (id)       => api.post(`/competitors/${id}/insights/`),
  snapshotNow:(id)       => api.post(`/competitors/${id}/snapshot_now/`),
  benchmark:  (data)     => api.post('/competitors/benchmark/', data),
};

export const audienceAPI = {
  unified: (params) => api.get('/audience/unified/', { params }),
};

// Retained Client SDK compatibility; new code uses workspace names.
adminAPI.createClient = adminAPI.createWorkspace;
