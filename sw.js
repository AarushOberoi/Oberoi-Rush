// Fleet Rush offline shell. Pages load network-first (so a deploy shows up on the next visit) and fall back to the
// cached shell offline; hashed assets, fonts and icons are cache-first. Online play (/ws) and /health never pass here.
const CACHE = 'fleet-rush-shell-v1';
const STATIC = ['/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png', '/icons/apple-touch-icon.png', '/fonts/russo-one-latin.woff2', '/fonts/dm-sans-latin.woff2'];
const NAV_TIMEOUT_MS = 4000;
const refs = text => [...new Set(text.match(/\/?assets\/[\w.-]+\.(?:js|css|woff2|png|svg|webp)/g) ?? [])].map(p => p.startsWith('/') ? p : `/${p}`);

async function cacheShell(cache, html) {
  const assets = refs(html);
  await Promise.all([...assets, ...STATIC].map(url => cache.add(url).catch(() => undefined)));
  // Chunks imported by the entry script are not in the HTML; follow one level of references.
  for (const url of assets.filter(u => u.endsWith('.js') || u.endsWith('.css'))) {
    const res = await cache.match(url);
    if (res) await Promise.all(refs(await res.text()).map(u => cache.match(u).then(hit => hit || cache.add(u)).catch(() => undefined)));
  }
  return assets;
}
async function refreshShell(response) {
  const cache = await caches.open(CACHE), html = await response.clone().text();
  await cache.put('/', response);
  const keep = new Set(await cacheShell(cache, html));
  for (const url of keep) { const res = await cache.match(url); if (res && /\.(js|css)$/.test(url)) for (const u of refs(await res.text())) keep.add(u); }
  for (const req of await cache.keys()) { const path = new URL(req.url).pathname; if (path.startsWith('/assets/') && !keep.has(path)) await cache.delete(req); }
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch('/', { cache: 'no-cache' });
    if (response.ok) await refreshShell(response);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname === '/ws' || url.pathname === '/health' || url.pathname === '/sw.js') return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), NAV_TIMEOUT_MS);
      try {
        const response = await fetch(request, { signal: controller.signal });
        clearTimeout(timer);
        if (response.ok && url.pathname === '/' && (response.headers.get('content-type') || '').includes('text/html')) event.waitUntil(refreshShell(response.clone()).catch(() => undefined));
        return response;
      } catch {
        clearTimeout(timer);
        return (await caches.match('/')) || new Response('Fleet Rush is offline and has not been cached yet.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      }
    })());
    return;
  }
  if (/^\/(assets|fonts|icons)\//.test(url.pathname) || url.pathname === '/favicon.svg' || url.pathname === '/manifest.webmanifest') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE), hit = await cache.match(request, { ignoreSearch: true });
      if (hit) return hit;
      const response = await fetch(request);
      if (response.ok) event.waitUntil(cache.put(request, response.clone()));
      return response;
    })());
  }
});
