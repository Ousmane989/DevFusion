'use strict';

const { COOKIE_NAME, verifySession } = require('./auth');
const { getUserById } = require('./account');
const { isAdminUser } = require('./config');

/**
 * Attache req.user (la BOUTIQUE active) et req.account (le compte de connexion).
 * Multi-boutiques : chaque boutique est une ligne « users ». La boutique
 * principale (owner_id NULL) porte les identifiants de connexion = le compte ;
 * les boutiques supplémentaires lui appartiennent via owner_id. Les routes de
 * données restent inchangées (elles filtrent par req.user.id = boutique active).
 */
async function loadUser(req, _res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (token) {
      const payload = verifySession(token);
      if (payload?.uid) {
        const user = (await getUserById(payload.uid)) || null;
        req.user = user;
        req.account = user && user.owner_id ? (await getUserById(user.owner_id)) || user : user;
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

/** Exige un compte administrateur du SaaS (par e-mail de connexion). */
function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Non authentifie.' });
  if (!isAdminUser(req.account || req.user)) {
    return res.status(403).json({ error: 'Accès réservé à l\'administrateur.' });
  }
  next();
}

module.exports = { loadUser, requireAuth, requireAdmin };
