/* Corner push service worker (Patrik 2026-08-06).
 *
 * Deliberately at the site ROOT, not under /corner/. A service worker can only
 * control pages at or below its own path, and it is registered with an explicit
 * scope of /dashboard — which a worker served from /corner/ is not allowed to claim.
 *
 * It does one job: turn a push from our server into a notification, and put the
 * user in the right room when they tap it. No fetch handler, no caching — a stale
 * cached dashboard would be far worse than no offline support.
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }

  const title = payload.title || 'Corner';
  const options = {
    body: payload.body || 'You have a new message.',
    icon: '/brand/favicon/corner-192.png',
    badge: '/brand/favicon/corner-192.png',
    // Same tag per room = a second message REPLACES the first instead of stacking
    // five notifications for one conversation.
    tag: payload.tag || 'corner-message',
    renotify: true,
    timestamp: Date.now(),
    data: { url: payload.url || '/dashboard' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/dashboard';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Focus a dashboard tab that is already open rather than piling up new ones.
    for (const client of all) {
      if (client.url.includes('/dashboard') && 'focus' in client) {
        try { await client.navigate(target); } catch { /* cross-origin or unsupported */ }
        return client.focus();
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(target);
    return undefined;
  })());
});
