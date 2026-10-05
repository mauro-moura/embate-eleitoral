// Service worker do Embate Eleitoral: deixa o app instalável e abrir offline.
// Arquivos do site: rede primeiro (nunca fica preso numa versão velha), cache só se offline.
// Dados do TSE e outras origens passam direto, sem cache.
const CACHE = 'embate-v3';
const ARQUIVOS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'src/css/style.css',
  'src/js/eleicao.js',
  'src/js/app.js',
  'src/js/estilos/kamehameha.js',
  'src/js/estilos/naruto.js',
  'src/js/estilos/pokemon.js',
  'src/js/estilos/streetfighter.js',
  'src/js/estilos/mortalkombat.js',
  'src/img/icones/icone-192.png',
  'src/img/icones/icone-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((resp) => {
        if (resp.ok) {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
        }
        return resp;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })),
  );
});
