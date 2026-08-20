'use strict';

// Vitrine publique d'une boutique — accessible sans authentification.
const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { themeById, defaultShipping, publicProduct, slugify } = require('../catalog');
const { createOrder } = require('../ordersStore');
const { config } = require('../config');
const { findStore } = require('../storefront');

const router = express.Router();

// Sources de trafic reconnues (dont les campagnes Facebook / Instagram).
const TRAFFIC_SOURCES = ['direct', 'social', 'search', 'whatsapp', 'referral', 'facebook', 'instagram', 'ads'];

// Slug effectif d'une boutique (personnalise ou derive du nom).
function effectiveSlug(user, settings) {
  return (settings && settings.slug) ? settings.slug : slugify(user.shop_name);
}

// Base absolue pour les liens publics (flux catalogue, Open Graph).
function baseUrl(req) {
  if (config.publicBaseUrl) return config.publicBaseUrl;
  return req.protocol + '://' + req.get('host');
}

// Anti-spam : limite les commandes et les evenements par IP.
const orderLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Trop de commandes. Reessayez dans une minute.' } });
const eventLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false, message: { error: 'Trop de requetes.' } });

async function findUserBySlug(slug) {
  const s = await findStore(slug);
  return s ? s.user : null;
}

async function shippingFor(userId) {
  const row = await db.prepare('SELECT shipping_json FROM store_settings WHERE user_id = ?').get(userId);
  let sh = defaultShipping();
  try { if (row && row.shipping_json) sh = JSON.parse(row.shipping_json); } catch { /* défaut */ }
  return sh;
}

// GET /api/public/store/:slug  — données de la vitrine (thème + produits actifs)
router.get('/store/:slug', async (req, res) => {
  const user = await findUserBySlug(req.params.slug);
  if (!user) return res.status(404).json({ error: 'Boutique introuvable.' });

  const settings = await db.prepare('SELECT * FROM store_settings WHERE user_id = ?').get(user.id);
  const theme = themeById(settings ? settings.theme : 'or-noir');
  let shipping = defaultShipping();
  try { if (settings && settings.shipping_json) shipping = JSON.parse(settings.shipping_json); } catch { /* défaut */ }

  const products = (await db
    .prepare('SELECT * FROM products WHERE user_id = ? AND active = 1 ORDER BY id DESC')
    .all(user.id))
    .map(publicProduct);

  const instagram = (settings && settings.instagram) || '';
  res.json({
    shopName: user.shop_name,
    slug: effectiveSlug(user, settings),
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
      facebook: (settings && settings.fb_page) || '',
      instagram: instagram ? 'https://instagram.com/' + instagram : '',
    },
    // Pixel Meta pour le suivi des campagnes Facebook / Instagram.
    marketing: { metaPixelId: (settings && settings.meta_pixel_id) || '' },
    // Paiement mobile facultatif (en plus du paiement a la livraison).
    payment: { wave: (settings && settings.wave_number) || '', om: (settings && settings.om_number) || '' },
    // Personnalisation visuelle.
    logo: (settings && settings.logo) || '',
    banner: (settings && settings.banner) || '',
    returnsPolicy: (settings && settings.returns_policy) || '',
    theme: theme.id,
    themeData: theme,
    shipping,
    products,
    categories: [...new Set(products.map((p) => p.category))],
  });
});

// GET /api/public/store/:slug/catalog.csv — flux produits pour le
// Gestionnaire de ventes Meta (catalogue Facebook / Instagram Shopping,
// publicités dynamiques). Format CSV conforme aux champs requis par Meta.
router.get('/store/:slug/catalog.csv', async (req, res) => {
  const user = await findUserBySlug(req.params.slug);
  if (!user) return res.status(404).type('text/plain').send('Boutique introuvable.');
  const settings = await db.prepare('SELECT * FROM store_settings WHERE user_id = ?').get(user.id);
  const slug = effectiveSlug(user, settings);
  const currency = user.currency || 'MRU';
  const base = baseUrl(req);
  const storeLink = base + '/boutique/' + slug;

  const products = (await db
    .prepare('SELECT * FROM products WHERE user_id = ? AND active = 1 ORDER BY id DESC')
    .all(user.id))
    .map(publicProduct);

  const csvCell = (v) => {
    const s = String(v == null ? '' : v).replace(/"/g, '""').replace(/[\r\n]+/g, ' ');
    return /[",]/.test(s) ? `"${s}"` : s;
  };
  const rows = [['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand']];
  for (const p of products) {
    // Meta n'accepte pas les data URL en image_link : on n'exporte que les URL http(s).
    const image = /^https?:\/\//i.test(p.image) ? p.image : '';
    rows.push([
      'KRT-' + p.id,
      p.name,
      p.description || p.name,
      p.stock > 0 ? 'in stock' : 'out of stock',
      'new',
      `${Math.round(p.price)} ${currency}`,
      `${storeLink}?produit=${p.id}`,
      image,
      user.shop_name,
    ]);
  }
  const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n');
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `inline; filename="catalogue-${slug}.csv"`);
  res.send(csv);
});

// Journalise un evenement de la vitrine (analytics reels).
async function logEvent(slug, type, source) {
  const user = await findUserBySlug(slug);
  if (!user) return false;
  await db.prepare('INSERT INTO store_events (user_id, type, source) VALUES (?, ?, ?)').run(user.id, type, source || 'direct');
  return true;
}

// POST /api/public/store/:slug/visit  { source }
router.post('/store/:slug/visit', eventLimiter, async (req, res) => {
  const src = TRAFFIC_SOURCES.includes(req.body?.source) ? req.body.source : 'direct';
  res.json({ ok: await logEvent(req.params.slug, 'visit', src) });
});

// POST /api/public/store/:slug/event  { type }
router.post('/store/:slug/event', eventLimiter, async (req, res) => {
  const type = req.body?.type === 'add_cart' ? 'add_cart' : null;
  if (!type) return res.status(400).json({ error: 'Type invalide.' });
  res.json({ ok: await logEvent(req.params.slug, type, 'direct') });
});

// POST /api/public/store/:slug/order  — passer une commande (paiement à la livraison)
router.post('/store/:slug/order', orderLimiter, async (req, res) => {
  const user = await findUserBySlug(req.params.slug);
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
    const prod = await db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ? AND active = 1').get(it.id, user.id);
    if (!prod) continue;
    const qty = Math.max(1, Math.min(99, Math.round(Number(it.qty) || 1)));
    subtotal += prod.price_mru * qty;
    // Variante choisie (ex. couleur), validée contre celles du produit.
    const allowed = String(prod.variants || '').split(',').map((s) => s.trim()).filter(Boolean);
    let variant = it.variant ? String(it.variant).trim().slice(0, 30) : '';
    if (variant && allowed.length && !allowed.includes(variant)) variant = '';
    items.push({ name: prod.name, price: prod.price_mru, qty, variant });
  }
  if (!items.length) return res.status(400).json({ errors: { items: 'Aucun produit valide.' } });

  // Frais de livraison selon la ville / zone.
  const sh = await shippingFor(user.id);
  const zone = (sh.zones || []).find((z) => z.zone.toLowerCase() === String(b.city).trim().toLowerCase());
  let shipping = zone ? zone.fee : 0;
  if (sh.freeOver && subtotal >= sh.freeOver) shipping = 0;
  const total = subtotal + shipping;

  const order = await createOrder({
    userId: user.id, customer: String(b.name).trim(), phone: String(b.phone).trim(),
    city: String(b.city).trim(), address: String(b.address || '').trim(), note: String(b.note || '').trim(),
    items, subtotal, shipping, total,
  });

  res.status(201).json({ ok: true, ref: order.ref, subtotal, shipping, total, payment: 'cod' });
});

module.exports = router;
