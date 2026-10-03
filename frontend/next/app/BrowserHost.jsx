'use client';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Router, createPath } from 'react-router-dom';
import { isMigratedRoute } from '../../src/app/routes/migratedRoutes';
import { applyNavigationHandoff, saveNavigationHandoff } from '../../src/lib/runtime/navigationHandoff';
import AppProviders from '../../src/app/providers/AppProviders';

// Compatibility adapter for retained React Router feature links and nested routes.
// Next owns history; a second BrowserRouter must never compete with App Router.
function NextRouter({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [state, setState] = useState(() => applyNavigationHandoff(pathname) ?? window.history.state?.usr ?? null);
  const [hash, setHash] = useState('');
  useEffect(() => {
    const update = () => {
      setHash(window.location.hash);
      setState(window.history.state?.usr ?? null);
    };
    update();
    window.addEventListener('hashchange', update);
    window.addEventListener('popstate', update);
    return () => {
      window.removeEventListener('hashchange', update);
      window.removeEventListener('popstate', update);
      };
  }, [pathname, search]);
  const navigator = useMemo(() => {
    const navigate = (to, routeState, replace) => {
      const href = typeof to === 'string' ? to : createPath(to);
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) { router.replace('/'); return; }
      // Cross-host routes require document navigation so ingress owns selection.
      // React Router state also uses a document handoff, never query parameters.
      if (!isMigratedRoute(url.pathname) || routeState != null) {
        saveNavigationHandoff(url.pathname, routeState);
        window.location[replace ? 'replace' : 'assign'](href);
      } else {
        setState(null);
        router[replace ? 'replace' : 'push'](href);
      }
    };
    return {
      createHref: to => typeof to === 'string' ? to : createPath(to),
      go: delta => window.history.go(delta),
      push: (to, routeState) => navigate(to, routeState, false),
      replace: (to, routeState) => navigate(to, routeState, true),
    };
  }, [router]);
  return <Router navigator={navigator} location={{ pathname, search: search ? `?${search}` : '', hash, state }}>
    {children}
  </Router>;
}
export default function BrowserHost({ children }) {
  return <AppProviders router={NextRouter}>{children}</AppProviders>;
}
