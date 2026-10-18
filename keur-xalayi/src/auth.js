'use strict';

// Authentification (JWT en cookie httpOnly) et contrôle des rôles.
const jwt = require('jsonwebtoken');
const config = require('./config');
const { one, query } = require('./db');
const { HttpError } = require('./utils');

const COOKIE = 'kx_session';

function creerSession(res, user) {
  const token = jwt.sign({ uid: user.id, role: user.role }, config.jwtSecret, { expiresIn: `${config.sessionHeures}h` });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    maxAge: config.sessionHeures * 3600 * 1000,
  });
}

function fermerSession(res) {
  res.clearCookie(COOKIE);
}

/** Vérifie la session et charge req.user (avec la liste des classes de l'enseignant). */
async function authentifier(req, res, next) {
  try {
    const token = req.cookies && req.cookies[COOKIE];
    if (!token) throw new HttpError(401, 'Veuillez vous connecter.');
    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch {
      throw new HttpError(401, 'Session expirée, veuillez vous reconnecter.');
    }
    const user = await one(
      'SELECT id, identifiant, nom_complet, role, personnel_id, actif FROM utilisateurs WHERE id = $1',
      [payload.uid],
    );
    if (!user || !user.actif) throw new HttpError(401, 'Compte désactivé.');
    user.classes = null; // null = toutes les classes
    if (user.role === 'enseignant') {
      const rows = user.personnel_id
        ? await query(
          `SELECT c.id FROM classes c JOIN annees_scolaires a ON a.id = c.annee_id
           WHERE c.enseignant_id = $1 AND a.active`, [user.personnel_id])
        : [];
      user.classes = rows.map((r) => r.id);
    }
    req.user = user;
    next();
  } catch (e) {
    next(e);
  }
}

/** Limite l'accès à certains rôles : autoriser('directeur', 'secretaire') */
function autoriser(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new HttpError(403, 'Vous n\'avez pas accès à cette fonction.'));
    }
    next();
  };
}

/** Vérifie qu'un enseignant a bien accès à la classe demandée. */
function verifierClasse(req, classeId) {
  if (req.user.classes === null) return;
  if (!req.user.classes.includes(Number(classeId))) {
    throw new HttpError(403, 'Cette classe ne vous est pas attribuée.');
  }
}

module.exports = { creerSession, fermerSession, authentifier, autoriser, verifierClasse };
