'use strict';

const { COOKIE_NAME, REFRESH_AFTER_S, verifySession, signSession, setSessionCookie, clearSessionCookie, passwordFingerprint } = require('./auth');
const { getUserById } = require('./account');
const { isAdminUser } = require('./config');

/**
 * Attache req.user (la BOUTIQUE active) et req.account (le compte de connexion).
 * Multi-boutiques : chaque boutique est une ligne « users ». La boutique
 * principale (owner_id NULL) porte les identifiants de connexion = le compte ;
 * les boutiques supplémentaires lui appartiennent via owner_id. Les routes de
 * données restent inchangées (elles filtrent par req.user.id = boutique active).
 *
 * Le jeton n'est accepté que s'il porte l'empreinte du mot de passe actuel :
 * un changement de mot de passe déconnecte donc tous les autres appareils.
 */
async function loadUser(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (token) {
      const payload = verifySession(token);
      const user = payload?.uid ? (await getUserById(payload.uid)) || null : null;
      const account = user && user.owner_id ? (await getUserById(user.owner_id)) || user : user;
      if (user && account && payload.pv === passwordFingerprint(account.password_hash)) {
        req.user = user;
        req.account = account;
        // Session glissante : on renouvelle le jeton d'un utilisateur actif.
        if (Date.now() / 1000 - (payload.iat || 0) > REFRESH_AFTER_S) setSessionCookie(res, signSession(user));
      } else {
        clearSessionCookie(res);
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

/**
 * Exige un abonnement en cours (essai ou payé). Un compte dont l'essai ou
 * l'abonnement a expiré ne peut plus utiliser l'API de gestion : seule la
 * page de paiement lui reste accessible. Les administrateurs ne sont jamais
 * bloqués.
 */
function requireActive(req, res, next) {
  const acct = req.account || req.user;
  if (acct && acct.status === 'locked' && !isAdminUser(acct)) {
    return res.status(402).json({ error: 'Votre essai ou votre abonnement est terminé. Activez votre formule pour continuer.', code: 'locked' });
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

module.exports = { loadUser, requireAuth, requireActive, requireAdmin };
