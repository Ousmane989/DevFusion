'use strict';

// Connexion / déconnexion / profil.
const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { one, query } = require('../db');
const { ah, HttpError, exiger } = require('../utils');
const { creerSession, fermerSession, authentifier } = require('../auth');

const router = express.Router();

// 10 tentatives par 15 minutes et par adresse IP.
const limiteur = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erreur: 'Trop de tentatives. Réessayez dans quelques minutes.' },
});

router.post('/connexion', limiteur, ah(async (req, res) => {
  exiger(req.body, ['identifiant', 'mot_de_passe']);
  const user = await one('SELECT * FROM utilisateurs WHERE lower(identifiant) = lower($1)', [String(req.body.identifiant).trim()]);
  const ok = user && user.actif && (await bcrypt.compare(String(req.body.mot_de_passe), user.mot_de_passe));
  if (!ok) throw new HttpError(401, 'Identifiant ou mot de passe incorrect.');
  // Espace choisi sur la page de connexion : « direction » ou « enseignants ».
  const espace = req.body.espace;
  if (espace === 'enseignants' && user.role !== 'enseignant') {
    throw new HttpError(403, 'Ce compte n\'est pas un compte enseignant : utilisez l\'Espace Directrice.');
  }
  if (espace === 'direction' && user.role === 'enseignant') {
    throw new HttpError(403, 'Ce compte est un compte enseignant : utilisez l\'Espace Enseignants.');
  }
  await query('UPDATE utilisateurs SET derniere_connexion = now() WHERE id = $1', [user.id]);
  creerSession(res, user);
  res.json({ ok: true, role: user.role });
}));

router.post('/deconnexion', (req, res) => {
  fermerSession(res);
  res.json({ ok: true });
});

router.get('/moi', authentifier, ah(async (req, res) => {
  const p = await one('SELECT nom_ecole, logo, devise, nb_periodes, libelle_periode, indicatif_defaut FROM parametres WHERE id = 1');
  const annee = await one('SELECT * FROM annees_scolaires WHERE active');
  res.json({ utilisateur: req.user, ecole: p, annee });
}));

router.post('/mot-de-passe', authentifier, ah(async (req, res) => {
  exiger(req.body, ['actuel', 'nouveau']);
  if (String(req.body.nouveau).length < 6) throw new HttpError(400, 'Le nouveau mot de passe doit contenir au moins 6 caractères.');
  const u = await one('SELECT mot_de_passe FROM utilisateurs WHERE id = $1', [req.user.id]);
  if (!(await bcrypt.compare(String(req.body.actuel), u.mot_de_passe))) throw new HttpError(400, 'Mot de passe actuel incorrect.');
  await query('UPDATE utilisateurs SET mot_de_passe = $1 WHERE id = $2', [await bcrypt.hash(String(req.body.nouveau), 10), req.user.id]);
  res.json({ ok: true });
}));

module.exports = router;
