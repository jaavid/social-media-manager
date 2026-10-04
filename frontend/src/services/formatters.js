/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { getLanguage } from '../i18n';
export function formatTimeAgo(dateStr, options = {}) {
  const { includeSeconds = true, empty = '—', language = getLanguage(), now = Date.now() } = options;
  const timestamp = new Date(dateStr).getTime();
  if (!dateStr || Number.isNaN(timestamp)) return empty;
  const seconds = Math.round((timestamp - now) / 1000);
  const [unit, divisor] = Math.abs(seconds) < 60 && includeSeconds ? ['second', 1]
    : Math.abs(seconds) < 3600 ? ['minute', 60]
    : Math.abs(seconds) < 86400 ? ['hour', 3600] : ['day', 86400];
  return new Intl.RelativeTimeFormat(language === 'fa' ? 'fa-IR' : 'en-US', { numeric: 'auto' })
    .format(Math.trunc(seconds / divisor), unit);
}
