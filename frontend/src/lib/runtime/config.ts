/** Explicit public configuration shared by browser features and the Next host. */
export function apiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || '/api').replace(
    /\/$/,
    '',
  );
}
export function websocketUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_WS_URL;
}
export function analyticsConfig() {
  return {
    domain: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN,
    host: process.env.NEXT_PUBLIC_PLAUSIBLE_HOST,
  };
}
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}
