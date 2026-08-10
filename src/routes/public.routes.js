'use strict';

// Vitrine publique d'une boutique — accessible sans authentification.
const express = require('express');
const db = require('../db');
const { themeById, defaultShipping, publicProduct, slugify } = require('../catalog');

const router = express.Router();

function findUserBySlug(slug) {
  const users = db.prepare('SELECT * FROM users WHERE email_verified = 1').all();
  return users.find((u) => slugify(u.shop_name) === slug) || null;
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
    tagline: (settings && settings.tagline) || 'Bienvenue dans notre boutique.',
    description: (settings && settings.description) || '',
    theme: theme.id,
    themeData: theme,
    shipping,
    products,
    categories: [...new Set(products.map((p) => p.category))],
  });
});

module.exports = router;
