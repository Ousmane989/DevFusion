'use strict';

// Connexion / déconnexion / profil.
const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { one, query, tx } = require('../db');
const { ah, HttpError, exiger, normaliserTel } = require('../utils');
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
  const mdpOk = user && (await bcrypt.compare(String(req.body.mot_de_passe), user.mot_de_passe));
  if (mdpOk && user.en_attente) {
    throw new HttpError(403, 'Votre compte est en attente de validation par la directrice. Vous pourrez vous connecter dès qu\'elle l\'aura validé.');
  }
  if (!mdpOk || !user.actif) throw new HttpError(401, 'Identifiant ou mot de passe incorrect.');
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

// ---- Inscription d'un enseignant par lui-même (validée ensuite par la directrice) ----
const limiteurInscription = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erreur: 'Trop de demandes. Réessayez plus tard.' },
});

// Classes de l'année, pour le choix « Ma classe » (aucune donnée sur les élèves).
router.get('/classes', ah(async (req, res) => {
  res.json(await query(
    `SELECT c.id, c.nom FROM classes c JOIN annees_scolaires a ON a.id = c.annee_id AND a.active
       JOIN niveaux n ON n.id = c.niveau_id ORDER BY n.ordre, c.groupe, c.nom`));
}));

router.post('/inscription-enseignant', limiteurInscription, ah(async (req, res) => {
  exiger(req.body, ['prenom', 'nom', 'telephone', 'identifiant', 'mot_de_passe', 'classe_id']);
  const identifiant = String(req.body.identifiant).trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(identifiant)) {
    throw new HttpError(400, 'Identifiant : 3 à 40 caractères, lettres sans accent, chiffres, point ou tiret (ex. fatou.diop).');
  }
  if (String(req.body.mot_de_passe).length < 6) throw new HttpError(400, 'Le mot de passe doit contenir au moins 6 caractères.');
  const p = await one('SELECT indicatif_defaut FROM parametres WHERE id = 1');
  const tel = normaliserTel(req.body.telephone, p.indicatif_defaut);
  if (!tel) throw new HttpError(400, 'Numéro de téléphone invalide (ex. 77 123 45 67).');
  const classe = await one(
    'SELECT c.id FROM classes c JOIN annees_scolaires a ON a.id = c.annee_id AND a.active WHERE c.id = $1', [req.body.classe_id]);
  if (!classe) throw new HttpError(400, 'Choisissez votre classe dans la liste.');
  if (await one('SELECT 1 FROM utilisateurs WHERE lower(identifiant) = $1', [identifiant])) {
    throw new HttpError(409, 'Cet identifiant est déjà pris. Choisissez-en un autre.');
  }
  const prenom = String(req.body.prenom).trim();
  const nom = String(req.body.nom).trim().toUpperCase();
  await tx(async (c) => {
    const pers = await c.one(
      `INSERT INTO personnel (nom, prenom, telephone, poste) VALUES ($1,$2,$3,'Enseignant') RETURNING id`, [nom, prenom, tel]);
    await c.query(
      `INSERT INTO utilisateurs (identifiant, mot_de_passe, nom_complet, role, personnel_id, actif, en_attente, classe_demandee)
       VALUES ($1,$2,$3,'enseignant',$4,FALSE,TRUE,$5)`,
      [identifiant, await bcrypt.hash(String(req.body.mot_de_passe), 10), `${prenom} ${nom}`, pers.id, classe.id]);
  });
  res.status(201).json({ ok: true, message: 'Demande envoyée ! La directrice doit valider votre compte avant votre première connexion.' });
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
