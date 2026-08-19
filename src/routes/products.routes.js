'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware');
const { publicProduct, CATEGORIES } = require('../catalog');

const router = express.Router();

function validate(b) {
  const errors = {};
  if (!b.name || String(b.name).trim().length < 2) errors.name = 'Nom du produit requis.';
  const price = Number(b.priceMru);
  if (!Number.isFinite(price) || price < 0) errors.priceMru = 'Prix invalide.';
  const stock = Number(b.stock);
  if (!Number.isFinite(stock) || stock < 0) errors.stock = 'Stock invalide.';
  return errors;
}

// GET /api/products  — liste des produits de la boutique
router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM products WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
  res.json({ products: rows.map(publicProduct), categories: CATEGORIES });
});

// Accepte une URL http(s) ou une data URL image, jusqu'a ~700 Ko.
function sanitizeImage(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  if (s.length > 720000) return '';
  if (/^https?:\/\//i.test(s) || /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(s)) return s;
  return '';
}

// POST /api/products  — ajouter un produit
router.post('/', requireAuth, (req, res) => {
  const b = req.body || {};
  const errors = validate(b);
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const info = db
    .prepare(
      `INSERT INTO products (user_id, name, description, price_mru, stock, category, active, image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user.id,
      String(b.name).trim(),
      String(b.description || '').trim(),
      Math.round(Number(b.priceMru)),
      Math.round(Number(b.stock)),
      CATEGORIES.includes(b.category) ? b.category : 'Autre',
      b.active === false ? 0 : 1,
      sanitizeImage(b.image)
    );
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ ok: true, product: publicProduct(row) });
});

// PUT /api/products/:id  — modifier un produit
router.put('/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Produit introuvable.' });
  const b = req.body || {};
  const errors = validate({ name: b.name ?? row.name, priceMru: b.priceMru ?? row.price_mru, stock: b.stock ?? row.stock });
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  db.prepare(
    `UPDATE products SET name = ?, description = ?, price_mru = ?, stock = ?, category = ?, active = ?, image = ? WHERE id = ?`
  ).run(
    b.name !== undefined ? String(b.name).trim() : row.name,
    b.description !== undefined ? String(b.description).trim() : row.description,
    b.priceMru !== undefined ? Math.round(Number(b.priceMru)) : row.price_mru,
    b.stock !== undefined ? Math.round(Number(b.stock)) : row.stock,
    b.category !== undefined && CATEGORIES.includes(b.category) ? b.category : row.category,
    b.active !== undefined ? (b.active ? 1 : 0) : row.active,
    b.image !== undefined ? sanitizeImage(b.image) : row.image,
    row.id
  );
  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(row.id);
  res.json({ ok: true, product: publicProduct(updated) });
});

// DELETE /api/products/:id  — supprimer un produit
router.delete('/:id', requireAuth, (req, res) => {
  const info = db.prepare('DELETE FROM products WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (!info.changes) return res.status(404).json({ error: 'Produit introuvable.' });
  res.json({ ok: true });
});

module.exports = router;
