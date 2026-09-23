// Minimal service worker for offline app-shell loading + "Add to Home Screen" installability.
// Not elaborate by design: network-first for freshness, falling back to a cached copy when
// offline, and opportunistically caching whatever same-origin GET requests succeed (so the
// hashed Vite build assets get picked up without needing a build-time manifest here).

const CACHE_NAME = 'ember-ashes-shell-v1'

// Paths are relative to this file's own location (the site root), matching vite.config.ts's
// `base: './'` so this keeps working when served from a GitHub Pages project subpath.
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './apple-touch-icon.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseCopy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseCopy))
        return response
      })
      .catch(async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        // Offline shell fallback for navigations that were never cached directly.
        if (request.mode === 'navigate') return caches.match('./index.html')
        return Response.error()
      }),
  )
})
