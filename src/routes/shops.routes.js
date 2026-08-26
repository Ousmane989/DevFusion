'use strict';

// Multi-boutiques : lister, créer et basculer entre les boutiques d'un compte.
// Une boutique = une ligne « users ». Le compte de connexion = la boutique
// principale (owner_id NULL) ; les autres lui appartiennent via owner_id.
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware');
const { signSession, setSessionCookie } = require('../auth');
const { isoIn, getUserById, publicUser } = require('../account');
const { COUNTRIES, currencyOf, slugify } = require('../catalog');

const router = express.Router();

// Toutes les boutiques d'un compte (la principale + celles qu'elle possède).
async function shopsOf(accountId) {
  return db.prepare(
    'SELECT id, shop_name, country, currency, owner_id FROM users WHERE id = ? OR owner_id = ? ORDER BY id ASC'
  ).all(accountId, accountId);
}
function shopView(row, activeId) {
  return {
    id: row.id,
    name: row.shop_name,
    country: row.country || 'MR',
    currency: row.currency || 'MRU',
    slug: slugify(row.shop_name),
    isPrimary: !row.owner_id,
    active: row.id === activeId,
  };
}
function belongsToAccount(shop, accountId) {
  return shop && (shop.id === accountId || shop.owner_id === accountId);
}

// GET /api/shops — liste des boutiques du compte
router.get('/', requireAuth, async (req, res) => {
  const rows = await shopsOf(req.account.id);
  res.json({ shops: rows.map((r) => shopView(r, req.user.id)), activeShopId: req.user.id });
});

// POST /api/shops  { name, country } — crée une nouvelle boutique et l'active
router.post('/', requireAuth, async (req, res) => {
  const b = req.body || {};
  const name = String(b.name || '').trim();
  if (name.length < 2) return res.status(400).json({ errors: { name: 'Nom de la boutique requis.' } });
  const country = COUNTRIES[b.country] ? b.country : req.account.country || 'MR';
  const currency = currencyOf(country);
  // E-mail synthétique unique (les boutiques secondaires ne se connectent pas
  // directement ; on se connecte au compte principal).
  const email = `boutique-${req.account.id}-${Date.now()}@shops.karat.local`;

  const info = await db.prepare(
    `INSERT INTO users (name, email, phone, shop_name, password_hash, plan, status, email_verified, country, currency, subscription_ends_at, owner_id)
     VALUES (?, ?, ?, ?, ?, 'pro', 'active', 1, ?, ?, ?, ?)`
  ).run(
    req.account.name, email, req.account.phone || '', name.slice(0, 80),
    req.account.password_hash, country, currency, isoIn(3650), req.account.id
  );

  const shop = await getUserById(info.lastInsertRowid);
  // On bascule directement sur la nouvelle boutique.
  setSessionCookie(res, signSession(shop));
  res.status(201).json({ ok: true, shopId: shop.id, user: publicUser(shop) });
});

// POST /api/shops/switch  { shopId } — bascule sur une autre boutique du compte
router.post('/switch', requireAuth, async (req, res) => {
  const shopId = Number(req.body && req.body.shopId);
  const shop = await getUserById(shopId);
  if (!belongsToAccount(shop, req.account.id)) {
    return res.status(404).json({ error: 'Boutique introuvable.' });
  }
  setSessionCookie(res, signSession(shop));
  res.json({ ok: true, shopId: shop.id, user: publicUser(shop) });
});

// DELETE /api/shops/:id — supprime une boutique secondaire (jamais la principale)
router.delete('/:id', requireAuth, async (req, res) => {
  const shopId = Number(req.params.id);
  const shop = await getUserById(shopId);
  if (!belongsToAccount(shop, req.account.id)) return res.status(404).json({ error: 'Boutique introuvable.' });
  if (!shop.owner_id) return res.status(400).json({ error: 'La boutique principale ne peut pas être supprimée.' });
  await db.prepare('DELETE FROM users WHERE id = ?').run(shopId); // cascade des données
  // Si on supprimait la boutique active, on revient au compte principal.
  let active = req.user.id;
  if (shopId === req.user.id) { setSessionCookie(res, signSession(req.account)); active = req.account.id; }
  res.json({ ok: true, activeShopId: active });
});

module.exports = router;
