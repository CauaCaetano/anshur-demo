// Funciona sem internet no pátio: guarda os arquivos do app e responde do cache quando a rede falha.
const CACHE = 'anshur-v3';
const ARQUIVOS = ['./', 'index.html', 'passaporte.html', 'estilo.css?v=3', 'passaporte.css?v=3', 'dados.js?v=3', 'comum.js?v=3', 'motor.js?v=3', 'graficos.js?v=3', 'app.js?v=3', 'passaporte.js?v=3', 'icone.svg', 'manifest.webmanifest'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // rede primeiro (sempre a versão nova), cache quando estiver sem sinal
  e.respondWith(fetch(e.request).then((r) => { const copia = r.clone(); if (r.ok) caches.open(CACHE).then((c) => c.put(e.request, copia)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: e.request.mode === 'navigate' })));
});
