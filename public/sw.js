const CACHE_NAME = 'geophysalis-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through fetch to satisfy PWA install prompt requirements
  // In a full offline app, we would serve from cache here.
  event.respondWith(
    fetch(event.request).catch(() => new Response('Offline - Geophysalis benötigt eine Internetverbindung.'))
  );
});
