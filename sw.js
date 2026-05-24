const CACHE_NAME = 'lm-calc-v2';
const urlsToCache = [
  'index.html',
  'css/style.css',
  'js/calculator.js',
  'js/chart.js',
  'js/ui.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
];

// 逐个缓存，单个失败不影响其他
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.allSettled(
        urlsToCache.map((url) =>
          cache.add(url).catch((err) =>
            console.warn('[SW] 缓存失败:', url, err.message)
          )
        )
      );
      self.skipWaiting();
    })()
  );
});

// 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
      self.clients.claim();
    })()
  );
});

// 网络优先 + 缓存兜底（确保始终拿到最新资源）
self.addEventListener('fetch', (event) => {
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(event.request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, response.clone());
        return response;
      } catch {
        return caches.match(event.request);
      }
    })()
  );
});
