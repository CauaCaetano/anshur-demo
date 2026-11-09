// Funciona sem internet no pátio e sempre busca a versão nova quando há sinal.
const CACHE = 'anshur-v20';
const V = '?v=20';
const ARQUIVOS = ['./', 'index.html', 'passaporte.html', 'estilo.css' + V, 'passaporte.css' + V, 'instalar.js' + V, 'areas.js' + V, 'dados.js' + V, 'comum.js' + V, 'importar.js' + V, 'fotos.js' + V, 'motor.js' + V, 'retencao.js' + V, 'graficos.js' + V,
  'areas/nucleo.js' + V, 'areas/novas-regras.js' + V, 'areas/novas.js' + V,'areas/financeiro-regras.js' + V, 'areas/financeiro.js' + V, 'areas/pecas-regras.js' + V, 'areas/oficina-regras.js' + V, 'areas/oficina.js' + V, 'areas/pecas.js' + V, 'areas/crm-regras.js' + V, 'areas/crm.js' + V,'areas/fiscal-regras.js' + V, 'areas/fiscal.js' + V,
  'app.js' + V, 'passaporte.js' + V, 'nuvem.js' + V, 'icone-192.png', 'icone-512.png', 'icone-180.png', 'icone-maskable-192.png', 'icone-maskable-512.png', 'manifest.webmanifest', 'logo/anshur-logo.png?v=5'];
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
