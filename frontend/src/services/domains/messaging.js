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

export const leadAPI = {
  list:        (params)        => api.get   (`/leads/`, { params }),
  get:         (id)            => api.get   (`/leads/${id}/`),
  update:      (id, data)      => api.put   (`/leads/${id}/`, data),
  patch:       (id, data)      => api.patch (`/leads/${id}/`, data),
  assign:      (id, user_id)   => api.post  (`/leads/${id}/assign/`,   { user_id }),
  status:      (id, payload)   => api.post  (`/leads/${id}/status/`,   payload),
  activity:    (id, payload)   => api.post  (`/leads/${id}/activity/`, payload),
  convert:     (id, value)     => api.post  (`/leads/${id}/convert/`,  { conversion_value: value }),
  timeline:    (id)            => api.get   (`/leads/${id}/timeline/`),
  bulkAssign:  (data)          => api.post  (`/leads/bulk-assign/`, data),
  scoreWithAI: (id)            => api.post  (`/leads/${id}/score-with-ai/`, {}),
  importCsv:   (formData)      => api.post  (`/leads/import_csv/`, formData,
                                              { headers: { 'Content-Type': 'multipart/form-data' } }),
  exportCsvUrl: (params={}) => {
    const base = apiBaseUrl();
    const qs = new URLSearchParams(params).toString();
    return `${base}/leads/export.csv/${qs ? '?' + qs : ''}`;
  },
};

export const activityAPI = {
  list:    (params)     => api.get(`/activity/`, { params }),
  flag:    (id, reason) => api.post(`/activity/${id}/flag/`, { reason }),
  revert:  (id)         => api.post(`/activity/${id}/revert/`, {}),
  // CSV download URL (token attached via the same axios baseURL pattern)
  exportCsvUrl: (params = {}) => {
    const base = apiBaseUrl();
    const qs = new URLSearchParams(params).toString();
    return `${base}/activity/export.csv${qs ? '?' + qs : ''}`;
  },
};

export const inboxAPI = {
  conversations: {
    list:        (params)   => api.get('/inbox/conversations/', { params }),
    get:         (id)       => api.get(`/inbox/conversations/${id}/`),
    markRead:    (id)       => api.post(`/inbox/conversations/${id}/mark_read/`),
    archive:     (id)       => api.post(`/inbox/conversations/${id}/archive/`),
    unarchive:   (id)       => api.post(`/inbox/conversations/${id}/unarchive/`),
    star:        (id)       => api.post(`/inbox/conversations/${id}/star/`),
    unstar:      (id)       => api.post(`/inbox/conversations/${id}/unstar/`),
    resolve:     (id)       => api.post(`/inbox/conversations/${id}/resolve/`),
    reopen:      (id)       => api.post(`/inbox/conversations/${id}/reopen/`),
    assign:      (id, user_id) => api.post(`/inbox/conversations/${id}/assign/`, { user_id }),
    reply:       (id, text) => api.post(`/inbox/conversations/${id}/reply/`, { text }),
  },
  messages: {
    list:        (params)   => api.get('/inbox/messages/', { params }),
  },
  reviews: {
    list:        (params)   => api.get('/inbox/reviews/', { params }),
    get:         (id)       => api.get(`/inbox/reviews/${id}/`),
    reply:       (id, text) => api.post(`/inbox/reviews/${id}/reply/`, { text }),
    flag:        (id)       => api.post(`/inbox/reviews/${id}/flag/`),
  },
  stats:         ()         => api.get('/inbox/stats/'),
};

export const whatsappAPI = {
  account: {
    list:           (params)     => api.get('/whatsapp/accounts/', { params }),
    get:            (id)         => api.get(`/whatsapp/accounts/${id}/`),
    create:         (data)       => api.post('/whatsapp/accounts/', data),
    update:         (id, data)   => api.patch(`/whatsapp/accounts/${id}/`, data),
    delete:         (id)         => api.delete(`/whatsapp/accounts/${id}/`),
    testConnection: (id)         => api.post(`/whatsapp/accounts/${id}/test_connection/`),
    syncStatus:     (id)         => api.post(`/whatsapp/accounts/${id}/sync_status/`),
  },
  contacts: {
    list:        (params)   => api.get('/whatsapp/contacts/', { params }),
    get:         (id)       => api.get(`/whatsapp/contacts/${id}/`),
    create:      (data)     => api.post('/whatsapp/contacts/', data),
    update:      (id, data) => api.patch(`/whatsapp/contacts/${id}/`, data),
    delete:      (id)       => api.delete(`/whatsapp/contacts/${id}/`),
    importCSV:   (formData) => api.post('/whatsapp/contacts/import_csv/', formData, {
                                  headers: { 'Content-Type': 'multipart/form-data' },
                                }),
    bulkOptIn:   (ids)      => api.post('/whatsapp/contacts/bulk_opt_in/',  { ids }),
    bulkOptOut:  (ids)      => api.post('/whatsapp/contacts/bulk_opt_out/', { ids }),
    addToList:   (ids, list_id) => api.post('/whatsapp/contacts/add_to_list/', { ids, list_id }),
    exportCSV:   (params)   => api.get('/whatsapp/contacts/export_csv/', { params, responseType: 'blob' }),
  },
  lists: {
    list:           (params)   => api.get('/whatsapp/lists/', { params }),
    get:            (id)       => api.get(`/whatsapp/lists/${id}/`),
    create:         (data)     => api.post('/whatsapp/lists/', data),
    update:         (id, data) => api.patch(`/whatsapp/lists/${id}/`, data),
    delete:         (id)       => api.delete(`/whatsapp/lists/${id}/`),
    addContacts:    (id, ids)  => api.post(`/whatsapp/lists/${id}/add_contacts/`,    { ids }),
    removeContacts: (id, ids)  => api.post(`/whatsapp/lists/${id}/remove_contacts/`, { ids }),
  },
  templates: {
    list:    (params)   => api.get('/whatsapp/templates/', { params }),
    get:     (id)       => api.get(`/whatsapp/templates/${id}/`),
    create:  (data)     => api.post('/whatsapp/templates/', data),
    update:  (id, data) => api.patch(`/whatsapp/templates/${id}/`, data),
    delete:  (id)       => api.delete(`/whatsapp/templates/${id}/`),
    submit:  (id)       => api.post(`/whatsapp/templates/${id}/submit/`),
    sync:    (id)       => api.post(`/whatsapp/templates/${id}/sync/`),
    preview: (id, variables) => api.post(`/whatsapp/templates/${id}/preview/`, { variables }),
  },
  campaigns: {
    list:        (params)   => api.get('/whatsapp/campaigns/', { params }),
    get:         (id)       => api.get(`/whatsapp/campaigns/${id}/`),
    create:      (data)     => api.post('/whatsapp/campaigns/', data),
    update:      (id, data) => api.patch(`/whatsapp/campaigns/${id}/`, data),
    delete:      (id)       => api.delete(`/whatsapp/campaigns/${id}/`),
    launch:      (id)       => api.post(`/whatsapp/campaigns/${id}/launch/`),
    pause:       (id)       => api.post(`/whatsapp/campaigns/${id}/pause/`),
    resume:      (id)       => api.post(`/whatsapp/campaigns/${id}/resume/`),
    cancel:      (id)       => api.post(`/whatsapp/campaigns/${id}/cancel/`),
    stats:       (id)       => api.get(`/whatsapp/campaigns/${id}/stats/`),
    retryFailed: (id)       => api.post(`/whatsapp/campaigns/${id}/retry_failed/`),
  },
  messages: {
    list: (params) => api.get('/whatsapp/messages/', { params }),
  },
  dashboard: (params) => api.get('/whatsapp/dashboard/', { params }),
  inbox: {
    list:       (params)    => api.get('/whatsapp/inbox/', { params }),
    thread:     (contactId) => api.get('/whatsapp/inbox/thread/', { params: { contact_id: contactId } }),
    sendDirect: (data)      => api.post('/whatsapp/send/', data),
  },
};
