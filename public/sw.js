// Service worker de Keur Xaleyi : permet d'installer l'application sur l'écran
// d'accueil. Les données de l'école (API) ne sont jamais mises en cache : on
// affiche seulement une page « hors connexion » quand il n'y a pas de réseau.
const CACHE = 'kx-hors-ligne-v1';
const HORS_LIGNE = '/hors-ligne.html';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([HORS_LIGNE, '/img/icone-192.png', '/css/app.css'])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((cles) => Promise.all(cles.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Pages : réseau d'abord, page hors connexion en secours. Le reste passe normalement.
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match(HORS_LIGNE)));
  }
});
