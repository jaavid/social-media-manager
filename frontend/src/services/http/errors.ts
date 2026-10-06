import axios from 'axios';
export interface ApiError {
  kind: 'authentication' | 'permission' | 'rate_limit' | 'unavailable' | 'cancelled' | 'request';
  status?: number;
  code?: string;
  retryAfter?: string;
  referenceId?: string;
  detail: string;
}
export function apiError(error: unknown): ApiError {
  if (axios.isCancel(error)) return { kind: 'cancelled', detail: 'Request cancelled' };
  if (!axios.isAxiosError(error)) return { kind: 'request', detail: error instanceof Error ? error.message : 'Request failed' };
  const status = error.response?.status;
  const data: unknown = error.response?.data;
  const envelope = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  const reference = error.response?.headers?.['x-request-id'];
  return {
    referenceId: typeof reference === 'string' && /^(?:[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i.test(reference) ? reference : undefined,
    kind: status === 401 ? 'authentication' : status === 403 ? 'permission' : status === 429 ? 'rate_limit'
      : !status || status >= 500 ? 'unavailable' : 'request',
    status, code: typeof envelope.code === 'string' ? envelope.code : undefined,
    retryAfter: error.response?.headers?.['retry-after'],
    detail: typeof envelope.detail === 'string' ? envelope.detail : error.message,
  };
}
