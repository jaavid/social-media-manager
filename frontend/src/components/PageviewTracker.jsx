/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
'use client';
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import { init, pageview } from '../services/analytics';

/**
 * PageviewTracker — fires a pageview to the analytics service on every
 * route change. Mount once in the root layout under a narrow Suspense boundary.
 *
 * The analytics service is a no-op until consent is granted, so this is
 * safe to mount unconditionally — visitors who have not opted in to
 * analytics cookies see no tracking happen.
 */
export default function PageviewTracker() {
  const pathname = usePathname() || '/';
  const search = useSearchParams()?.toString();

  // Boot the underlying analytics script once on first mount.
  useEffect(() => { init(); }, []);

  // Re-fire on every navigation. The first one fires on initial load too.
  useEffect(() => {
    pageview(pathname + (search ? `?${search}` : ''));
  }, [pathname, search]);

  return null;
}
