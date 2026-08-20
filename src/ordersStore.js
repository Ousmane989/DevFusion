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

async function listOrders(userId) {
  const rows = await db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC').all(userId);
  return rows.map(publicOrder);
}

function summarize(orders) {
  const s = { total: orders.length, toProcess: 0, delivered: 0, revenue: 0 };
  for (const o of orders) {
    if (o.status === 'nouvelle' || o.status === 'confirmee' || o.status === 'expediee') s.toProcess++;
    if (o.status === 'livree') { s.delivered++; s.revenue += o.amount; }
  }
  return s;
}

async function nextRef() {
  const row = await db.prepare('SELECT COUNT(*) AS c FROM orders').get();
  return '#KRT-' + ((Number(row && row.c) || 0) + 10521);
}

async function createOrder({ userId, customer, phone, city, address, note, items, subtotal, shipping, total }) {
  const ref = await nextRef();
  const info = await db.prepare(
    `INSERT INTO orders (user_id, ref, customer_name, customer_phone, city, address, note, items_json, subtotal_mru, shipping_mru, total_mru, payment, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cod', 'nouvelle')`
  ).run(userId, ref, customer, phone || '', city || '', address || '', note || '', JSON.stringify(items), subtotal, shipping, total);
  const row = await db.prepare('SELECT * FROM orders WHERE id = ?').get(info.lastInsertRowid);
  const order = publicOrder(row);
  await fireWebhooks(userId, 'order.created', order);
  return order;
}

module.exports = { publicOrder, listOrders, summarize, createOrder };
