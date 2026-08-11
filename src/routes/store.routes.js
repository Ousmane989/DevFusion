'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware');
const { THEMES, themeById, defaultShipping, slugify } = require('../catalog');

const router = express.Router();

// Recupere (ou cree a la volee) les reglages de boutique d'un utilisateur.
function getSettings(user) {
  let row = db.prepare('SELECT * FROM store_settings WHERE user_id = ?').get(user.id);
  if (!row) {
    db.prepare('INSERT INTO store_settings (user_id, tagline, shipping_json) VALUES (?, ?, ?)').run(
      user.id,
      'Des produits de qualité, livrés près de chez vous.',
      JSON.stringify(defaultShipping())
    );
    row = db.prepare('SELECT * FROM store_settings WHERE user_id = ?').get(user.id);
  }
  return row;
}

function publicStore(user, row) {
  let shipping;
  try { shipping = JSON.parse(row.shipping_json); } catch { shipping = defaultShipping(); }
  const t = themeById(row.theme);
  const slug = slugify(user.shop_name);
  return {
    shopName: user.shop_name,
    theme: t.id,
    themeData: t,
    tagline: row.tagline,
    heroTitle: row.hero_title || '',
    about: row.about || '',
    description: row.description,
    phone: row.phone || '',
    whatsapp: row.whatsapp || '',
    email: row.email || '',
    address: row.address || '',
    currency: user.currency || 'MRU',
    slug,
    domain: row.domain || `${slug}.karat.shop`,
    defaultDomain: `${slug}.karat.shop`,
    shipping,
  };
}

// GET /api/store  — reglages + liste des themes disponibles
router.get('/', requireAuth, (req, res) => {
  const row = getSettings(req.user);
  res.json({ store: publicStore(req.user, row), themes: THEMES });
});

// PUT /api/store  — theme, slogan, domaine, description
router.put('/', requireAuth, (req, res) => {
  const row = getSettings(req.user);
  const b = req.body || {};
  const theme = THEMES.some((t) => t.id === b.theme) ? b.theme : row.theme;
  const keep = (v, old, max) => (v !== undefined ? String(v).slice(0, max) : old);
  db.prepare(
    `UPDATE store_settings SET theme = ?, tagline = ?, hero_title = ?, about = ?, domain = ?, description = ?, phone = ?, whatsapp = ?, email = ?, address = ?, updated_at = datetime('now') WHERE user_id = ?`
  ).run(
    theme,
    keep(b.tagline, row.tagline, 140),
    keep(b.heroTitle, row.hero_title, 120),
    keep(b.about, row.about, 600),
    keep(b.domain, row.domain, 120),
    keep(b.description, row.description, 400),
    keep(b.phone, row.phone, 40),
    keep(b.whatsapp, row.whatsapp, 40),
    keep(b.email, row.email, 120),
    keep(b.address, row.address, 160),
    req.user.id
  );
  res.json({ ok: true, store: publicStore(req.user, getSettings(req.user)) });
});

// PUT /api/store/shipping  — zones et frais de livraison
router.put('/shipping', requireAuth, (req, res) => {
  const row = getSettings(req.user);
  const b = req.body || {};
  let zones = Array.isArray(b.zones) ? b.zones : [];
  zones = zones
    .filter((z) => z && String(z.zone).trim())
    .slice(0, 12)
    .map((z) => ({ zone: String(z.zone).trim().slice(0, 60), fee: Math.max(0, Math.round(Number(z.fee) || 0)) }));
  const shipping = { freeOver: Math.max(0, Math.round(Number(b.freeOver) || 0)), zones };
  db.prepare(`UPDATE store_settings SET shipping_json = ?, updated_at = datetime('now') WHERE user_id = ?`).run(
    JSON.stringify(shipping),
    req.user.id
  );
  res.json({ ok: true, shipping });
});

module.exports = router;
