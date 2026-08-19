'use strict';

const { COOKIE_NAME, verifySession } = require('./auth');
const { getUserById } = require('./account');

/** Attache req.user si un cookie de session valide est present. */
function loadUser(req, _res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    const payload = verifySession(token);
    if (payload?.uid) {
      req.user = getUserById(payload.uid) || null;
    }
  }
  next();
}

/** Exige une session valide pour les routes d'API. */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Non authentifie.' });
  }
  next();
}

module.exports = { loadUser, requireAuth };
