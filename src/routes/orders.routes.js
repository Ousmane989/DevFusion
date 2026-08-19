'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware');
const { ORDER_STATUSES } = require('../catalog');
const { listOrders, summarize } = require('../ordersStore');

const router = express.Router();

// GET /api/orders  — liste des commandes + synthèse + statuts disponibles
// (aucune donnee de demonstration : une nouvelle boutique commence a zero)
router.get('/', requireAuth, (req, res) => {
  const orders = listOrders(req.user.id);
  res.json({ orders, summary: summarize(orders), statuses: ORDER_STATUSES });
});

// PUT /api/orders/:id/status  { status }  — met a jour le statut
router.put('/:id/status', requireAuth, (req, res) => {
  const status = String(req.body?.status || '');
  if (!ORDER_STATUSES.some((s) => s.key === status)) {
    return res.status(400).json({ error: 'Statut invalide.' });
  }
  const info = db.prepare('UPDATE orders SET status = ? WHERE id = ? AND user_id = ?').run(status, req.params.id, req.user.id);
  if (!info.changes) return res.status(404).json({ error: 'Commande introuvable.' });
  const orders = listOrders(req.user.id);
  res.json({ ok: true, summary: summarize(orders) });
});

module.exports = router;
