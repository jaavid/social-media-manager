/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { api } from '../http/client';

export const botAPI = {
  list:        (params, signal) => api.get   ('/bot-flows/', { params, signal }),
  get:         (id)             => api.get   (`/bot-flows/${id}/`),
  create:      (data, params)   => api.post  ('/bot-flows/', data, { params }),
  update:      (id, data)       => api.put   (`/bot-flows/${id}/`, data),
  patch:       (id, data)       => api.patch (`/bot-flows/${id}/`, data),
  delete:      (id)             => api.delete(`/bot-flows/${id}/`),
  duplicate:   (id)             => api.post  (`/bot-flows/${id}/duplicate/`, {}),
  validate:    (id)             => api.post  (`/bot-flows/${id}/validate/`, {}),
  publish:     (id)             => api.post  (`/bot-flows/${id}/publish/`, {}),
  unpublish:   (id)             => api.post  (`/bot-flows/${id}/unpublish/`, {}),
  test:        (id, phone)      => api.post  (`/bot-flows/${id}/test/`, { phone }),
  analytics:   (id)             => api.get   (`/bot-flows/${id}/analytics/`),
  generateWithAI: (payload, params) =>
    api.post('/bot-flows/generate-with-ai/', payload, { params }),
};

export const botTemplateAPI = {
  list:  (params) => api.get(`/bot-templates/`, { params }),
  get:   (id)     => api.get(`/bot-templates/${id}/`),
  use:   (id, data) => api.post(`/bot-templates/${id}/use/`, data),
};

export const botConversationAPI = {
  list:    (params)  => api.get(`/bot-conversations/`, { params }),
  get:     (id)      => api.get(`/bot-conversations/${id}/`),
  handoff: (id, data)=> api.post(`/bot-conversations/${id}/handoff/`, data || {}),
  end:     (id)      => api.post(`/bot-conversations/${id}/end/`, {}),
  suggestReplies: (id) => api.post(`/bot-conversations/${id}/ai-suggest-replies/`, {}),
  handoffQueue:   (params) => api.get(`/bot-conversations/handoff-queue/`, { params }),
};

export const aiPersonaAPI = {
  build: (payload) => api.post('/ai/persona-builder/', payload),
};

export const botSettingsAPI = {
  get:    ()        => api.get ('/bot-settings/'),
  update: (payload) => api.put ('/bot-settings/', payload),
};
