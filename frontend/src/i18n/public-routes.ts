/** Account shells retain their preference; all other pages (including 404s) are public. */
const privateRoots = new Set(['dashboard', 'admin', 'agency', 'u', 'pending', 'api', '_next']);
export function isPublicRoute(pathname: string): boolean {
  return !privateRoots.has(pathname.split('/')[1] || '');
}
