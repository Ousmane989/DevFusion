'use strict';

const { COOKIE_NAME, verifySession } = require('./auth');
const { getUserById } = require('./account');

/** Attache req.user si un cookie de session valide est present. */
async function loadUser(req, _res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (token) {
      const payload = verifySession(token);
      if (payload?.uid) {
        req.user = (await getUserById(payload.uid)) || null;
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}

/** Exige une session valide pour les routes d'API. */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Non authentifie.' });
  }
  next();
}

module.exports = { loadUser, requireAuth };
