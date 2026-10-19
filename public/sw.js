const CACHE = 'nutrilog-shell-v1';
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.add(new URL('./', self.registration.scope).toString());
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('nutrilog-shell-') && key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
        return response;
      } catch {
        return (await caches.match(request)) || (await caches.match(new URL('./', self.registration.scope).toString()));
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') (await caches.open(CACHE)).put(request, response.clone());
      return response;
    } catch {
      return Response.error();
    }
  })());
});
