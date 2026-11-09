'use strict';

// Sessions Karat Logistique : cookie dédié, distinct de la session des boutiques.
const jwt = require('jsonwebtoken');
const { config } = require('../config');
const { db } = require('./store');

const COOKIE = 'karat_livreur';
const MAX_AGE = 180 * 24 * 60 * 60 * 1000;

function setLvSession(res, user) {
  const token = jwt.sign({ lv: user.id }, config.jwtSecret, { expiresIn: '180d' });
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: config.isProd, maxAge: MAX_AGE });
}
// Jeton de l'application livreur (même signature que la session, durée courte).
function deviceToken(user) {
  return jwt.sign({ lv: user.id, dev: 1 }, config.jwtSecret, { expiresIn: '30d' });
}
function clearLvSession(res) {
  res.clearCookie(COOKIE);
}

// Numéro mauritanien : 8 chiffres -> préfixe 222.
function normPhone(v) {
  const d = String(v || '').replace(/[^0-9]/g, '');
  return d.length === 8 ? '222' + d : d;
}

function publicUser(u) {
  if (!u) return null;
  const { password_hash, ...rest } = u; // eslint-disable-line no-unused-vars
  return rest;
}

/** Attache req.lv (utilisateur Karat Logistique connecté). */
async function loadLv(req, _res, next) {
  try {
    // Cookie de session ; à défaut, jeton « Bearer » (envoi natif de la position
    // par l'application Android, hors de la WebView).
    const auth = String(req.get('authorization') || '');
    const token = (req.cookies && req.cookies[COOKIE]) || (auth.startsWith('Bearer ') ? auth.slice(7) : '');
    if (token) {
      let payload = null;
      try { payload = jwt.verify(token, config.jwtSecret); } catch (_) { payload = null; }
      if (payload && payload.lv) {
        const u = await db.prepare('SELECT * FROM lv_users WHERE id = ?').get(payload.lv);
        if (u && u.status === 'active') req.lv = publicUser(u);
      }
    }
    next();
  } catch (e) {
    next(e);
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.lv) return res.status(401).json({ error: 'Connexion requise.' });
    if (req.lv.role !== role) return res.status(403).json({ error: 'Accès non autorisé pour ce compte.' });
    next();
  };
}

module.exports = { COOKIE, setLvSession, deviceToken, clearLvSession, normPhone, publicUser, loadLv, requireRole };
