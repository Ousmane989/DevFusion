'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');

const db = require('../db');
const {
  hashPassword,
  verifyPassword,
  generateCode,
  hashCode,
  signSession,
  setSessionCookie,
  clearSessionCookie,
} = require('../auth');
const { PLANS, TRIAL_DAYS, isoIn, getUserByEmail, getUserById, publicUser } = require('../account');
const { COUNTRIES, currencyOf } = require('../catalog');
const { sendCode, hasSmtp } = require('../mailer');
const { requireAuth } = require('../middleware');
const { config } = require('../config');

const router = express.Router();

// Le code ne doit JAMAIS être renvoyé au navigateur en production (fuite de
// sécurité) : il part uniquement par e-mail. On ne l'expose qu'en développement
// local sans SMTP, pour faciliter les tests automatisés.
function devCodeFor(result) {
  return (!config.isProd && !hasSmtp) ? result.devCode : undefined;
}

const CODE_TTL_MIN = 15;
const MAX_CODE_ATTEMPTS = 5;

// Limite les tentatives sensibles (anti-bruteforce basique).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Reessayez dans quelques minutes.' },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validSignup(b) {
  const errors = {};
  if (!b.name || String(b.name).trim().length < 2) errors.name = 'Nom requis.';
  if (!b.email || !EMAIL_RE.test(String(b.email))) errors.email = 'E-mail invalide.';
  if (!b.phone || String(b.phone).trim().length < 6) errors.phone = 'Telephone requis.';
  if (!b.shopName || String(b.shopName).trim().length < 2) errors.shopName = 'Nom de la boutique requis.';
  if (!b.password || String(b.password).length < 8)
    errors.password = 'Mot de passe : 8 caracteres minimum.';
  // Tarifs desactives (usage libre) : la formule n'est plus obligatoire.
  if (!b.country || !COUNTRIES[b.country]) errors.country = 'Choisissez votre pays.';
  return errors;
}

// Cree (ou remplace) un code de verification pour un utilisateur.
function issueCode(userId, purpose) {
  const code = generateCode();
  db.prepare('DELETE FROM verification_codes WHERE user_id = ? AND purpose = ?').run(userId, purpose);
  db.prepare(
    `INSERT INTO verification_codes (user_id, code_hash, purpose, expires_at)
     VALUES (?, ?, ?, ?)`
  ).run(userId, hashCode(code), purpose, new Date(Date.now() + CODE_TTL_MIN * 60000).toISOString());
  return code;
}

// ------------------------------------------------------------------
// POST /api/auth/signup
// ------------------------------------------------------------------
router.post('/signup', authLimiter, async (req, res) => {
  const b = req.body || {};
  const errors = validSignup(b);
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const email = String(b.email).toLowerCase().trim();
  if (getUserByEmail(email)) {
    return res.status(409).json({ errors: { email: 'Un compte existe deja avec cet e-mail.' } });
  }

  const passwordHash = await hashPassword(String(b.password));
  const country = COUNTRIES[b.country] ? b.country : 'MR';
  const currency = currencyOf(country);
  const plan = PLANS[b.plan] ? b.plan : 'pro'; // conserve pour un futur retour des tarifs
  const info = db
    .prepare(
      `INSERT INTO users (name, email, phone, shop_name, password_hash, plan, status, email_verified, country, currency)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)`
    )
    .run(String(b.name).trim(), email, String(b.phone).trim(), String(b.shopName).trim(), passwordHash, plan, country, currency);

  const userId = info.lastInsertRowid;
  const code = issueCode(userId, 'email');
  const result = await sendCode({ to: email, name: String(b.name).trim(), code, purpose: 'email' });

  res.status(201).json({
    ok: true,
    email,
    message: 'Compte cree. Un code de verification vous a ete envoye par e-mail.',
    // En dev sans SMTP, on renvoie le code pour faciliter les tests.
    devCode: devCodeFor(result),
  });
});

// ------------------------------------------------------------------
// POST /api/auth/verify-email  { email, code }
// ------------------------------------------------------------------
router.post('/verify-email', authLimiter, (req, res) => {
  const { email, code } = req.body || {};
  const user = getUserByEmail(email);
  if (!user) return res.status(404).json({ error: 'Compte introuvable.' });
  if (user.email_verified) {
    return res.json({ ok: true, alreadyVerified: true });
  }

  const row = db
    .prepare(
      `SELECT * FROM verification_codes WHERE user_id = ? AND purpose = 'email'
       ORDER BY id DESC LIMIT 1`
    )
    .get(user.id);

  if (!row) return res.status(400).json({ error: 'Aucun code actif. Demandez un nouveau code.' });
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: 'Code expire. Demandez un nouveau code.' });
  }
  if (row.attempts >= MAX_CODE_ATTEMPTS) {
    return res.status(429).json({ error: 'Trop de tentatives. Demandez un nouveau code.' });
  }
  if (row.code_hash !== hashCode(String(code || '').trim())) {
    db.prepare('UPDATE verification_codes SET attempts = attempts + 1 WHERE id = ?').run(row.id);
    return res.status(400).json({ error: 'Code incorrect.' });
  }

  // Tarifs desactives (usage libre) : le compte est directement actif,
  // sans essai ni verrouillage. La date lointaine evite tout blocage.
  const subEnd = isoIn(3650);
  db.prepare(
    `UPDATE users SET email_verified = 1, status = 'active', subscription_ends_at = ? WHERE id = ?`
  ).run(subEnd, user.id);
  db.prepare('DELETE FROM verification_codes WHERE user_id = ? AND purpose = ?').run(user.id, 'email');

  const fresh = getUserById(user.id);
  setSessionCookie(res, signSession(fresh));
  res.json({ ok: true, user: publicUser(fresh) });
});

// ------------------------------------------------------------------
// POST /api/auth/resend-code  { email }
// ------------------------------------------------------------------
router.post('/resend-code', authLimiter, async (req, res) => {
  const user = getUserByEmail(req.body?.email);
  if (!user) return res.status(404).json({ error: 'Compte introuvable.' });
  if (user.email_verified) return res.json({ ok: true, alreadyVerified: true });

  const code = issueCode(user.id, 'email');
  const result = await sendCode({ to: user.email, name: user.name, code, purpose: 'email' });
  res.json({ ok: true, devCode: devCodeFor(result) });
});

// ------------------------------------------------------------------
// POST /api/auth/login  { email, password }
// ------------------------------------------------------------------
router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  const user = getUserByEmail(email);
  if (!user || !(await verifyPassword(String(password || ''), user.password_hash))) {
    return res.status(401).json({ error: 'E-mail ou mot de passe incorrect.' });
  }
  if (!user.email_verified) {
    return res.status(403).json({ error: 'E-mail non verifie.', needsVerification: true, email: user.email });
  }

  setSessionCookie(res, signSession(user));
  res.json({ ok: true, user: publicUser(getUserById(user.id)) });
});

// ------------------------------------------------------------------
// POST /api/auth/logout
// ------------------------------------------------------------------
router.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

// ------------------------------------------------------------------
// GET /api/auth/me
// ------------------------------------------------------------------
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// ------------------------------------------------------------------
// Mot de passe oublie
// POST /api/auth/forgot  { email }
// ------------------------------------------------------------------
router.post('/forgot', authLimiter, async (req, res) => {
  const user = getUserByEmail(req.body?.email);
  // Reponse volontairement identique, que le compte existe ou non.
  if (user) {
    const code = issueCode(user.id, 'reset');
    const result = await sendCode({ to: user.email, name: user.name, code, purpose: 'reset' });
    return res.json({
      ok: true,
      message: 'Si un compte existe, un code a ete envoye.',
      devCode: devCodeFor(result),
    });
  }
  res.json({ ok: true, message: 'Si un compte existe, un code a ete envoye.' });
});

// ------------------------------------------------------------------
// POST /api/auth/reset  { email, code, password }
// ------------------------------------------------------------------
router.post('/reset', authLimiter, async (req, res) => {
  const { email, code, password } = req.body || {};
  if (!password || String(password).length < 8) {
    return res.status(400).json({ error: 'Mot de passe : 8 caracteres minimum.' });
  }
  const user = getUserByEmail(email);
  if (!user) return res.status(400).json({ error: 'Code invalide ou expire.' });

  const row = db
    .prepare(
      `SELECT * FROM verification_codes WHERE user_id = ? AND purpose = 'reset'
       ORDER BY id DESC LIMIT 1`
    )
    .get(user.id);
  if (!row || new Date(row.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: 'Code invalide ou expire.' });
  }
  if (row.attempts >= MAX_CODE_ATTEMPTS) {
    return res.status(429).json({ error: 'Trop de tentatives. Demandez un nouveau code.' });
  }
  if (row.code_hash !== hashCode(String(code || '').trim())) {
    db.prepare('UPDATE verification_codes SET attempts = attempts + 1 WHERE id = ?').run(row.id);
    return res.status(400).json({ error: 'Code incorrect.' });
  }

  const passwordHash = await hashPassword(String(password));
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id);
  db.prepare('DELETE FROM verification_codes WHERE user_id = ? AND purpose = ?').run(user.id, 'reset');
  res.json({ ok: true, message: 'Mot de passe mis a jour. Vous pouvez vous connecter.' });
});

module.exports = router;
