import api from './api';

export const egressAPI = {
  connectivity: (service) => api.get(
    '/egress/connectivity/',
    { params: service ? { service } : undefined },
  ),
  oauthReadiness: () => api.get(
    '/egress/connectivity/',
    { params: { mode: 'oauth' } },
  ),
};
