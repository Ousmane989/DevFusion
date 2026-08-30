'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware');
const { ORDER_STATUSES } = require('../catalog');
const { listOrders, summarize, publicOrder } = require('../ordersStore');
const { fireWebhooks } = require('../webhooks');

const router = express.Router();

// GET /api/orders  — liste des commandes + synthèse + statuts disponibles
// (aucune donnee de demonstration : une nouvelle boutique commence a zero)
router.get('/', requireAuth, async (req, res) => {
  const orders = await listOrders(req.user.id);
  res.json({ orders, summary: summarize(orders), statuses: ORDER_STATUSES });
});

// GET /api/orders/ping — sonde légère pour détecter les nouvelles commandes
// (id de la dernière commande + nombre à traiter), utilisée par le tableau de
// bord pour jouer un son en temps réel quand une commande arrive.
router.get('/ping', requireAuth, async (req, res) => {
  const last = await db.prepare('SELECT MAX(id) AS id FROM orders WHERE user_id = ?').get(req.user.id);
  const pend = await db.prepare(
    "SELECT COUNT(*) AS c FROM orders WHERE user_id = ? AND status IN ('nouvelle','confirmee','expediee')"
  ).get(req.user.id);
  res.json({ lastId: Number(last && last.id) || 0, pending: Number(pend && pend.c) || 0 });
});

// PUT /api/orders/:id/status  { status }  — met a jour le statut
router.put('/:id/status', requireAuth, async (req, res) => {
  const status = String(req.body?.status || '');
  if (!ORDER_STATUSES.some((s) => s.key === status)) {
    return res.status(400).json({ error: 'Statut invalide.' });
  }
  const info = await db.prepare('UPDATE orders SET status = ? WHERE id = ? AND user_id = ?').run(status, req.params.id, req.user.id);
  if (!info.changes) return res.status(404).json({ error: 'Commande introuvable.' });
  const row = await db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (row) await fireWebhooks(req.user.id, 'order.updated', publicOrder(row));
  const orders = await listOrders(req.user.id);
  res.json({ ok: true, summary: summarize(orders) });
});

// DELETE /api/orders/:id — supprime une commande de la boutique active.
router.delete('/:id', requireAuth, async (req, res) => {
  const info = await db.prepare('DELETE FROM orders WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (!info.changes) return res.status(404).json({ error: 'Commande introuvable.' });
  const orders = await listOrders(req.user.id);
  res.json({ ok: true, summary: summarize(orders) });
});

module.exports = router;
