// Service worker: makes the suite installable, quick to open, and usable offline.
//   - Precache: on install, the whole built app (every file under assets/ — bundles, lazy
//     pages, fonts, images) plus the shell, so the suite opens with no connection after one
//     visit. The build fills PRECACHE and BUILD (vite.config.ts → precacheServiceWorker); a
//     new deploy changes BUILD, which installs a fresh cache and drops the previous one.
//   - App shell (index.html): network first, but a slow network falls back to the saved shell
//     after a short wait, so a weak signal never holds the app hostage. Offline → saved shell.
//   - Hashed bundles, fonts, images under /assets/, and the versioned CDN copies under
//     /vendor/ (Tailwind's Play CDN, inlined into generators): cache first.
//   - Generator cover images (public Supabase bucket, versioned ?v= URLs): cache first.
// Auth, catalog data and generator HTML always go to Supabase. The page keeps its own
// per-account generator caches (recently opened + offline downloads) and the generators' CDN
// files (radiology-vendor-v1), which this worker never touches — they must survive its updates.
const BUILD = 'dev';
const PRECACHE = [];

const SHELL_CACHE = `radiology-shell-${BUILD}`;
const COVER_CACHE = 'radiology-covers-v1';
const KEEP = new Set([
  SHELL_CACHE,
  COVER_CACHE,
  'radiology-generators-v1',
  'radiology-offline-v1',
  'radiology-vendor-v1',
]);
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './icons/icon-192.png',
];
const NAV_TIMEOUT_MS = 2500;
const COVER_LIMIT = 160;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll([...SHELL, ...PRECACHE]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('radiology-') && !KEEP.has(k))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function navigate(request) {
  const network = fetch(request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(SHELL_CACHE).then((cache) => cache.put('./index.html', copy));
    }
    return response;
  });
  const fallback = () => caches.match('./index.html', { cacheName: SHELL_CACHE, ignoreVary: true });
  const slow = new Promise((resolve) => setTimeout(resolve, NAV_TIMEOUT_MS)).then(fallback);
  // Whichever answers first: fresh page, or (after the timeout) the saved shell.
  return Promise.race([network, slow.then((hit) => hit || network)]).catch(() =>
    fallback().then((hit) => hit || network),
  );
}

// ignoreVary: hosts send Vary (Origin, Accept-Encoding), and a precached or pre-warmed entry
// was stored from a different request than the one asking now (module scripts carry Origin,
// <img> doesn't). These URLs are content-hashed or versioned, so the variants are identical.
function cacheFirst(cacheName, request, load = () => fetch(request), onStore = () => {}) {
  return caches.open(cacheName).then((cache) =>
    cache.match(request, { ignoreVary: true }).then(
      (hit) =>
        hit ||
        load().then((response) => {
          if (response.ok) cache.put(request, response.clone()).then(onStore);
          return response;
        }),
    ),
  );
}

let trimTimer;
function scheduleTrim() {
  clearTimeout(trimTimer);
  trimTimer = setTimeout(() => trimCovers().catch(() => {}), 4000);
}

async function trimCovers() {
  const cache = await caches.open(COVER_CACHE);
  const keys = await cache.keys();
  // Oldest first: drop replaced covers (same path, older ?v=) and anything over the limit.
  const latest = new Map();
  for (const req of keys) latest.set(new URL(req.url).pathname, req);
  const keep = new Set(latest.values());
  const surplus = keys.filter((r) => !keep.has(r));
  const overflow = [...keep].slice(0, Math.max(0, keep.size - COVER_LIMIT));
  await Promise.all([...surplus, ...overflow].map((r) => cache.delete(r)));
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    if (url.pathname.includes('/storage/v1/object/public/app-covers/')) {
      // Fetch with CORS (Supabase allows it) so the cached copy is a normal, sized response.
      const load = () => fetch(url.href, { mode: 'cors', credentials: 'omit' });
      event.respondWith(
        cacheFirst(COVER_CACHE, request, load, scheduleTrim).catch(() => fetch(request)),
      );
    }
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(navigate(request));
    return;
  }

  if (url.pathname.includes('/assets/') || url.pathname.includes('/vendor/')) {
    event.respondWith(cacheFirst(SHELL_CACHE, request));
    return;
  }

  // Everything else (icons, manifest): network first, cache as fallback.
  event.respondWith(fetch(request).catch(() => caches.match(request, { ignoreVary: true })));
});
