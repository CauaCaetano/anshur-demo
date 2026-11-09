// Funciona sem internet no pátio e sempre busca a versão nova quando há sinal.
const CACHE = 'anshur-v15';
const ARQUIVOS = ['./', 'index.html', 'passaporte.html', 'estilo.css?v=15', 'passaporte.css?v=15', 'dados.js?v=15', 'comum.js?v=15', 'importar.js?v=15', 'fotos.js?v=15', 'motor.js?v=15', 'graficos.js?v=15', 'app.js?v=15', 'passaporte.js?v=15', 'nuvem.js?v=15', 'icone-192.png', 'manifest.webmanifest', 'logo/anshur-logo.png?v=5'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
// guarda só o próprio app e as bibliotecas de versão fixa; nunca respostas do servidor de dados (login e dados da revenda)
const GUARDAVEL = (u) => u.origin === self.location.origin || u.hostname === 'cdn.jsdelivr.net' || u.hostname === 'cdnjs.cloudflare.com';
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (!GUARDAVEL(new URL(e.request.url))) return;
  // páginas: sempre confere com o servidor (ignora a cópia de 10 minutos do navegador)
  const pedido = e.request.mode === 'navigate' ? new Request(e.request.url, { cache: 'no-cache' }) : e.request;
  e.respondWith(fetch(pedido).then((r) => { const copia = r.clone(); if (r.ok) caches.open(CACHE).then((c) => c.put(e.request, copia)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: e.request.mode === 'navigate' })));
});
