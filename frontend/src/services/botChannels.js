import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

function headers() {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const botChannelsAPI = {
  status: (clientId) => axios.get(`${API_BASE}/bot-channels/${clientId}/status/`, { headers: headers() }),
  connect: (clientId, platform, data) => axios.post(
    `${API_BASE}/bot-channels/${clientId}/${platform}/`, data, { headers: headers() }
  ),
  disconnect: (clientId, platform) => axios.delete(
    `${API_BASE}/bot-channels/${clientId}/${platform}/`, { headers: headers() }
  ),
};
