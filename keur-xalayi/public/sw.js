// Service worker de Keur Xaleyi : permet d'installer l'application sur l'écran
// d'accueil. Les données de l'école (API) ne sont jamais mises en cache : on
// affiche seulement une page « hors connexion » quand il n'y a pas de réseau.
const CACHE = 'kx-hors-ligne-v2';
const HORS_LIGNE = '/hors-ligne.html';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([HORS_LIGNE, '/img/icone-192.png', '/css/app.css'])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((cles) => Promise.all(cles.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

const SECOURS = ['/css/app.css', '/img/icone-192.png']; // utilisés par la page hors connexion

self.addEventListener('fetch', (e) => {
  // Pages : réseau d'abord, page hors connexion en secours.
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match(HORS_LIGNE)));
    return;
  }
  // Style et icône de la page hors connexion : réseau d'abord, copie en cache sans réseau.
  const url = new URL(e.request.url);
  if (url.origin === self.location.origin && SECOURS.includes(url.pathname)) {
    e.respondWith(fetch(e.request).catch(() => caches.match(url.pathname)));
  }
  // Le reste (dont toutes les données de l'école) passe normalement, sans cache.
});
