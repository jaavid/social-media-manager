'use client';
/** The only framework-specific navigation boundary used by shared features. */
import NextLink from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createContext, forwardRef, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { AnchorHTMLAttributes, CSSProperties, PropsWithChildren, ReactNode } from 'react';
import { destinationHref, routeIsActive } from '../lib/runtime/navigation';
import type { AppDestination } from '../lib/runtime/navigation';

type Destination = string | AppDestination;
type NavigationOptions = { replace?: boolean; state?: unknown; preventScrollReset?: boolean; relative?: string };
type Navigate = (to: Destination | number, options?: NavigationOptions) => void;
interface AppLocation { pathname: string; search: string; hash: string; state: unknown; key: string }
const NavigationContext = createContext<{ navigate: Navigate; location: AppLocation } | null>(null);

export function NavigationProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const search = useSearchParams()?.toString() || '';
  const [state, setState] = useState<unknown>(null);
  const [hash, setHash] = useState('');
  const pending = useRef<{ href: string; state: unknown } | null>(null);
  const pop = useRef(false);
  const initial = useRef(true);
  useEffect(() => {
    const onPop = () => { pop.current = true; setState(window.history.state?.usr ?? null); setHash(window.location.hash); };
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onHash);
    return () => { window.removeEventListener('popstate', onPop); window.removeEventListener('hashchange', onHash); };
  }, []);
  useEffect(() => {
    const href = window.location.pathname + window.location.search + window.location.hash;
    // A child may redirect in its mount effect before this provider's effect.
    // Keep its handoff until the destination commits instead of clearing it
    // while the source route is still current.
    if (pending.current && pending.current.href !== href) return;
    const nextState = pending.current?.href === href ? pending.current.state
      : (pop.current || initial.current) ? window.history.state?.usr ?? null : null;
    window.history.replaceState({ ...window.history.state, usr: nextState }, '');
    setState(nextState);
    setHash(window.location.hash);
    pending.current = null;
    pop.current = false;
    initial.current = false;
  }, [pathname, search]);
  const navigate = useCallback<Navigate>((to, options = {}) => {
    if (typeof to === 'number') { window.history.go(to); return; }
    let href: string;
    try { href = destinationHref(to, pathname, search ? `?${search}` : ''); }
    catch { href = '/'; }
    const nextState = options.state ?? null;
    setState(nextState);
    const target = new URL(href, window.location.origin);
    if (target.pathname === pathname && target.search === (search ? `?${search}` : '')) {
      // Next supports native history updates. Fragment-only changes do not
      // mount a page, so preserve their state and scroll explicitly.
      window.history[options.replace ? 'replaceState' : 'pushState']({ ...window.history.state, usr: nextState }, '', href);
      setHash(target.hash);
      if (target.hash && !options.preventScrollReset) {
        document.getElementById(decodeURIComponent(target.hash.slice(1)))?.scrollIntoView();
      }
      pending.current = null;
      return;
    }
    pending.current = { href, state: nextState };
    // Set state before the next page mounts (social-login MFA uses initial state).
    router[options.replace ? 'replace' : 'push'](href, { scroll: !options.preventScrollReset });
  }, [router, pathname, search]);
  const value = useMemo(() => ({ navigate, location: {
    pathname, search: search ? `?${search}` : '', hash, state, key: pathname + search,
  } }), [navigate, pathname, search, hash, state]);
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}
export function useAppLocation(): AppLocation {
  const context = useContext(NavigationContext);
  const pathname = usePathname() || '/';
  const search = useSearchParams()?.toString() || '';
  return context?.location ?? { pathname, search: search ? `?${search}` : '', hash: '', state: null, key: pathname + search };
}
export function useAppNavigate(): Navigate {
  const context = useContext(NavigationContext);
  const router = useRouter();
  const { pathname, search } = useAppLocation();
  const fallback = useCallback<Navigate>((to, options = {}) => {
    if (typeof to === 'number') { window.history.go(to); return; }
    router[options.replace ? 'replace' : 'push'](destinationHref(to, pathname, search));
  }, [router, pathname, search]);
  return context?.navigate ?? fallback;
}
export function useAppParams() { return useParams(); }
export function useAppSearchParams(defaults?: ConstructorParameters<typeof URLSearchParams>[0]) {
  const { pathname, search, hash } = useAppLocation();
  const navigate = useAppNavigate();
  const params = useMemo(() => {
    const current = new URLSearchParams(search);
    new URLSearchParams(defaults).forEach((value, key) => { if (!current.has(key)) current.set(key, value); });
    return current;
  }, [search, defaults]);
  const setParams = useCallback((next: ConstructorParameters<typeof URLSearchParams>[0] | ((previous: URLSearchParams) => ConstructorParameters<typeof URLSearchParams>[0]), options?: NavigationOptions) => {
    const result = new URLSearchParams(typeof next === 'function' ? next(new URLSearchParams(params)) : next);
    navigate({ pathname, search: result.size ? `?${result}` : '', hash }, options);
  }, [navigate, params, pathname, hash]);
  return [params, setParams] as const;
}
export interface AppLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to: Destination; state?: unknown; replace?: boolean; relative?: string;
  reloadDocument?: boolean; preventScrollReset?: boolean;
}
export const AppLink = forwardRef<HTMLAnchorElement, AppLinkProps>(function AppLink({
  to, state, replace, relative, reloadDocument, preventScrollReset, onClick, target, ...props
}, ref) {
  const location = useAppLocation();
  const navigate = useAppNavigate();
  const href = destinationHref(to, location.pathname, location.search);
  if (reloadDocument || props.download) return <a {...props} ref={ref} href={href} target={target} onClick={onClick} />;
  return <NextLink {...props} ref={ref} href={href} target={target} replace={replace} onClick={event => {
    onClick?.(event);
    if (event.defaultPrevented || reloadDocument || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || (target && target !== '_self')) return;
    event.preventDefault();
    navigate(to, { state, replace, relative, preventScrollReset });
  }} />;
});
AppLink.displayName = 'AppLink';
type ActiveState = { isActive: boolean };
export interface AppNavLinkProps extends Omit<AppLinkProps, 'className' | 'style' | 'children'> {
  end?: boolean;
  className?: string | ((state: ActiveState) => string | undefined);
  style?: CSSProperties | ((state: ActiveState) => CSSProperties | undefined);
  children?: ReactNode | ((state: ActiveState) => ReactNode);
}
export const AppNavLink = forwardRef<HTMLAnchorElement, AppNavLinkProps>(function AppNavLink({ end, className, style, children, to, ...props }, ref) {
  const location = useAppLocation();
  const active = { isActive: routeIsActive(destinationHref(to, location.pathname, location.search), location.pathname, end) };
  return <AppLink {...props} ref={ref} to={to} aria-current={active.isActive ? 'page' : undefined}
    className={typeof className === 'function' ? className(active) : className}
    style={typeof style === 'function' ? style(active) : style}>
    {typeof children === 'function' ? children(active) : children}
  </AppLink>;
});
AppNavLink.displayName = 'AppNavLink';
export function AppRedirect({ to, replace = false }: { to: Destination; replace?: boolean }) {
  const navigate = useAppNavigate();
  useEffect(() => { navigate(to, { replace }); }, [navigate, to, replace]);
  return null;
}
