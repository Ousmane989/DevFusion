'use strict';

// Espace developpeur : cles API et webhooks, plus une API v1 authentifiee par cle.
const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware');
const { listOrders } = require('../ordersStore');
const { publicProduct } = require('../catalog');
const { listWebhooks, deliver } = require('../webhooks');

const router = express.Router();   // gestion (session)
const apiV1 = express.Router();    // API publique authentifiee par cle

const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const WEBHOOK_EVENTS = ['order.created', 'order.updated'];

function publicKey(k) {
  return { id: k.id, label: k.label, prefix: k.prefix, createdAt: k.created_at, lastUsedAt: k.last_used_at };
}
function publicHook(h) {
  return { id: h.id, url: h.url, events: String(h.events || '').split(',').filter(Boolean), secret: h.secret, active: !!h.active, createdAt: h.created_at };
}

// GET /api/dev — cles + webhooks
router.get('/', requireAuth, async (req, res) => {
  const keys = (await db.prepare('SELECT * FROM api_keys WHERE user_id = ? ORDER BY id DESC').all(req.user.id)).map(publicKey);
  const hooks = (await listWebhooks(req.user.id)).map(publicHook);
  res.json({ keys, webhooks: hooks, events: WEBHOOK_EVENTS, endpoints: ['GET /api/v1/products', 'GET /api/v1/orders', 'GET /api/v1/store'] });
});

// POST /api/dev/key { label } — genere une cle (renvoyee EN CLAIR une seule fois)
router.post('/key', requireAuth, async (req, res) => {
  const label = String((req.body && req.body.label) || 'Ma clé').trim().slice(0, 60) || 'Ma clé';
  const secret = crypto.randomBytes(24).toString('hex');
  const key = 'karat_live_' + secret;
  const prefix = key.slice(0, 16);
  await db.prepare('INSERT INTO api_keys (user_id, label, prefix, key_hash) VALUES (?, ?, ?, ?)')
    .run(req.user.id, label, prefix, sha256(key));
  const row = await db.prepare('SELECT * FROM api_keys WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(req.user.id);
  res.status(201).json({ ok: true, key, created: publicKey(row) });
});

// DELETE /api/dev/key/:id
router.delete('/key/:id', requireAuth, async (req, res) => {
  await db.prepare('DELETE FROM api_keys WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// POST /api/dev/webhook { url, events }
router.post('/webhook', requireAuth, async (req, res) => {
  const b = req.body || {};
  const url = String(b.url || '').trim();
  if (!/^https?:\/\/.+/i.test(url)) return res.status(400).json({ errors: { url: 'URL invalide (http/https).' } });
  const events = Array.isArray(b.events) ? b.events.filter((e) => WEBHOOK_EVENTS.includes(e)) : WEBHOOK_EVENTS;
  const secret = 'whsec_' + crypto.randomBytes(16).toString('hex');
  await db.prepare('INSERT INTO webhooks (user_id, url, events, secret, active) VALUES (?, ?, ?, ?, 1)')
    .run(req.user.id, url.slice(0, 300), (events.length ? events : WEBHOOK_EVENTS).join(','), secret);
  const row = await db.prepare('SELECT * FROM webhooks WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(req.user.id);
  res.status(201).json({ ok: true, webhook: publicHook(row) });
});

// DELETE /api/dev/webhook/:id
router.delete('/webhook/:id', requireAuth, async (req, res) => {
  await db.prepare('DELETE FROM webhooks WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// POST /api/dev/webhook/:id/test — envoie un evenement de test
router.post('/webhook/:id/test', requireAuth, async (req, res) => {
  const hook = await db.prepare('SELECT * FROM webhooks WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!hook) return res.status(404).json({ error: 'Webhook introuvable.' });
  const result = await deliver(hook, 'ping', { message: 'Test depuis Karat', at: new Date().toISOString() });
  res.json({ ok: result.ok, result });
});

// ------------------------------------------------------------------
// API v1 — authentifiee par cle (Authorization: Bearer karat_live_...)
// ------------------------------------------------------------------
async function apiKeyAuth(req, res, next) {
  try {
    const h = req.get('authorization') || '';
    const m = h.match(/^Bearer\s+(.+)$/i);
    const key = m ? m[1].trim() : (req.query.api_key || '');
    if (!key) return res.status(401).json({ error: 'Clé API manquante (Authorization: Bearer …).' });
    const row = await db.prepare('SELECT * FROM api_keys WHERE key_hash = ?').get(sha256(key));
    if (!row) return res.status(401).json({ error: 'Clé API invalide.' });
    await db.prepare("UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?").run(row.id);
    req.apiUserId = row.user_id;
    next();
  } catch (err) { next(err); }
}

apiV1.get('/products', apiKeyAuth, async (req, res) => {
  const products = (await db.prepare('SELECT * FROM products WHERE user_id = ? ORDER BY id DESC').all(req.apiUserId)).map(publicProduct);
  res.json({ products });
});
apiV1.get('/orders', apiKeyAuth, async (req, res) => {
  res.json({ orders: await listOrders(req.apiUserId) });
});
apiV1.get('/store', apiKeyAuth, async (req, res) => {
  const s = (await db.prepare('SELECT * FROM store_settings WHERE user_id = ?').get(req.apiUserId)) || {};
  const u = (await db.prepare('SELECT shop_name, currency FROM users WHERE id = ?').get(req.apiUserId)) || {};
  res.json({ store: { shopName: u.shop_name, currency: u.currency, theme: s.theme, tagline: s.tagline } });
});

module.exports = { router, apiV1 };
