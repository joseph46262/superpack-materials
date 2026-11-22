const CACHE_NAME = 'superpack-cache-v2';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  // لا نكاش طلبات Firebase نهائياً لضمان جلب أحدث البيانات دائماً
  if (url.hostname.includes('firebaseio.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // لملفات الصفحة والـ manifest: جلب الأحدث من الشبكة أولاً، ثم الكاش عند انقطاع الإنترنت
  if (event.request.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname.endsWith('manifest.json')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // لباقي الملفات الثابتة مثل الأيقونات: الكاش أولاً ثم الشبكة
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).then((networkResponse) => {
        const copy = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return networkResponse;
      });
    })
  );
});