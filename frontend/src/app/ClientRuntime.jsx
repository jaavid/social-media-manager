'use client';
import { useEffect } from 'react';
export default function ClientRuntime() {
  useEffect(() => {
    // Retire only this application's old SPA worker/cache, leaving other registrations alone.
    navigator.serviceWorker?.getRegistrations().then(registrations => Promise.all(
      registrations.filter(r => [r.active, r.waiting, r.installing].some(w => w && new URL(w.scriptURL).pathname === '/sw.js'))
        .map(r => r.unregister())
    )).catch(() => {});
    if ('caches' in window) caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith('socialstats-')).map(key => caches.delete(key))
    )).catch(() => {});
  }, []);
  return null;
}
