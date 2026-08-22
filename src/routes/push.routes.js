'use strict';

// Notifications push : clé publique VAPID, enregistrement / suppression
// d'un appareil, et envoi d'une notification de test.
const express = require('express');
const { requireAuth } = require('../middleware');
const push = require('../push');

const router = express.Router();

// GET /api/push/key — clé publique VAPID (nécessaire côté navigateur)
router.get('/key', requireAuth, async (_req, res) => {
  const publicKey = await push.getPublicKey();
  if (!publicKey) return res.status(503).json({ error: 'Notifications indisponibles.' });
  const count = await push.countSubscriptions(_req.user.id);
  res.json({ publicKey, subscribed: count > 0 });
});

// POST /api/push/subscribe { subscription }
router.post('/subscribe', requireAuth, async (req, res) => {
  try {
    await push.saveSubscription(req.user.id, req.body && req.body.subscription);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: 'Abonnement invalide.' });
  }
});

// POST /api/push/unsubscribe { endpoint }
router.post('/unsubscribe', requireAuth, async (req, res) => {
  const endpoint = req.body && req.body.endpoint;
  if (endpoint) await push.removeSubscription(req.user.id, endpoint);
  res.json({ ok: true });
});

// POST /api/push/test — envoie une notification de démonstration
router.post('/test', requireAuth, async (req, res) => {
  await push.sendToUser(req.user.id, {
    title: '🔔 Notifications activées !',
    body: 'Voici à quoi ressemblera l\'alerte quand vous recevrez une commande.',
    url: '/tableau-de-bord',
    tag: 'karat-test',
  });
  res.json({ ok: true });
});

module.exports = router;
