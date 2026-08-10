'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware');
const { THEMES, themeById, defaultShipping } = require('../catalog');

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
  const slug = (user.shop_name || 'ma-boutique')
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    shopName: user.shop_name,
    theme: t.id,
    themeData: t,
    tagline: row.tagline,
    description: row.description,
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
  db.prepare(
    `UPDATE store_settings SET theme = ?, tagline = ?, domain = ?, description = ?, updated_at = datetime('now') WHERE user_id = ?`
  ).run(
    theme,
    b.tagline !== undefined ? String(b.tagline).slice(0, 140) : row.tagline,
    b.domain !== undefined ? String(b.domain).slice(0, 120) : row.domain,
    b.description !== undefined ? String(b.description).slice(0, 400) : row.description,
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
