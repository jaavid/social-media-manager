import type { InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';
import { apiBaseUrl } from '../../lib/runtime/config';
import { ensureCsrf } from '../../lib/auth/browser';
import { workspaceRequest } from '../workspaceVocabulary';
import { invalidateSession, sessionEpoch } from '../../lib/auth/session';

export const api = axios.create({
  baseURL: apiBaseUrl(), timeout: 15000, withCredentials: true,
  headers: { 'Content-Type': 'application/json', 'X-Browser-Session': '1' },
});
type SessionRequest = InternalAxiosRequestConfig & { sessionEpoch?: string };
api.interceptors.request.use(async config => {
  (config as SessionRequest).sessionEpoch = sessionEpoch();
  config.params = workspaceRequest(config.params);
  config.data = workspaceRequest(config.data);
  if (!['get', 'head', 'options'].includes(config.method || 'get')) {
    config.headers.set('X-CSRFToken', await ensureCsrf());
  }
  return config;
});
api.interceptors.response.use(response => response, error => {
  // Login errors belong to the form. A rejected existing session is terminal.
  // There is no automatic replay of mutations or navigation in the transport.
  if (error.response?.status === 401 && error.config?.sessionEpoch === sessionEpoch() && !/\/auth\/login\/|\/mfa\/login\//.test(error.config?.url || '')) {
    invalidateSession();
  }
  return Promise.reject(error);
});
export const publicApi = axios.create({
  baseURL: apiBaseUrl(), timeout: 15000, headers: { 'Content-Type': 'application/json' },
});
