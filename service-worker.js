const CACHE_NAME = 'hakmin-flashcard-cache-v3'; // 버전을 올려서 강제 업데이트
const CSV_URL = 'https://raw.githubusercontent.com/HacMinLee/study-with-AI-python/main/%EA%B0%90%EC%82%AC%EC%95%94%EA%B8%B0%ED%8C%8C%EC%9D%BC%EC%94%A8%EC%97%90%EC%S%A4%EB%B9%84.csv';
const APP_SHELL_URLS = [
  './',
  './index.html',
  './manifest.json'
];

// 서비스 워커 설치: 앱의 껍데기(App Shell)를 캐시에 저장합니다.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Cache opened, caching app shell');
      return cache.addAll(APP_SHELL_URLS);
    })
  );
});

// 서비스 워커 활성화: 이전 버전의 낡은 캐시를 청소합니다.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (CACHE_NAME !== cacheName) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// fetch 이벤트 처리: 요청을 가로채서 어떻게 응답할지 결정합니다.
self.addEventListener('fetch', event => {
  const { request } = event;

  // CSV 파일에 대한 특별 전략: '네트워크 우선, 실패 시 캐시'
  if (request.url === CSV_URL) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return fetch(request).then(response => {
          // 네트워크 요청에 성공하면, 응답을 캐시에 저장하고 반환합니다.
          console.log(`[Service Worker] Fetched & Caching new data from ${request.url}`);
          cache.put(request, response.clone());
          return response;
        }).catch(() => {
          // 네트워크 요청에 실패하면, 캐시에서 데이터를 찾아 반환합니다.
          console.log(`[Service Worker] Network failed, trying to get data from cache for ${request.url}`);
          return cache.match(request);
        });
      })
    );
    return;
  }

  // 그 외 다른 모든 요청에 대한 일반 전략: '캐시 우선, 실패 시 네트워크'
  event.respondWith(
    caches.match(request).then(response => {
      return response || fetch(request);
    })
  );
});
