export function canonicalWorkspacePath(path: string): string {
  return path.replace(/^\/dashboard\/analytics\/(dashboard|analytics)(?=[/?#]|$)/, (_, page) => page === 'dashboard' ? '/dashboard' : '/dashboard/analytics')
    .replace(/^\/dashboard\/analytics\/(?!(?:dashboard|analytics)(?:[/?#]|$))/, '/dashboard/');
}
export interface AppDestination { pathname?: string; search?: string; hash?: string }
export function destinationHref(to: string | AppDestination, pathname: string, search = ''): string {
  const raw = typeof to === 'string'
    ? to
    : `${to.pathname ?? pathname}${to.search ?? ''}${to.hash ?? ''}`;
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(raw)) throw new Error('App navigation requires an internal URL');
  if (!raw) return pathname + search;
  if (raw.startsWith('#')) return pathname + search + raw;
  if (raw.startsWith('?')) return pathname + raw;
  const target = new URL(raw, `http://app.internal${pathname.replace(/\/$/, '')}/`);
  return canonicalWorkspacePath(target.pathname) + target.search + target.hash;
}
export function routeIsActive(href: string, pathname: string, end = false): boolean {
  const target = canonicalWorkspacePath(href).split(/[?#]/)[0].replace(/\/$/, '') || '/';
  const current = canonicalWorkspacePath(pathname).replace(/\/$/, '') || '/';
  return current === target || (!end && target !== '/' && current.startsWith(`${target}/`));
}
