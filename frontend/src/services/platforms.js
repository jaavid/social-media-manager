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
import { oauthAPI } from './api';
import { botChannelsAPI } from './botChannels';

export const PLATFORMS = {
  facebook: {
    label: 'Facebook', shortLabel: 'Facebook', color: '#1877F2', bg: '#EBF3FF', maxText: 63206,
    types: ['text','image','video','carousel','reel'],
    metrics: ['impressions','reach','clicks','likes','followers','profile_views'],
  },
  instagram: {
    label: 'Instagram', shortLabel: 'Instagram', color: '#E1306C', bg: '#FDE8F0', maxText: 2200,
    types: ['image','video','carousel','reel','story'],
    metrics: ['impressions','reach','clicks','likes','saves','video_views','followers'],
  },
  linkedin: {
    label: 'LinkedIn', shortLabel: 'LinkedIn', color: '#0A66C2', bg: '#E8F0F9', maxText: 3000,
    types: ['text','image','video','carousel'],
    metrics: ['impressions','clicks','followers','engagement_rate'],
  },
  youtube: {
    label: 'YouTube', shortLabel: 'YouTube', color: '#FF0000', bg: '#FFE9E9', maxText: 5000,
    types: ['video','reel'],
    metrics: ['video_views','impressions','likes','comments','shares','followers','ctr'],
  },
  google_my_business: {
    label: 'Google Business Profile', shortLabel: 'GBP', color: '#34A853', bg: '#E6F4EA', maxText: 1500,
    types: ['text','image'],
    metrics: ['impressions','website_clicks','phone_calls','direction_requests'],
  },
  telegram: {
    label: 'Telegram', shortLabel: 'Telegram', color: '#229ED9', bg: '#E7F5FC', maxText: 4096,
    types: ['text','image','video','carousel'], metrics: [],
  },
  bale: {
    label: 'Bale', shortLabel: 'Bale', color: '#00A884', bg: '#E7F8F3', maxText: 4096,
    types: ['text','image','video','carousel'], metrics: [],
  },
  eitaa: {
    label: 'Eitaa', shortLabel: 'Eitaa', color: '#F58220', bg: '#FFF3E8', maxText: 4096,
    types: ['text','image','video'], metrics: [],
  },
  aparat: {
    label: 'Aparat', shortLabel: 'Aparat', color: '#ED145B', bg: '#FDE8EF', maxText: 5000,
    types: ['video'], metrics: [],
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
const OAUTH_PROVIDER = {
  facebook: 'facebook',
  instagram: 'facebook',
  youtube: 'google',
  google_my_business: 'google',
  linkedin: 'linkedin',
};
const MEDIA_CAPABILITY = {
  text: 'publish_text',
  image: 'publish_image',
  carousel: 'publish_image',
  story: 'publish_image',
  video: 'publish_video',
  reel: 'publish_video',
  short: 'publish_video',
  article: 'publish_text',
};

function fallbackRegistry() {
  return { categories: FALLBACK_CATEGORIES, platforms: FALLBACK_PLATFORM_METADATA };
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

export function getPlatformMetadataRegistry() {
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
  const capabilities = metadata?.capabilityStatuses || metadata?.capabilities || {};
  if (Array.isArray(capabilities)) return false;
  if (capability === 'connect') return enabledStatus(capabilities.connection);
  if (capability === 'publish') {
    return ['publish_text', 'publish_image', 'publish_video']
      .some(key => enabledStatus(capabilities[key]));
  }
  return enabledStatus(capabilities[capability]);
}

function authTypeFor(value) {
  if (value === 'oauth2') return 'oauth';
  if (value === 'api_key') return 'api_credentials';
  return value || 'unknown';
}

function connectionSchema(metadata) {
  const authType = authTypeFor(metadata.auth_type);
  if (authType === 'bot_token') {
    return {
      help: `Add the ${metadata.titles?.en || metadata.key} bot token and destination channel/chat ID.`,
      fields: [
        { key: 'token', label: 'Bot token', placeholder: 'Bot token', required: true, type: 'password', autoComplete: 'off' },
        { key: 'destination_id', label: 'Channel / chat ID', placeholder: '@channel or numeric chat_id', required: true },
      ],
    };
  }
  if (authType === 'api_credentials') {
    return {
      help: 'This provider uses API credentials. Connection remains disabled until backend support is marked supported or beta.',
      fields: [
        { key: 'api_key', label: 'API key', placeholder: 'API key', required: true, type: 'password', autoComplete: 'off' },
      ],
    };
  }
  return {
    oauthProvider: OAUTH_PROVIDER[metadata.key] || null,
    help: 'Authorize this account with the provider.',
    fields: [],
  };
}

function uiPlatform(metadata) {
  const legacy = PLATFORMS[metadata.key] || {};
  const declaredTypes = legacy.types || Object.keys(MEDIA_CAPABILITY);
  const supportedTypes = declaredTypes.filter(type => {
    const capability = MEDIA_CAPABILITY[type];
    return capability && platformHasCapability(metadata, capability);
  });
  const label = metadata.titles?.en || legacy.label || metadata.key;
  return {
    ...metadata,
    labels: {
      default: label,
      short: legacy.shortLabel || label,
      fa: metadata.titles?.fa || label,
      en: label,
    },
    authType: authTypeFor(metadata.auth_type),
    capabilityStatuses: metadata.capabilities || {},
    capabilities: supportedTypes,
    color: legacy.color || '#64748B',
    bg: legacy.bg || '#F1F5F9',
    metrics: legacy.metrics || [],
    maxText: legacy.maxText || 5000,
    connection: connectionSchema(metadata),
  };
}

function categoryOrderMap(categories = runtimeRegistry.categories) {
  return Object.fromEntries(categories.map(item => [item.key, item.order ?? 999]));
}

export function getPlatformRegistry() {
  const order = categoryOrderMap();
  return runtimeRegistry.platforms
    .map(uiPlatform)
    .sort((a, b) => (order[a.category] ?? 999) - (order[b.category] ?? 999) || (a.order ?? 999) - (b.order ?? 999) || a.key.localeCompare(b.key));
}

export function hydratePlatformRegistry(payload = []) {
  if (Array.isArray(payload)) {
    publishRegistry({ ...runtimeRegistry, platforms: payload });
  } else if (Array.isArray(payload?.categories) && Array.isArray(payload?.platforms)) {
    publishRegistry(payload);
  }
  return getPlatformRegistry();
}

function fixtureCapabilities(types = []) {
  const values = {
    connection: 'supported', disconnect: 'supported', scheduling: 'supported',
    publish_text: 'not_available', publish_image: 'not_available', publish_video: 'not_available',
  };
  for (const type of types) {
    const capability = MEDIA_CAPABILITY[type];
    if (capability) values[capability] = 'supported';
  }
  return values;
}

export function registerPlatform(platform) {
  const previousRegistry = runtimeRegistry;
  const previousLegacy = PLATFORMS[platform.key];
  const hadLegacy = Object.prototype.hasOwnProperty.call(PLATFORMS, platform.key);
  const authType = platform.authType || authTypeFor(platform.auth_type);
  const raw = platform.titles ? platform : {
    key: platform.key,
    titles: {
      fa: platform.labels?.fa || platform.labels?.default || platform.key,
      en: platform.labels?.en || platform.labels?.default || platform.key,
    },
    category: platform.category || 'general_social',
    order: platform.order ?? 999,
    auth_type: authType === 'oauth' ? 'oauth2' : authType === 'api_credentials' ? 'api_key' : authType,
    rollout_status: platform.rollout_status || 'experimental',
    capabilities: Array.isArray(platform.capabilities)
      ? fixtureCapabilities(platform.capabilities)
      : (platform.capabilities || {}),
  };

  PLATFORMS[platform.key] = {
    ...(previousLegacy || {}),
    label: platform.labels?.default || raw.titles?.en || platform.key,
    shortLabel: platform.labels?.short || platform.labels?.default || raw.titles?.en || platform.key,
    color: platform.color || previousLegacy?.color || '#64748B',
    bg: platform.bg || previousLegacy?.bg || '#F1F5F9',
    maxText: platform.maxText || previousLegacy?.maxText || 5000,
    types: Array.isArray(platform.capabilities) ? platform.capabilities : (previousLegacy?.types || []),
    metrics: platform.metrics || previousLegacy?.metrics || [],
  };
  if (!PLATFORM_LIST.includes(platform.key)) PLATFORM_LIST.push(platform.key);

  const categories = previousRegistry.categories.some(item => item.key === raw.category)
    ? previousRegistry.categories
    : [...previousRegistry.categories, {
        key: raw.category,
        order: platform.categoryOrder ?? 999,
        title_fa: platform.categoryTitleFa || raw.category,
        title_en: platform.categoryTitle || raw.category,
      }];
  publishRegistry({
    categories,
    platforms: [...previousRegistry.platforms.filter(item => item.key !== raw.key), raw],
  });

  return () => {
    if (hadLegacy) PLATFORMS[platform.key] = previousLegacy;
    else delete PLATFORMS[platform.key];
    const index = PLATFORM_LIST.indexOf(platform.key);
    if (!hadLegacy && index >= 0) PLATFORM_LIST.splice(index, 1);
    publishRegistry(previousRegistry);
  };
}

export function supportsMedia(platform, mediaType) {
  return Boolean(platform?.capabilities?.includes(mediaType));
}

export function connectedPlatforms(metadata, status, mediaType) {
  return (metadata || []).filter(item =>
    status?.[item.key]?.status === 'active' && (!mediaType || supportsMedia(item, mediaType))
  );
}

export async function getConnectionStatus(clientId) {
  if (!clientId) return {};
  const settled = await Promise.allSettled([
    oauthAPI.status(clientId),
    botChannelsAPI.status(clientId),
  ]);
  return settled.reduce((combined, result) => (
    result.status === 'fulfilled' ? { ...combined, ...(result.value.data || {}) } : combined
  ), {});
}

export function getOAuthUrl(platform, clientId) {
  switch (platform?.connection?.oauthProvider) {
    case 'facebook': return oauthAPI.facebookUrl(clientId);
    case 'google': return oauthAPI.googleUrl(clientId, platform.key);
    case 'linkedin': return oauthAPI.linkedinUrl(clientId);
    default: return null;
  }
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

export function usePlatformUiRegistry(capability = null) {
  const { categories, platforms } = usePlatformRegistry(capability);
  const order = categoryOrderMap(categories);
  return {
    categories,
    platforms: platforms
      .map(uiPlatform)
      .sort((a, b) => (order[a.category] ?? 999) - (order[b.category] ?? 999) || (a.order ?? 999) - (b.order ?? 999) || a.key.localeCompare(b.key)),
  };
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
  if (meta) return short ? meta.shortLabel || meta.label : meta.label;
  const runtime = runtimeRegistry.platforms.find(item => item.key === platform);
  if (!runtime) return platform;
  return runtime.titles?.en || platform;
}
