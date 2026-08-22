/* Service worker Karat — notifications push des commandes.
   Objectif minimal et robuste : pas de cache d'actifs (pour éviter tout
   fichier périmé), uniquement la réception des notifications push. */
'use strict';

self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });

// Réception d'une notification push envoyée par le serveur.
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { data = {}; }
  const title = data.title || '🔔 Nouvelle commande';
  const options = {
    body: data.body || 'Vous avez reçu une nouvelle commande.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'karat-order',
    renotify: true,
    requireInteraction: true,             // reste affichée jusqu'à l'ouverture
    vibrate: [200, 100, 200, 100, 300],   // vibration façon « paiement »
    data: { url: data.url || '/tableau-de-bord' },
  };
  event.waitUntil((async () => {
    // Prévient les onglets ouverts pour qu'ils jouent le son « paiement ».
    try {
      const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      list.forEach((c) => c.postMessage({ type: 'karat-order', payload: data }));
    } catch (_) { /* ignore */ }
    await self.registration.showNotification(title, options);
  })());
});

// Clic sur la notification : ouvre / met au premier plan le tableau de bord.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/tableau-de-bord';
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) {
      if ('focus' in c) { try { await c.navigate(url); } catch (_) { /* ignore */ } return c.focus(); }
    }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  })());
});
