/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { api } from '../http/client';

export const calendarAPI = {
  getPosts:     (params)   => api.get('/calendar/posts/',               { params }),
  getPost:      (id)       => api.get(`/calendar/posts/${id}/`),
  createPost:   (data)     => api.post('/calendar/posts/', data),
  updatePost:   (id, data) => api.put(`/calendar/posts/${id}/`, data),
  deletePost:   (id)       => api.delete(`/calendar/posts/${id}/`),
  reschedule:   (id, data) => api.post(`/calendar/posts/${id}/reschedule/`, data),
  getUpcoming:  (params)   => api.get('/calendar/posts/upcoming/',      { params }),
  getStats:     (params)   => api.get('/calendar/posts/stats/',         { params }),
  getNotes:     (params)   => api.get('/calendar/notes/',               { params }),
  createNote:   (data)     => api.post('/calendar/notes/', data),
  updateNote:   (id, data) => api.put(`/calendar/notes/${id}/`, data),
  deleteNote:   (id)       => api.delete(`/calendar/notes/${id}/`),
  getSchedule:  (params)   => api.get('/calendar/schedule/',            { params }),
  saveSchedule: (data)     => api.post('/calendar/schedule/', data),
  suggestTimes: (params)   => api.get('/calendar/suggest-times/',       { params }),
};

export const videoAPI = {
  upload:           (formData) => api.post('/video/upload/', formData,
                                  { headers: { 'Content-Type': 'multipart/form-data' } }),
  importFromUrl:    (data)     => api.post('/video/upload/', data),
  trim:             (data)     => api.post('/video/trim/', data),
  resize:           (data)     => api.post('/video/resize/', data),
  extractThumbnail: (data)     => api.post('/video/extract-thumbnail/', data),
  addCaptions:      (data)     => api.post('/video/add-captions/', data),
  youtubeUpload:    (data)     => api.post('/video/youtube-upload/', data),
};

export const automationsAPI = {
  list:      (params)   => api.get('/automations/', { params }),
  get:       (id)       => api.get(`/automations/${id}/`),
  create:    (data)     => api.post('/automations/', data),
  update:    (id, data) => api.patch(`/automations/${id}/`, data),
  delete:    (id)       => api.delete(`/automations/${id}/`),
  toggle:    (id)       => api.post(`/automations/${id}/toggle/`),
  runNow:    (id, data) => api.post(`/automations/${id}/run_now/`, data),
  templates: ()         => api.get('/automations/templates/'),
};

export const composerAPI = {
  posts: {
    list:        (params)   => api.get('/composer/posts/', { params }),
    get:         (id)       => api.get(`/composer/posts/${id}/`),
    create:      (data)     => api.post('/composer/posts/', data),
    update:      (id, data) => api.patch(`/composer/posts/${id}/`, data),
    delete:      (id)       => api.delete(`/composer/posts/${id}/`),
    publishNow:  (id)       => api.post(`/composer/posts/${id}/publish_now/`),
    schedule:    (id, scheduled_at) => api.post(`/composer/posts/${id}/schedule/`, { scheduled_at }),
    cancel:      (id)       => api.post(`/composer/posts/${id}/cancel/`),
    duplicate:   (id)       => api.post(`/composer/posts/${id}/duplicate/`),
    approve:     (id)       => api.post(`/composer/posts/${id}/approve/`),
    addToQueue:  (id, queue_id) => api.post(`/composer/posts/${id}/add_to_queue/`, { queue_id }),
    preview:     (id)       => api.get(`/composer/posts/${id}/preview/`),
  },
  media: {
    list:        (params)   => api.get('/composer/media/', { params }),
    get:         (id)       => api.get(`/composer/media/${id}/`),
    delete:      (id)       => api.delete(`/composer/media/${id}/`),
    update:      (id, data) => api.patch(`/composer/media/${id}/`, data),
    upload:      (formData) => api.post('/composer/media/', formData,
                              { headers: { 'Content-Type': 'multipart/form-data' } }),
    bulkUpload:  (formData) => api.post('/composer/media/bulk_upload/', formData,
                              { headers: { 'Content-Type': 'multipart/form-data' } }),
  },
  queues: {
    list:        (params)   => api.get('/composer/queues/', { params }),
    get:         (id)       => api.get(`/composer/queues/${id}/`),
    create:      (data)     => api.post('/composer/queues/', data),
    update:      (id, data) => api.patch(`/composer/queues/${id}/`, data),
    delete:      (id)       => api.delete(`/composer/queues/${id}/`),
    addItems:    (id, items) => api.post(`/composer/queues/${id}/add_items/`, { items }),
    reorder:     (id, order) => api.post(`/composer/queues/${id}/reorder/`, { order }),
    pause:       (id)       => api.post(`/composer/queues/${id}/pause/`),
    resume:      (id)       => api.post(`/composer/queues/${id}/resume/`),
  },
  preflight:     (data)     => api.post('/composer/preflight/', data),
};

export const socialAccountsAPI = {
  list: (params) => api.get('/social-accounts/', { params }),
};
