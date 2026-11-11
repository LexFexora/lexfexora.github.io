/* Latihan Putusan & Penetapan: cache untuk dipakai tanpa internet. Cakupan: folder /latihan-putusan/ saja. */
const C = 'latihan-putusan-v33', FONT = 'latihan-putusan-font';
const CORE = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', '../favicon.svg', '../favicon-32.png', '../apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('latihan-putusan-') && k !== C && k !== FONT).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (r.mode === 'navigate' && u.origin === location.origin && /\/(index\.html)?$/.test(u.pathname)){ // halaman: versi terbaru bila ada internet, cadangan dari cache bila tidak
    e.respondWith(fetch(r).then(res => { if (res.ok){ const cp = res.clone(); caches.open(C).then(c => c.put('./', cp)); } return res; })
      .catch(() => caches.match('./')));
    return;
  }
  if (u.origin === location.origin){
    e.respondWith(caches.match(r).then(m => m || fetch(r)));
    return;
  }
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com'){
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { const cp = res.clone(); caches.open(FONT).then(c => c.put(r, cp)); return res; })));
  }
});
