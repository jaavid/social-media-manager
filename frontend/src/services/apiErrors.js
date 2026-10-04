const HTTP_ERROR_CODES = {
  400: 'connectionFailed',
  401: 'invalidCredentials',
  403: 'permissionDenied',
  404: 'notFound',
  429: 'rateLimited',
};

const BACKEND_ERROR_CODES = {
  invalid_credentials: 'invalidCredentials',
  token_expired: 'invalidCredentials',
  permission_denied: 'permissionDenied',
  forbidden: 'permissionDenied',
  not_found: 'notFound',
  rate_limited: 'rateLimited',
  timeout: 'network',
  network: 'network',
};

/** Return a stable translation key without surfacing backend prose to the UI. */
export function getApiErrorCode(error, fallback = 'unknown') {
  if (!error?.response) return 'network';
  const supplied = error.response.data?.code || error.response.data?.error_code;
  if (typeof supplied === 'string') {
    const normalized = BACKEND_ERROR_CODES[supplied];
    if (normalized) return normalized;
  }
  return HTTP_ERROR_CODES[error.response.status] || fallback;
}
