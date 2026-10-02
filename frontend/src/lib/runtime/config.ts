/** Vite maps these public keys today; a Next host can supply the same contract. */
export function apiBaseUrl(): string {
  return (process.env.REACT_APP_API_URL || 'http://localhost:8000/api').replace(
    /\/$/,
    '',
  );
}
export function websocketUrl(): string | undefined {
  return process.env.REACT_APP_WS_URL;
}
export function analyticsConfig() {
  return {
    domain: process.env.REACT_APP_PLAUSIBLE_DOMAIN,
    host: process.env.REACT_APP_PLAUSIBLE_HOST,
  };
}
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}
