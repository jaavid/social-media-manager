/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { api } from '../http/client';

export const captionAPI = {
  generate:   (data)     => api.post('/ai/caption/', data),
  getHistory: (clientId) => api.get('/ai/caption/', { params: { client_id: clientId } }),
};

export const postIdeasAPI = {
  generate:      (data)              => api.post('/ai/post-ideas/', data),
  getHistory:    (params)            => api.get('/ai/post-ideas/', { params }),
  approveAll:    (id)                => api.post(`/ai/post-ideas/${id}/approve-all/`),
  addToCalendar: (id, data)          => api.post(`/ai/post-ideas/${id}/add-to-calendar/`, data),
  updateIdea:    (id, ideaId, data)  => api.patch(`/ai/post-ideas/${id}/ideas/${ideaId}/`, data),
};

export const hashtagAPI = {
  generate:    (data)   => api.post('/ai/hashtags/', data),
  getHistory:  (params) => api.get('/ai/hashtags/', { params }),
  saveSet:     (id, data) => api.post(`/ai/hashtags/${id}/save-set/`, data),
  getSavedSets:(params) => api.get('/ai/hashtags/saved-sets/', { params }),
};

export const aiAPI = {
  composePost:        (data) => api.post('/ai/compose-post/', data),
  suggestHashtags:    (data) => api.post('/ai/suggest-hashtags/', data),
  bestTimeToPost:     (data) => api.post('/ai/best-time-to-post/', data),
  suggestReply:       (data) => api.post('/ai/suggest-reply/', data),
  rewrite:            (data) => api.post('/ai/rewrite/', data),
  translate:          (data) => api.post('/ai/translate/', data),
  generateImageCaption: (data) => api.post('/ai/generate-image-caption/', data),
  contentCalendar:    (data) => api.post('/ai/content-calendar/', data),
  trainBrandVoice:    (data) => api.post('/ai/train-brand-voice/', data),
  getBrandVoice:      ()     => api.get('/ai/brand-voice/'),
};

export const aiV2API = {
  compose:         (data) => api.post('/ai/v2/compose/',          data),
  rewrite:         (data) => api.post('/ai/v2/rewrite/',          data),
  extend:          (data) => api.post('/ai/v2/extend/',           data),
  summarize:       (data) => api.post('/ai/v2/summarize/',        data),
  hashtagResearch: (data) => api.post('/ai/v2/hashtag-research/', data),
  optimalTime:     (data) => api.post('/ai/v2/optimal-time/',     data),
  titleGenerator:  (data) => api.post('/ai/v2/title-generator/',  data),
  postImprove:     (data) => api.post('/ai/v2/post-improve/',     data),

  describeImage:        (data) => api.post('/ai/v2/describe-image/',          data),
  imageToPost:          (data) => api.post('/ai/v2/image-to-post/',           data),
  altText:              (data) => api.post('/ai/v2/alt-text/',                data),
  brandComplianceCheck: (data) => api.post('/ai/v2/brand-compliance-check/',  data),

  videoScript:    (data) => api.post('/ai/v2/video-script/',    data),
  videoCaptions:  (data) => api.post('/ai/v2/video-captions/',  data),
  videoChapters:  (data) => api.post('/ai/v2/video-chapters/',  data),
  videoSummary:   (data) => api.post('/ai/v2/video-summary/',   data),

  replySuggest:      (data) => api.post('/ai/v2/reply-suggest/',     data),
  autoReply:         (data) => api.post('/ai/v2/auto-reply/',        data),
  sentimentAnalyze:  (data) => api.post('/ai/v2/sentiment-analyze/', data),
  intentClassify:    (data) => api.post('/ai/v2/intent-classify/',   data),
  reviewReply:       (data) => api.post('/ai/v2/review-reply/',      data),
  crisisDetect:      (data) => api.post('/ai/v2/crisis-detect/',     data),
  spamFilter:        (data) => api.post('/ai/v2/spam-filter/',       data),

  brandVoiceGet:    (params) => api.get('/ai/v2/brand-voice/',         { params }),
  brandVoiceTrain:  (data)   => api.post('/ai/v2/brand-voice/train/',  data),
  brandVoiceTest:   (data)   => api.post('/ai/v2/brand-voice/test/',   data),

  chat:                  (data)   => api.post('/ai/v2/chat/', data),
  chatListConversations: (params) => api.get('/ai/v2/chat/conversations/', { params }),
  chatGetConversation:   (id)     => api.get(`/ai/v2/chat/conversations/${id}/`),
  chatPatchConversation: (id, d)  => api.patch(`/ai/v2/chat/conversations/${id}/`, d),
  chatDeleteConversation:(id)     => api.delete(`/ai/v2/chat/conversations/${id}/`),

  insightGenerate:    (data)   => api.post('/ai/v2/insight-generate/',  data),
  insightsList:       (params) => api.get('/ai/v2/insights/',           { params }),
  insightUpdate:      (id, d)  => api.patch(`/ai/v2/insights/${id}/`,    d),
  anomalyDetect:      (data)   => api.post('/ai/v2/anomaly-detect/',    data),
  trendAnalysis:      (data)   => api.post('/ai/v2/trend-analysis/',    data),
  forecast:           (data)   => api.post('/ai/v2/forecast/',          data),
  competitorInsight:  (data)   => api.post('/ai/v2/competitor-insight/', data),
  audienceProfile:    (data)   => api.post('/ai/v2/audience-profile/',  data),
  todayBriefing:      (params) => api.get('/ai/v2/today-briefing/',     { params }),

  reportWrite:        (data) => api.post('/ai/v2/report-write/',   data),
  reportNarrate:      (data) => api.post('/ai/v2/report-narrate/', data),

  usageOverview:   (params) => api.get('/ai/v2/usage/',           { params }),
  usageByWorkspace:   (params) => api.get('/ai/v2/usage/by-workspace/', { params }),
  usageByUser:     (params) => api.get('/ai/v2/usage/by-user/',   { params }),
  usageBudget:     ()       => api.get('/ai/v2/usage/budget/'),
  usageQuota:      (params) => api.get('/ai/v2/usage/quota/',     { params }),
  audit:           (params) => api.get('/ai/v2/audit/',           { params }),
};

// Retained Client SDK compatibility; new code uses workspace names.
aiV2API.usageByClient = aiV2API.usageByWorkspace;
