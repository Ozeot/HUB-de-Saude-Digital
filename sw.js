const CACHE_NAME = 'hsd-cache-v1';
const STATIC_FILES = [
  '/',
  '/index.html',
  './index.html',
  '/manifest.json',
  '/192.png',
  '/512.png',
  '/iconhsd.png',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', (event) => {
  console.log('🔧 Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Adicionando arquivos ao cache...');
        return cache.addAll(STATIC_FILES)
          .then(() => {
            console.log('✅ Todos os arquivos foram cacheados!');
          })
          .catch((error) => {
            console.error('❌ Erro ao cachear arquivos:', error);
          });
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('🚀 Ativando Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker ativado!');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Ignora requisições que não são do seu domínio
  if (!url.origin.includes(location.origin)) {
    return;
  }
  
  console.log('🌐 Interceptando:', event.request.url);
  
  // Para documentos HTML
  if (event.request.destination === 'document' || 
      url.pathname === '/' || 
      url.pathname.endsWith('.html')) {
    
    event.respondWith(
      // Tenta buscar online primeiro
      fetch(event.request)
        .then(response => {
          console.log('✅ Carregado online:', event.request.url);
          // Atualiza cache com nova versão
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          console.log('📱 Carregando do cache:', event.request.url);
          // Se falhar, busca no cache
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Fallback para index.html
              return caches.match('/index.html')
                .then(indexResponse => {
                  if (indexResponse) {
                    return indexResponse;
                  }
                  // Último recurso
                  return caches.match('./index.html');
                });
            });
        })
    );
  } 
  // Para outros recursos (CSS, JS, imagens)
  else {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            console.log('📦 Cache hit:', event.request.url);
            return response;
          }
          console.log('🌐 Buscando online:', event.request.url);
          return fetch(event.request)
            .then(networkResponse => {
              // Cacheia recursos encontrados
              if (networkResponse.ok) {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(event.request, responseClone);
                });
              }
              return networkResponse;
            });
        })
    );
  }
});