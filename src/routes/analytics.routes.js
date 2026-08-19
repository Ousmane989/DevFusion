'use strict';

// Analyses avancees : meilleures ventes, villes, statuts, taux de livraison.
// Tout est calcule a partir des commandes reelles (0 pour une nouvelle boutique).
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware');
const { ORDER_STATUSES } = require('../catalog');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT items_json, city, status, total_mru, created_at FROM orders WHERE user_id = ?').all(req.user.id);
  const currency = req.user.currency || 'MRU';
  const isDelivered = (s) => s === 'livree';

  // ---- Meilleures ventes (par quantite et par CA livre) ----
  const prod = {};
  let unitsTotal = 0;
  for (const r of rows) {
    let items = [];
    try { items = JSON.parse(r.items_json); } catch { items = []; }
    for (const it of items) {
      const key = it.name || 'Produit';
      const p = prod[key] || (prod[key] = { name: key, qty: 0, revenue: 0, orders: 0 });
      const qty = Number(it.qty) || 1;
      p.qty += qty; p.orders += 1; unitsTotal += qty;
      if (isDelivered(r.status)) p.revenue += (Number(it.price) || 0) * qty;
    }
  }
  const topProducts = Object.values(prod).sort((a, b) => b.qty - a.qty).slice(0, 8);

  // ---- Ventes par ville ----
  const cityMap = {};
  for (const r of rows) {
    const c = r.city || '—';
    const m = cityMap[c] || (cityMap[c] = { city: c, orders: 0, revenue: 0 });
    m.orders += 1;
    if (isDelivered(r.status)) m.revenue += r.total_mru;
  }
  const byCity = Object.values(cityMap).sort((a, b) => b.orders - a.orders).slice(0, 8);

  // ---- Repartition par statut ----
  const statusMap = {};
  for (const r of rows) statusMap[r.status] = (statusMap[r.status] || 0) + 1;
  const byStatus = ORDER_STATUSES.map((s) => ({ key: s.key, label: s.label, tone: s.tone, value: statusMap[s.key] || 0 }));

  const totalOrders = rows.length;
  const delivered = rows.filter((r) => isDelivered(r.status)).length;
  const cancelled = rows.filter((r) => r.status === 'annulee').length;
  const deliveryRate = totalOrders ? Number(((delivered / totalOrders) * 100).toFixed(1)) : 0;
  const cancelRate = totalOrders ? Number(((cancelled / totalOrders) * 100).toFixed(1)) : 0;
  const revenue = rows.filter((r) => isDelivered(r.status)).reduce((s, r) => s + r.total_mru, 0);
  const avgBasket = delivered ? Math.round(revenue / delivered) : 0;

  res.json({
    currency,
    summary: { totalOrders, delivered, cancelled, deliveryRate, cancelRate, revenue, avgBasket, unitsTotal },
    topProducts, byCity, byStatus,
  });
});

module.exports = router;
