/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { api } from '@/services/http/client';

export const botChannelsAPI = {
  status: (clientId) => api.get(`/bot-channels/${clientId}/status/`),
  connect: (clientId, platform, data) => api.post(
    `/bot-channels/${clientId}/${platform}/`, data
  ),
  disconnect: (clientId, platform) => api.delete(
    `/bot-channels/${clientId}/${platform}/`
  ),
};
