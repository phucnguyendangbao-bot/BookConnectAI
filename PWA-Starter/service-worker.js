// =========================================================
// BookConnect AI — Service Worker
//
// Service Worker là "trợ lý ngầm" chạy trong nền của trình duyệt.
// Nó giúp:
//   1. Cache file để app chạy được offline
//   2. Cho phép trình duyệt "cài" app vào màn hình chính (PWA)
//   3. Cập nhật app khi có phiên bản mới
// =========================================================

const CACHE_NAME = 'bookconnect-v1';

// Danh sách file cần cache (cho phép chạy offline)
const PRECACHE_URLS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './api.js',
  './register-sw.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Khi service worker được CÀI ĐẶT (lần đầu hoặc khi có version mới)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())  // Kích hoạt ngay không đợi
  );
});

// Khi service worker được KÍCH HOẠT - xoá cache cũ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME)
            .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Khi trang yêu cầu tải file (fetch)
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // BỎ QUA các request không phải GET (POST tới Claude API)
  if (request.method !== 'GET') return;

  // BỎ QUA các request tới API ngoài (Claude API)
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  // Strategy: Cache-first, fallback Network
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        // Cache thêm file mới tải về
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
        }
        return response;
      }).catch(() => {
        // Nếu mạng cũng fail, trả về index.html cho SPA fallback
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
