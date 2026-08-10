'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware');

const router = express.Router();

// Genere une liste de commandes de demonstration, deterministe par
// boutique. En production, proviendrait d'une table `orders`.
function seededOrders(user) {
  let s = 0;
  const key = `orders:${user.id}:${user.shop_name}`;
  for (const ch of key) s = (s * 31 + ch.charCodeAt(0)) % 2147483647;
  if (s <= 0) s = 98765;
  const next = () => { s = (s * 48271) % 2147483647; return s / 2147483647; };
  const rand = (min, max) => min + next() * (max - min);
  const randi = (min, max) => Math.floor(rand(min, max + 1));

  // Produits reels de la boutique s'il y en a, sinon exemples.
  const owned = db.prepare('SELECT name FROM products WHERE user_id = ? LIMIT 20').all(user.id).map((r) => r.name);
  const products = owned.length
    ? owned
    : ['Boubou brodé main', 'Sac en cuir artisanal', 'Casque sans fil', 'Montre dorée', 'Foulard en soie', 'Sandales cuir', 'Sérum éclat', 'Thé Touba premium'];
  const clients = ['Fatimetou Mint A.', 'Ousmane Diallo', 'Aïcha Ba', 'Moussa Sow', 'Mariam Kane', 'Cheikh Ndiaye', 'Ramata Lô', 'Ibrahima Fall', 'Khadija Sy', 'Amadou Bâ'];
  const cities = ['Nouakchott', 'Nouadhibou', 'Rosso', 'Dakar', 'Thiès', 'Kaédi'];
  const statuses = [
    { label: 'Payée', tone: 'good' },
    { label: 'En cours', tone: 'warning' },
    { label: 'Expédiée', tone: 'info' },
    { label: 'Livrée', tone: 'good' },
    { label: 'Remboursée', tone: 'critical' },
  ];

  const now = new Date();
  const orders = [];
  for (let i = 0; i < 24; i++) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    const st = statuses[randi(0, statuses.length - 1)];
    const items = randi(1, 3);
    orders.push({
      ref: '#KRT-' + (10520 - i * 4),
      client: clients[randi(0, clients.length - 1)],
      city: cities[randi(0, cities.length - 1)],
      product: products[randi(0, products.length - 1)],
      items,
      amount: Math.round(rand(1200, 16000)),
      status: st.label,
      tone: st.tone,
      date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
    });
  }

  const summary = { total: orders.length, revenue: orders.reduce((t, o) => t + o.amount, 0) };
  summary.paid = orders.filter((o) => o.status === 'Payée' || o.status === 'Livrée').length;
  summary.pending = orders.filter((o) => o.status === 'En cours' || o.status === 'Expédiée').length;
  return { orders, summary };
}

// GET /api/orders
router.get('/', requireAuth, (req, res) => {
  res.json(seededOrders(req.user));
});

module.exports = router;
