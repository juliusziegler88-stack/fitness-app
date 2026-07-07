const CACHE = 'fitness-v3';
const ASSETS = [
  './', 'index.html', 'styles.css', 'manifest.json',
  'js/config.js', 'js/data.js', 'js/rotation.js',
  'js/auth.js', 'js/sheets.js', 'js/workout-session.js', 'js/heute.js',
  'js/training.js', 'js/ernaehrung.js', 'js/fortschritt.js',
  'js/app.js', 'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('googleapis') || e.request.url.includes('accounts.google')) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
