/* flash-gestion · Service Worker
   Basado en el sw corregido de RICCHARY (ago-2026): guarda el index en caché
   y usa el respaldo también ante 404/503, no solo cuando se cae la red.
   AL SUBIR CAMBIOS: sube el número de CACHE. */
const CACHE = 'flash-v22';
const ASSETS = ['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./jspdf.umd.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(ASSETS.map(u => c.add(u).catch(() => null)))));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  const esHTML = e.request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html');
  if (esHTML) {
    e.respondWith(
      fetch(e.request).then(r => {
        if (!r || !r.ok) throw new Error('respuesta ' + (r && r.status));
        const copia = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copia)); return r;
      }).catch(() => caches.match('./index.html').then(c => c || caches.match('./')))
    );
  } else {
    e.respondWith(caches.match(e.request).then(c => c || fetch(e.request).then(r => {
      if (r && r.ok) { const copia = r.clone(); caches.open(CACHE).then(x => x.put(e.request, copia)); }
      return r;
    })));
  }
});

/* Notificaciones push (pedidos nuevos y cambios de estado) */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  const ver = /recibidos/.test(d.url || '') ? 'recibidos' : 'historial';
  e.waitUntil(Promise.all([
    self.registration.showNotification(d.title || 'Flash', {
      body: d.body || '', tag: d.tag || undefined, renotify: !!d.tag, icon: './icon-192.png',
      data: { ver: ver, url: d.url || './' }
    }),
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => cs.forEach(c => c.postMessage({ type: 'push' })))
  ]));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const ver = (e.notification.data || {}).ver || 'historial';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs.find(x => x.url.indexOf(self.registration.scope) === 0) || cs[0];
    if (c) { c.postMessage({ type: 'abrir', ver: ver }); return c.focus(); }
    return self.clients.openWindow('./index.html?ver=' + ver);
  }));
});
