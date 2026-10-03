/* Retire the former SPA worker. Next document/RSC requests must reach the server. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('socialstats-')).map(key => caches.delete(key)))),
    self.registration.unregister(),
  ]).then(() => self.clients.claim()));
});
// Intentionally no fetch handler or offline HTML cache.
