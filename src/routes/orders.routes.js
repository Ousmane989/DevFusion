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

module.exports = router;
