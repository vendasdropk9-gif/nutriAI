// Import native push and meal/challenge scheduler
try {
  importScripts('/sw-push-scheduler.js');
} catch (e) {
  console.warn('[SW] Could not import /sw-push-scheduler.js:', e);
}

const CACHE_NAME = 'nutriai-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.png',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - caching static shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell...');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[Service Worker] Static assets cache notice:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate event - cleaning up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - only handle GET requests, bypass API and external services
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = event.request.url;

  // Never cache backend API calls, OAuth, Supabase, Firebase, Vite dev modules, or cookie checks
  if (
    url.includes('/api/') ||
    url.includes('/sso-api') ||
    url.includes('googleapis.com') ||
    url.includes('firebaseapp.com') ||
    url.includes('supabase.co') ||
    url.includes('/@vite') ||
    url.includes('/@fs') ||
    url.includes('/src/') ||
    url.includes('html-proxy') ||
    url.includes('__cookie_check') ||
    url.includes('node_modules')
  ) {
    return;
  }

  // Only handle same-origin requests, OR external GLB/GLTF models
  const isModel = url.endsWith('.glb') || url.endsWith('.gltf');
  if (!url.startsWith(self.location.origin) && !isModel) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // If found in cache, return it immediately (CacheFirst strategy)
      if (cachedResponse) {
        // If it's not a model, we can still do background revalidation for SWR
        if (!isModel) {
          fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse.clone()).catch(() => {});
              });
            }
          }).catch(() => {});
        }
        return cachedResponse;
      }

      // If not in cache, fetch from network
      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          // Cache only if it's a valid response (models are usually 'cors')
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {});
          });
        }
        return response;
      }).catch((err) => {
        if (event.request.mode === 'navigate') {
          return caches.match('/') || caches.match('/index.html');
        }
        console.warn('[Service Worker] Resource fetch bypassed:', event.request.url);
        return new Response('', { status: 404, statusText: 'Resource Unavailable' });
      });
    })
  );
});
