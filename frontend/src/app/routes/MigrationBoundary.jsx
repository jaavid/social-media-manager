import { saveNavigationHandoff } from '../../lib/runtime/navigationHandoff';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { isMigratedRoute } from './migratedRoutes';
import { Loader } from '../layout/Loading';
// During split deployment, Vite's client router must hand migrated URLs back
// to ingress. Refresh and in-app navigation then select the same host.
export default function MigrationBoundary({ children }) {
  const { pathname, state } = useLocation();
  const handoff = process.env.REACT_APP_NEXT_ENABLED === 'true' && isMigratedRoute(pathname);
  useEffect(() => {
    if (handoff) {
      saveNavigationHandoff(pathname, state);
      // An already installed v1 worker can serve cached Vite HTML for this
      // URL. Release only our own worker before the cross-host navigation.
      const release = navigator.serviceWorker?.getRegistration?.().then(registration => {
        const script = registration?.active?.scriptURL;
        if (script && new URL(script).pathname === '/sw.js') return registration.unregister();
      });
      Promise.resolve(release).catch(() => {}).finally(() => window.location.replace(window.location.href));
    }
  }, [handoff, pathname, state]);
  return handoff ? <Loader /> : children;
}
