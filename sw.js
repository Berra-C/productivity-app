const CACHE_VERSION = 'v95';
const STATIC_CACHE = `productivity-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `productivity-runtime-${CACHE_VERSION}`;
const CDN_CACHE = `productivity-cdn-${CACHE_VERSION}`;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/app.css',
  './assets/js/modules/ui-helpers.js',
  './assets/js/modules/state-merge.js',
  './assets/js/app.js',
  './assets/js/cloud-config.js',
  './assets/js/cloud-sync.js',
  './assets/js/pwa-register.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

async function cacheShellResiliently() {
  const cache = await caches.open(STATIC_CACHE);
  await Promise.allSettled(APP_SHELL.map(async path => {
    const request = new Request(path, { cache: 'reload' });
    const response = await fetch(request);
    if (!response.ok) throw new Error(`Shell asset failed: ${path} (${response.status})`);
    await cache.put(request, response);
  }));
}

self.addEventListener('install', event => {
  event.waitUntil(cacheShellResiliently().then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  const allowed = new Set([STATIC_CACHE, RUNTIME_CACHE, CDN_CACHE]);
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => !allowed.has(key)).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (_) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const url = new URL(request.url);
    if (url.pathname.endsWith('/admin.html')) {
      return new Response('Admin page is unavailable offline.', {
        status: 503,
        headers: { 'content-type': 'text/plain; charset=utf-8' }
      });
    }
    return (await caches.match('./index.html')) || (await caches.match('./'));
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request).then(response => {
    if (response && (response.ok || response.type === 'opaque')) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  }).catch(() => null);
  return cached || (await networkPromise) || Response.error();
}

async function cacheFirstSameOrigin(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}


async function networkFirstSameOriginAsset(request) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone()).catch(() => {});
      return response;
    }
    throw new Error('Asset response not ok');
  } catch (_) {
    // First try the exact versioned request.
    const exact = await caches.match(request);
    if (exact) return exact;

    // App-shell assets are installed without ?v=... query strings.
    // Ignore the search string so a temporary network error does not make
    // required JS modules disappear.
    const fallback = await caches.match(request, { ignoreSearch: true });
    if (fallback) return fallback;

    return new Response('Required asset unavailable', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8' }
    });
  }
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // Let the browser handle external CDN/font requests directly.
  // Intercepting cross-origin font requests here caused Firefox/CORS failures.
  if (url.origin !== self.location.origin) return;

  if (url.origin === self.location.origin) {
    const isVersionedAsset =
      url.searchParams.has('v') &&
      /\.(?:js|css)$/i.test(url.pathname);

    event.respondWith(
      isVersionedAsset
        ? networkFirstSameOriginAsset(request)
        : cacheFirstSameOrigin(request)
    );
  }
});
