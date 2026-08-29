'use strict';

// Parametres du compte : profil, mot de passe, suppression.
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware');
const { hashPassword, verifyPassword, clearSessionCookie } = require('../auth');
const { getUserById, getUserByEmail, publicUser } = require('../account');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const router = express.Router();

// Vue du compte : infos de la BOUTIQUE active, mais l'e-mail de connexion et le
// nom du titulaire viennent du COMPTE (boutique principale).
function accountUser(req) {
  const u = publicUser(req.user);
  u.email = req.account.email;
  u.name = req.account.name;
  return u;
}

// GET /api/account — informations du compte
router.get('/', requireAuth, (req, res) => {
  res.json({ user: accountUser(req) });
});

// PUT /api/account — profil : nom/téléphone (compte), nom de la boutique (active)
router.put('/', requireAuth, async (req, res) => {
  const b = req.body || {};
  const errors = {};
  const name = b.name !== undefined ? String(b.name).trim() : req.account.name;
  const phone = b.phone !== undefined ? String(b.phone).trim() : req.account.phone;
  const shopName = b.shopName !== undefined ? String(b.shopName).trim() : req.user.shop_name;
  if (name.length < 2) errors.name = 'Nom requis.';
  if (phone.length < 6) errors.phone = 'Téléphone requis.';
  if (shopName.length < 2) errors.shopName = 'Nom de la boutique requis.';
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  // Nom/téléphone : niveau compte (propagés à toutes les boutiques du compte).
  await db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ? OR owner_id = ?')
    .run(name.slice(0, 80), phone.slice(0, 40), req.account.id, req.account.id);
  // Nom de la boutique : uniquement la boutique active.
  await db.prepare('UPDATE users SET shop_name = ? WHERE id = ?').run(shopName.slice(0, 80), req.user.id);
  res.json({ ok: true, user: accountUser({ user: await getUserById(req.user.id), account: await getUserById(req.account.id) }) });
});

// POST /api/account/password — change le mot de passe (niveau compte)
router.post('/password', requireAuth, async (req, res) => {
  const b = req.body || {};
  const current = String(b.current || '');
  const next = String(b.next || '');
  const full = await db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.account.id);
  if (!full || !(await verifyPassword(current, full.password_hash))) {
    return res.status(400).json({ errors: { current: 'Mot de passe actuel incorrect.' } });
  }
  if (next.length < 8) return res.status(400).json({ errors: { next: 'Mot de passe : 8 caractères minimum.' } });
  const hash = await hashPassword(next);
  // Toutes les boutiques du compte partagent le mot de passe du compte.
  await db.prepare('UPDATE users SET password_hash = ? WHERE id = ? OR owner_id = ?').run(hash, req.account.id, req.account.id);
  res.json({ ok: true });
});

// POST /api/account/email — change l'e-mail de connexion (niveau compte).
// Exige le mot de passe actuel (protège l'identifiant de connexion).
router.post('/email', requireAuth, async (req, res) => {
  const b = req.body || {};
  const email = String(b.email || '').toLowerCase().trim();
  const password = String(b.password || '');
  const full = await db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.account.id);
  if (!full || !(await verifyPassword(password, full.password_hash))) {
    return res.status(400).json({ errors: { password: 'Mot de passe incorrect.' } });
  }
  if (!EMAIL_RE.test(email)) return res.status(400).json({ errors: { email: 'E-mail invalide.' } });
  const existing = await getUserByEmail(email);
  if (existing && existing.id !== req.account.id) {
    return res.status(409).json({ errors: { email: 'Cet e-mail est déjà utilisé.' } });
  }
  // L'e-mail de connexion est porté par la boutique principale (le compte).
  await db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email, req.account.id);
  res.json({ ok: true, email });
});

// DELETE /api/account — supprime le COMPTE entier (toutes les boutiques)
router.delete('/', requireAuth, async (req, res) => {
  const password = String((req.body && req.body.password) || '');
  const full = await db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.account.id);
  if (!full || !(await verifyPassword(password, full.password_hash))) {
    return res.status(400).json({ error: 'Mot de passe incorrect.' });
  }
  await db.prepare('DELETE FROM users WHERE id = ?').run(req.account.id); // cascade compte + boutiques
  clearSessionCookie(res);
  res.json({ ok: true });
});

module.exports = router;
