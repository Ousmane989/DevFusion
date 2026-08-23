'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'karat-dev-secret-change-me';
// Session longue durée : le commerçant reste connecté sur son appareil et ne
// se déconnecte qu'en cliquant sur « Déconnexion ». 400 jours est le maximum
// autorisé par les navigateurs (Chrome) pour la durée de vie d'un cookie.
const TOKEN_TTL = '400d';
const COOKIE_MAX_AGE = 400 * 24 * 60 * 60 * 1000;
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
function signSession(user) {
  return jwt.sign({ uid: user.id }, JWT_SECRET, { expiresIn: TOKEN_TTL });
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
  hashPassword,
  verifyPassword,
  generateCode,
  hashCode,
  signSession,
  verifySession,
  setSessionCookie,
  clearSessionCookie,
};
