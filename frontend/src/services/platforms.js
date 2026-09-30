/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
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
