/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useEffect, useState } from 'react';
import platformCapabilities from './platformCapabilities.json';

export const PLATFORMS = {
  facebook: {
    label: 'Facebook',
    shortLabel: 'Facebook',
    color: '#1877F2',
    bg:    '#EBF3FF',
    metrics: ['impressions','reach','clicks','likes','followers','profile_views'],
  },
  instagram: {
    label: 'Instagram',
    shortLabel: 'Instagram',
    color: '#E1306C',
    bg:    '#FDE8F0',
    metrics: ['impressions','reach','clicks','likes','saves','video_views','followers'],
  },
  linkedin: {
    label: 'LinkedIn',
    shortLabel: 'LinkedIn',
    color: '#0A66C2',
    bg:    '#E8F0F9',
    metrics: ['impressions','clicks','followers','engagement_rate'],
  },
  youtube: {
    label: 'YouTube',
    shortLabel: 'YouTube',
    color: '#FF0000',
    bg:    '#FFE9E9',
    metrics: ['video_views','impressions','likes','comments','shares','followers','ctr'],
  },
  google_my_business: {
    label: 'Google My Business',
    shortLabel: 'GMB',
    color: '#34A853',
    bg:    '#E6F4EA',
    metrics: ['impressions','website_clicks','phone_calls','direction_requests'],
  },
  telegram: {
    label: 'Telegram',
    shortLabel: 'Telegram',
    color: '#229ED9',
    bg:    '#E7F5FC',
    metrics: [],
  },
  bale: {
    label: 'Bale',
    shortLabel: 'Bale',
    color: '#00A884',
    bg:    '#E7F8F3',
    metrics: [],
  },
  eitaa: {
    label: 'Eitaa', shortLabel: 'Eitaa', color: '#F58220', bg: '#FFF3E8', metrics: [],
  },
  aparat: {
    label: 'Aparat', shortLabel: 'Aparat', color: '#ED145B', bg: '#FDE8EF', metrics: [],
  },
};

export const PLATFORM_LIST = Object.keys(PLATFORMS);
export const PLATFORM_CAPABILITIES = platformCapabilities;
export const ACTIVE_CAPABILITY_STATUSES = ['supported', 'beta'];

export function capabilityStatus(platform, capability) {
  return PLATFORM_CAPABILITIES[platform]?.capabilities?.[capability] || 'not_available';
}

export function hasCapability(platform, capability) {
  return ACTIVE_CAPABILITY_STATUSES.includes(capabilityStatus(platform, capability));
}

const FALLBACK_CATEGORIES = [
  { key: 'messaging', order: 10, title_fa: 'پیام‌رسان‌ها', title_en: 'Messaging' },
  { key: 'video', order: 20, title_fa: 'ویدئومحور', title_en: 'Video' },
  { key: 'social_content', order: 30, title_fa: 'شبکه‌های اجتماعی محتوایی', title_en: 'Content social networks' },
  { key: 'location', order: 40, title_fa: 'مکان‌محور', title_en: 'Location based' },
  { key: 'general_social', order: 50, title_fa: 'شبکه‌های اجتماعی عمومی', title_en: 'General social networks' },
  { key: 'professional', order: 60, title_fa: 'شبکه‌های حرفه‌ای', title_en: 'Professional networks' },
];

const FALLBACK_PLATFORM_METADATA = [
  ['telegram', 'تلگرام', 'Telegram', 'messaging', 'bot_token', 'active'],
  ['bale', 'بله', 'Bale', 'messaging', 'bot_token', 'active'],
  ['eitaa', 'ایتا', 'Eitaa', 'messaging', 'bot_token', 'experimental'],
  ['youtube', 'یوتیوب', 'YouTube', 'video', 'oauth2', 'active'],
  ['aparat', 'آپارات', 'Aparat', 'video', 'api_key', 'experimental'],
  ['instagram', 'اینستاگرام', 'Instagram', 'social_content', 'oauth2', 'active'],
  ['tiktok', 'تیک‌تاک', 'TikTok', 'social_content', 'oauth2', 'experimental'],
  ['google_my_business', 'کسب‌وکار گوگل', 'Google Business Profile', 'location', 'oauth2', 'active'],
  ['neshan', 'نشان', 'Neshan', 'location', 'api_key', 'experimental'],
  ['facebook', 'فیس‌بوک', 'Facebook', 'general_social', 'oauth2', 'active'],
  ['linkedin', 'لینکدین', 'LinkedIn', 'professional', 'oauth2', 'active'],
].map(([key, fa, en, category, auth_type, rollout_status], index) => ({
  key,
  titles: { fa, en },
  category,
  order: (index + 1) * 10,
  auth_type,
  rollout_status,
  capabilities: platformCapabilities[key]?.capabilities || {},
}));

const STORAGE_KEY = 'platform-registry-v2';
const listeners = new Set();

function fallbackRegistry() {
  return {
    categories: FALLBACK_CATEGORIES,
    platforms: FALLBACK_PLATFORM_METADATA,
  };
}

function readCachedRegistry() {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(parsed?.categories) || !Array.isArray(parsed?.platforms)) return null;
    return parsed;
  } catch {
    return null;
  }
}

let runtimeRegistry = readCachedRegistry() || fallbackRegistry();
let registryRequest = null;

function publishRegistry(next) {
  runtimeRegistry = next;
  listeners.forEach(listener => listener(next));
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage can be disabled; the in-memory registry remains authoritative.
    }
  }
}

export function getPlatformRegistry() {
  return runtimeRegistry;
}

export function loadPlatformRegistry() {
  if (registryRequest) return registryRequest;
  const apiBase = (process.env.REACT_APP_API_URL || 'http://localhost:8000/api').replace(/\/$/, '');
  registryRequest = fetch(`${apiBase}/platforms/`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })
    .then(response => {
      if (!response.ok) throw new Error(`Platform registry request failed: ${response.status}`);
      return response.json();
    })
    .then(data => {
      if (!Array.isArray(data?.categories) || !Array.isArray(data?.platforms)) {
        throw new Error('Invalid platform registry payload');
      }
      publishRegistry(data);
      return data;
    })
    .catch(() => runtimeRegistry)
    .finally(() => {
      registryRequest = null;
    });
  return registryRequest;
}

function enabledStatus(value) {
  return ACTIVE_CAPABILITY_STATUSES.includes(value);
}

export function platformHasCapability(metadata, capability) {
  const capabilities = metadata?.capabilities || {};
  if (capability === 'connect') return enabledStatus(capabilities.connection);
  if (capability === 'publish') {
    return ['publish_text', 'publish_image', 'publish_video']
      .some(key => enabledStatus(capabilities[key]));
  }
  return enabledStatus(capabilities[capability]);
}

export function usePlatformRegistry(capability = null) {
  const [value, setValue] = useState(runtimeRegistry);

  useEffect(() => {
    listeners.add(setValue);
    loadPlatformRegistry();
    return () => listeners.delete(setValue);
  }, []);

  const platforms = capability
    ? value.platforms.filter(item => platformHasCapability(item, capability))
    : value.platforms;

  return { categories: value.categories, platforms };
}

export const METRIC_LABELS = {
  impressions:        'Impressions',
  reach:              'Reach',
  clicks:             'Clicks',
  likes:              'Likes',
  comments:           'Comments',
  shares:             'Shares',
  saves:              'Saves',
  video_views:        'Video Views',
  followers:          'Followers',
  profile_views:      'Profile Views',
  website_clicks:     'Website Clicks',
  phone_calls:        'Phone Calls',
  direction_requests: 'Direction Requests',
  engagement_rate:    'Engagement Rate',
  ctr:                'CTR',
  sessions:           'Sessions',
  users:              'Users',
  page_views:         'Page Views',
};

export function fmt(num) {
  if (!num) return '0';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000)     return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

export function getPlatformLabel(platform, { short = false } = {}) {
  const meta = PLATFORMS[platform];
  if (!meta) return platform;
  return short ? meta.shortLabel || meta.label : meta.label;
}
