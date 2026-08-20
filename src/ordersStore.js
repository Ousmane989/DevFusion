'use strict';

const db = require('./db');
const { statusMeta } = require('./catalog');
const { fireWebhooks } = require('./webhooks');

function publicOrder(row) {
  let items = [];
  try { items = JSON.parse(row.items_json); } catch { items = []; }
  const st = statusMeta(row.status);
  const d = new Date(row.created_at + 'Z');
  return {
    id: row.id,
    ref: row.ref,
    customer: row.customer_name,
    phone: row.customer_phone,
    city: row.city,
    address: row.address,
    note: row.note,
    items,
    itemsCount: items.reduce((t, x) => t + (x.qty || 1), 0),
    productsLabel: items.map((x) => `${x.name}${x.variant ? ' (' + x.variant + ')' : ''} ×${x.qty}`).join(', '),
    subtotal: row.subtotal_mru,
    shipping: row.shipping_mru,
    amount: row.total_mru,
    payment: row.payment,
    status: st.key,
    statusLabel: st.label,
    tone: st.tone,
    date: isNaN(d) ? '' : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
  };
}

function listOrders(userId) {
  return db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC').all(userId).map(publicOrder);
}

function summarize(orders) {
  const s = { total: orders.length, toProcess: 0, delivered: 0, revenue: 0 };
  for (const o of orders) {
    if (o.status === 'nouvelle' || o.status === 'confirmee' || o.status === 'expediee') s.toProcess++;
    if (o.status === 'livree') { s.delivered++; s.revenue += o.amount; }
  }
  return s;
}

function nextRef() {
  const n = (db.prepare('SELECT COUNT(*) AS c FROM orders').get().c || 0) + 10521;
  return '#KRT-' + n;
}

function createOrder({ userId, customer, phone, city, address, note, items, subtotal, shipping, total }) {
  const ref = nextRef();
  const info = db.prepare(
    `INSERT INTO orders (user_id, ref, customer_name, customer_phone, city, address, note, items_json, subtotal_mru, shipping_mru, total_mru, payment, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cod', 'nouvelle')`
  ).run(userId, ref, customer, phone || '', city || '', address || '', note || '', JSON.stringify(items), subtotal, shipping, total);
  const order = publicOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(info.lastInsertRowid));
  fireWebhooks(userId, 'order.created', order);
  return order;
}

// Cree quelques commandes de demonstration si la boutique n'en a aucune,
// pour que la page Commandes ne soit pas vide.
function seedIfEmpty(userId) {
  const count = db.prepare('SELECT COUNT(*) AS c FROM orders WHERE user_id = ?').get(userId).c;
  if (count > 0) return;

  const owned = db.prepare('SELECT name, price_mru FROM products WHERE user_id = ? LIMIT 12').all(userId);
  const catalogue = owned.length
    ? owned
    : [
        { name: 'Boubou brodé main', price_mru: 2500 }, { name: 'Foulard en soie', price_mru: 1800 },
        { name: 'Sérum éclat', price_mru: 3200 }, { name: 'Sac en cuir artisanal', price_mru: 5400 },
        { name: 'Montre dorée', price_mru: 7000 }, { name: 'Thé Touba premium', price_mru: 900 },
      ];
  const clients = ['Fatimetou Mint A.', 'Ousmane Diallo', 'Aïcha Ba', 'Moussa Sow', 'Mariam Kane', 'Cheikh Ndiaye', 'Ramata Lô'];
  const cities = ['Nouakchott', 'Nouadhibou', 'Rosso', 'Dakar', 'Thiès'];
  const statuses = ['livree', 'livree', 'expediee', 'confirmee', 'nouvelle', 'nouvelle', 'annulee'];
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const now = new Date();

  for (let i = 0; i < 7; i++) {
    const p = catalogue[rnd(0, catalogue.length - 1)];
    const qty = rnd(1, 3);
    const subtotal = p.price_mru * qty;
    const shipping = [100, 350, 1500, 2500][rnd(0, 3)];
    const d = new Date(now); d.setDate(now.getDate() - i);
    db.prepare(
      `INSERT INTO orders (user_id, ref, customer_name, customer_phone, city, address, note, items_json, subtotal_mru, shipping_mru, total_mru, payment, status, created_at)
       VALUES (?, ?, ?, ?, ?, '', '', ?, ?, ?, ?, 'cod', ?, ?)`
    ).run(
      userId, '#KRT-' + (10520 - i * 3), clients[rnd(0, clients.length - 1)], '+222' + rnd(20000000, 49999999),
      cities[rnd(0, cities.length - 1)], JSON.stringify([{ name: p.name, price: p.price_mru, qty }]),
      subtotal, shipping, subtotal + shipping, statuses[i], d.toISOString().slice(0, 19).replace('T', ' ')
    );
  }
}

module.exports = { publicOrder, listOrders, summarize, createOrder, seedIfEmpty };
