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
  return target.pathname + target.search + target.hash;
}
export function routeIsActive(href: string, pathname: string, end = false): boolean {
  const target = href.split(/[?#]/)[0].replace(/\/$/, '') || '/';
  const current = pathname.replace(/\/$/, '') || '/';
  return current === target || (!end && target !== '/' && current.startsWith(`${target}/`));
}
