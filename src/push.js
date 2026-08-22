'use strict';

// ------------------------------------------------------------------
// Notifications push Web (Web Push / VAPID).
//   • Les clés VAPID sont stockées dans la table app_config (Supabase),
//     générées une seule fois — pas de variable d'environnement à gérer.
//   • Chaque appareil du commerçant enregistre un abonnement (push_subscriptions).
//   • À la réception d'une commande, on envoie une notification à tous ses
//     appareils : elle s'affiche sur le téléphone (avec le son du système)
//     même quand l'application est fermée.
// ------------------------------------------------------------------

const webpush = require('web-push');
const db = require('./db');

let configured = null; // Promise<boolean> mise en cache

async function getConfig(key) {
  const row = await db.prepare('SELECT value FROM app_config WHERE key = ?').get(key);
  return row ? row.value : '';
}

// Configure web-push avec les clés VAPID (une seule fois par instance).
async function ensureConfigured() {
  if (configured) return configured;
  configured = (async () => {
    try {
      const pub = await getConfig('vapid_public');
      const priv = await getConfig('vapid_private');
      const subject = (await getConfig('vapid_subject')) || 'mailto:contact@karat.app';
      if (!pub || !priv) return false;
      webpush.setVapidDetails(subject, pub, priv);
      return true;
    } catch (e) {
      configured = null; // permet une nouvelle tentative plus tard
      return false;
    }
  })();
  return configured;
}

async function getPublicKey() {
  return getConfig('vapid_public');
}

// Enregistre (ou met à jour) l'abonnement d'un appareil.
async function saveSubscription(userId, sub) {
  if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
    throw new Error('Abonnement invalide.');
  }
  await db.prepare(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`
  ).run(userId, String(sub.endpoint), String(sub.keys.p256dh), String(sub.keys.auth));
}

async function removeSubscription(userId, endpoint) {
  await db.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?').run(userId, String(endpoint));
}

async function countSubscriptions(userId) {
  const row = await db.prepare('SELECT COUNT(*) AS c FROM push_subscriptions WHERE user_id = ?').get(userId);
  return Number(row && row.c) || 0;
}

// Envoie une notification à tous les appareils d'un commerçant.
// Ne lève jamais d'erreur : un échec d'envoi ne doit pas casser la commande.
async function sendToUser(userId, payload) {
  try {
    if (!(await ensureConfigured())) return;
    const subs = await db.prepare('SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?').all(userId);
    if (!subs.length) return;
    const body = JSON.stringify(payload || {});
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            body,
            { TTL: 3600, urgency: 'high' }
          );
        } catch (e) {
          // 404 / 410 : abonnement expiré ou révoqué -> on le supprime.
          const code = e && e.statusCode;
          if (code === 404 || code === 410) {
            try { await removeSubscription(userId, s.endpoint); } catch (_) { /* ignore */ }
          }
        }
      })
    );
  } catch (_) {
    /* silencieux : la notification est un « plus », jamais bloquant */
  }
}

module.exports = { getPublicKey, saveSubscription, removeSubscription, countSubscriptions, sendToUser };
