'use strict';

// Vitrine publique d'une boutique — accessible sans authentification.
const express = require('express');
const db = require('../db');
const { themeById, defaultShipping, publicProduct, slugify } = require('../catalog');
const { createOrder } = require('../ordersStore');

const router = express.Router();

function findUserBySlug(slug) {
  const users = db.prepare('SELECT * FROM users WHERE email_verified = 1').all();
  return users.find((u) => slugify(u.shop_name) === slug) || null;
}

function shippingFor(userId, city) {
  const row = db.prepare('SELECT shipping_json FROM store_settings WHERE user_id = ?').get(userId);
  let sh = defaultShipping();
  try { if (row && row.shipping_json) sh = JSON.parse(row.shipping_json); } catch { /* défaut */ }
  return sh;
}

// GET /api/public/store/:slug  — données de la vitrine (thème + produits actifs)
router.get('/store/:slug', (req, res) => {
  const user = findUserBySlug(req.params.slug);
  if (!user) return res.status(404).json({ error: 'Boutique introuvable.' });

  let settings = db.prepare('SELECT * FROM store_settings WHERE user_id = ?').get(user.id);
  const theme = themeById(settings ? settings.theme : 'or-noir');
  let shipping = defaultShipping();
  try { if (settings && settings.shipping_json) shipping = JSON.parse(settings.shipping_json); } catch { /* défaut */ }

  const products = db
    .prepare('SELECT * FROM products WHERE user_id = ? AND active = 1 ORDER BY id DESC')
    .all(user.id)
    .map(publicProduct);

  res.json({
    shopName: user.shop_name,
    slug: slugify(user.shop_name),
    currency: user.currency || 'MRU',
    tagline: (settings && settings.tagline) || 'Bienvenue dans notre boutique.',
    heroTitle: (settings && settings.hero_title) || '',
    about: (settings && settings.about) || '',
    description: (settings && settings.description) || '',
    contact: {
      phone: (settings && settings.phone) || '',
      whatsapp: (settings && settings.whatsapp) || '',
      email: (settings && settings.email) || '',
      address: (settings && settings.address) || '',
    },
    theme: theme.id,
    themeData: theme,
    shipping,
    products,
    categories: [...new Set(products.map((p) => p.category))],
  });
});

// Journalise un evenement de la vitrine (analytics reels).
function logEvent(slug, type, source) {
  const user = findUserBySlug(slug);
  if (!user) return false;
  db.prepare('INSERT INTO store_events (user_id, type, source) VALUES (?, ?, ?)').run(user.id, type, source || 'direct');
  return true;
}

// POST /api/public/store/:slug/visit  { source }
router.post('/store/:slug/visit', (req, res) => {
  const src = ['direct', 'social', 'search', 'whatsapp', 'referral'].includes(req.body?.source) ? req.body.source : 'direct';
  res.json({ ok: logEvent(req.params.slug, 'visit', src) });
});

// POST /api/public/store/:slug/event  { type }
router.post('/store/:slug/event', (req, res) => {
  const type = req.body?.type === 'add_cart' ? 'add_cart' : null;
  if (!type) return res.status(400).json({ error: 'Type invalide.' });
  res.json({ ok: logEvent(req.params.slug, type, 'direct') });
});

// POST /api/public/store/:slug/order  — passer une commande (paiement à la livraison)
router.post('/store/:slug/order', (req, res) => {
  const user = findUserBySlug(req.params.slug);
  if (!user) return res.status(404).json({ error: 'Boutique introuvable.' });

  const b = req.body || {};
  const errors = {};
  if (!b.name || String(b.name).trim().length < 2) errors.name = 'Nom requis.';
  if (!b.phone || String(b.phone).trim().length < 6) errors.phone = 'Téléphone requis.';
  if (!b.city || String(b.city).trim().length < 2) errors.city = 'Ville requise.';
  if (!Array.isArray(b.items) || !b.items.length) errors.items = 'Panier vide.';
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  // Recalcule les prix cote serveur (on ne fait pas confiance au client).
  const items = [];
  let subtotal = 0;
  for (const it of b.items) {
    const prod = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ? AND active = 1').get(it.id, user.id);
    if (!prod) continue;
    const qty = Math.max(1, Math.min(99, Math.round(Number(it.qty) || 1)));
    subtotal += prod.price_mru * qty;
    items.push({ name: prod.name, price: prod.price_mru, qty });
  }
  if (!items.length) return res.status(400).json({ errors: { items: 'Aucun produit valide.' } });

  // Frais de livraison selon la ville / zone.
  const sh = shippingFor(user.id);
  const zone = (sh.zones || []).find((z) => z.zone.toLowerCase() === String(b.city).trim().toLowerCase());
  let shipping = zone ? zone.fee : 0;
  if (sh.freeOver && subtotal >= sh.freeOver) shipping = 0;
  const total = subtotal + shipping;

  const order = createOrder({
    userId: user.id, customer: String(b.name).trim(), phone: String(b.phone).trim(),
    city: String(b.city).trim(), address: String(b.address || '').trim(), note: String(b.note || '').trim(),
    items, subtotal, shipping, total,
  });

  res.status(201).json({ ok: true, ref: order.ref, subtotal, shipping, total, payment: 'cod' });
});

module.exports = router;
