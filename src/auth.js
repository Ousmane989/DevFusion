'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { config } = require('./config');

// Clé de signature des sessions commerçant : dérivée du secret robuste de la
// configuration (variable JWT_SECRET, ou secret privé généré / dérivé de la
// base — jamais une valeur par défaut connue). Dérivation dédiée pour que le
// jeton d'un autre espace (Karat Livreur) ne soit jamais accepté ici.
const JWT_SECRET = crypto.createHmac('sha256', config.jwtSecret).update('karat-merchant-session').digest('hex');
// Session glissante : le commerçant reste connecté tant qu'il utilise
// l'application (le jeton est renouvelé à l'usage), mais un appareil oublié
// ou un jeton volé expire au bout de 60 jours d'inactivité.
const TOKEN_TTL = '60d';
const COOKIE_MAX_AGE = 60 * 24 * 60 * 60 * 1000;
const REFRESH_AFTER_S = 12 * 60 * 60; // renouvellement au plus toutes les 12 h
const COOKIE_NAME = 'karat_session';

// ------------------------------------------------------------------
// Mots de passe
// ------------------------------------------------------------------
function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}
function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// ------------------------------------------------------------------
// Codes de verification (6 chiffres)
// ------------------------------------------------------------------
function generateCode() {
  // 000000 -> 999999, toujours sur 6 caracteres
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}
function hashCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

// ------------------------------------------------------------------
// Jetons de session (JWT dans un cookie httpOnly)
// ------------------------------------------------------------------
// Empreinte du mot de passe, embarquée dans le jeton : changer ou réinitialiser
// le mot de passe invalide aussitôt toutes les sessions ouvertes ailleurs.
function passwordFingerprint(passwordHash) {
  return crypto.createHmac('sha256', JWT_SECRET).update(String(passwordHash || '')).digest('base64url').slice(0, 16);
}
function signSession(user) {
  return jwt.sign({ uid: user.id, pv: passwordFingerprint(user.password_hash) }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}
function verifySession(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
  });
}
function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

module.exports = {
  COOKIE_NAME,
  REFRESH_AFTER_S,
  passwordFingerprint,
  hashPassword,
  verifyPassword,
  generateCode,
  hashCode,
  signSession,
  verifySession,
  setSessionCookie,
  clearSessionCookie,
};
