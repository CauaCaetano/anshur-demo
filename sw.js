// Funciona sem internet no pátio: guarda os arquivos do app e responde do cache quando a rede falha.
const CACHE = 'anshur-v5';
const ARQUIVOS = ['./', 'index.html', 'passaporte.html', 'estilo.css?v=5', 'passaporte.css?v=5', 'dados.js?v=5', 'comum.js?v=5', 'importar.js?v=5', 'motor.js?v=5', 'graficos.js?v=5', 'app.js?v=5', 'passaporte.js?v=5', 'icone.svg', 'manifest.webmanifest', 'logo/anshur-logo.png?v=5'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // rede primeiro (sempre a versão nova), cache quando estiver sem sinal
  e.respondWith(fetch(e.request).then((r) => { const copia = r.clone(); if (r.ok) caches.open(CACHE).then((c) => c.put(e.request, copia)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: e.request.mode === 'navigate' })));
});
