'use strict';

// Parametres du compte : profil, mot de passe, suppression.
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware');
const { hashPassword, verifyPassword, clearSessionCookie } = require('../auth');
const { getUserById, publicUser } = require('../account');

const router = express.Router();

// GET /api/account — informations du compte
router.get('/', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// PUT /api/account — met a jour le profil (nom, telephone, nom de boutique)
router.put('/', requireAuth, async (req, res) => {
  const b = req.body || {};
  const errors = {};
  const name = b.name !== undefined ? String(b.name).trim() : req.user.name;
  const phone = b.phone !== undefined ? String(b.phone).trim() : req.user.phone;
  const shopName = b.shopName !== undefined ? String(b.shopName).trim() : req.user.shop_name;
  if (name.length < 2) errors.name = 'Nom requis.';
  if (phone.length < 6) errors.phone = 'Téléphone requis.';
  if (shopName.length < 2) errors.shopName = 'Nom de la boutique requis.';
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  await db.prepare('UPDATE users SET name = ?, phone = ?, shop_name = ? WHERE id = ?')
    .run(name.slice(0, 80), phone.slice(0, 40), shopName.slice(0, 80), req.user.id);
  res.json({ ok: true, user: publicUser(await getUserById(req.user.id)) });
});

// POST /api/account/password — change le mot de passe
router.post('/password', requireAuth, async (req, res) => {
  const b = req.body || {};
  const current = String(b.current || '');
  const next = String(b.next || '');
  const full = await db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!full || !(await verifyPassword(current, full.password_hash))) {
    return res.status(400).json({ errors: { current: 'Mot de passe actuel incorrect.' } });
  }
  if (next.length < 8) return res.status(400).json({ errors: { next: 'Mot de passe : 8 caractères minimum.' } });
  const hash = await hashPassword(next);
  await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
  res.json({ ok: true });
});

// DELETE /api/account — supprime definitivement le compte (et ses donnees)
router.delete('/', requireAuth, async (req, res) => {
  const password = String((req.body && req.body.password) || '');
  const full = await db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!full || !(await verifyPassword(password, full.password_hash))) {
    return res.status(400).json({ error: 'Mot de passe incorrect.' });
  }
  await db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id); // cascade
  clearSessionCookie(res);
  res.json({ ok: true });
});

module.exports = router;
