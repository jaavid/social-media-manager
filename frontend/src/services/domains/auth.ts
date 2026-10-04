import type { AxiosRequestConfig } from 'axios';
import { api } from '../http/client';
export interface MfaChallenge { mfa_required: true; mfa_token: 'session' }
export interface BrowserLogin { session: true }
export const authAPI = {
  login: (email: string, password: string, termsAccepted = false) => api.post<BrowserLogin | MfaChallenge>('/auth/login/', {
    username: email, password, terms_accepted: termsAccepted,
  }),
  me: (options?: AxiosRequestConfig) => api.get<unknown>('/auth/me/', options),
  signup: (data: Record<string, unknown>) => api.post('/auth/signup/', data),
  verifyEmail: (token: string) => api.get('/auth/verify-email/', { params: { token } }),
  resendVerification: (email: string) => api.post('/auth/resend-verification/', { email }),
  passwordResetRequest: (email: string) => api.post('/auth/password-reset/', { email }),
  passwordResetConfirm: (token: string, password: string) => api.post('/auth/password-reset/confirm/', { token, password }),
};
