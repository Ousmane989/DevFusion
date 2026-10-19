'use strict';

// Gestion des comptes (réservée au directeur).
const express = require('express');
const bcrypt = require('bcryptjs');
const { query, one, tx } = require('../db');
const { ah, HttpError, exiger, vide } = require('../utils');
const { autoriser } = require('../auth');

const router = express.Router();
router.use(autoriser('directeur'));

// Deux espaces : la directrice (accès complet) et les enseignants (leur classe).
const ROLES = ['directeur', 'enseignant'];

router.get('/', ah(async (req, res) => {
  res.json(await query(
    `SELECT u.id, u.identifiant, u.nom_complet, u.role, u.personnel_id, u.actif, u.derniere_connexion,
            u.en_attente, u.classe_demandee, u.created_at, cd.nom AS classe_demandee_nom, p.telephone,
            p.nom || ' ' || p.prenom AS personnel,
            (SELECT string_agg(c.nom, ', ' ORDER BY c.nom) FROM classes c JOIN annees_scolaires a ON a.id = c.annee_id AND a.active
              WHERE c.enseignant_id = u.personnel_id) AS classes,
            (SELECT t.prenom || ' ' || t.nom FROM classes c2 JOIN personnel t ON t.id = c2.enseignant_id
              WHERE c2.id = u.classe_demandee AND c2.enseignant_id IS DISTINCT FROM u.personnel_id) AS titulaire_actuel
       FROM utilisateurs u LEFT JOIN personnel p ON p.id = u.personnel_id LEFT JOIN classes cd ON cd.id = u.classe_demandee
      ORDER BY u.en_attente DESC, u.role, u.nom_complet`));
}));

router.post('/', ah(async (req, res) => {
  exiger(req.body, ['identifiant', 'mot_de_passe', 'nom_complet', 'role']);
  const { identifiant, mot_de_passe, nom_complet, role, personnel_id } = req.body;
  if (!ROLES.includes(role)) throw new HttpError(400, 'Rôle invalide.');
  if (String(mot_de_passe).length < 6) throw new HttpError(400, 'Mot de passe : 6 caractères minimum.');
  if (role === 'enseignant' && !personnel_id) throw new HttpError(400, 'Associez le compte enseignant à une fiche du personnel.');
  const hash = await bcrypt.hash(String(mot_de_passe), 10);
  const u = await one(
    `INSERT INTO utilisateurs (identifiant, mot_de_passe, nom_complet, role, personnel_id)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, identifiant, nom_complet, role, personnel_id, actif`,
    [String(identifiant).trim().toLowerCase(), hash, nom_complet, role, vide(personnel_id)]);
  res.status(201).json(u);
}));

router.put('/:id', ah(async (req, res) => {
  const { nom_complet, role, personnel_id, actif, mot_de_passe } = req.body;
  if (role && !ROLES.includes(role)) throw new HttpError(400, 'Rôle invalide.');
  if (Number(req.params.id) === req.user.id && (actif === false || (role && role !== 'directeur'))) {
    throw new HttpError(400, 'Vous ne pouvez pas désactiver ou rétrograder votre propre compte.');
  }
  await query(
    `UPDATE utilisateurs SET nom_complet = COALESCE($1, nom_complet), role = COALESCE($2, role),
            personnel_id = $3, actif = COALESCE($4, actif) WHERE id = $5`,
    [vide(nom_complet), vide(role), vide(personnel_id), actif ?? null, req.params.id]);
  if (mot_de_passe) {
    if (String(mot_de_passe).length < 6) throw new HttpError(400, 'Mot de passe : 6 caractères minimum.');
    await query('UPDATE utilisateurs SET mot_de_passe = $1 WHERE id = $2', [await bcrypt.hash(String(mot_de_passe), 10), req.params.id]);
  }
  res.json({ ok: true });
}));

// ---- Demandes de comptes enseignants ----
// Validation : le compte est activé et l'enseignant devient titulaire de la
// classe demandée (ou d'une autre classe choisie par la directrice).
router.post('/:id/valider', ah(async (req, res) => {
  const u = await one('SELECT * FROM utilisateurs WHERE id = $1 AND en_attente', [req.params.id]);
  if (!u) throw new HttpError(404, 'Demande introuvable ou déjà traitée.');
  const classeId = vide(req.body.classe_id) || u.classe_demandee;
  await tx(async (c) => {
    if (classeId) {
      const cl = await c.one('SELECT c.id FROM classes c JOIN annees_scolaires a ON a.id = c.annee_id AND a.active WHERE c.id = $1', [classeId]);
      if (!cl) throw new HttpError(400, 'Classe invalide.');
      await c.query('UPDATE classes SET enseignant_id = $1 WHERE id = $2', [u.personnel_id, cl.id]);
    }
    await c.query('UPDATE utilisateurs SET actif = TRUE, en_attente = FALSE, classe_demandee = NULL WHERE id = $1', [u.id]);
  });
  res.json({ ok: true });
}));

// Refus : la demande et la fiche du personnel créée avec elle sont supprimées.
router.post('/:id/refuser', ah(async (req, res) => {
  const u = await one('SELECT * FROM utilisateurs WHERE id = $1 AND en_attente', [req.params.id]);
  if (!u) throw new HttpError(404, 'Demande introuvable ou déjà traitée.');
  await tx(async (c) => {
    await c.query('DELETE FROM utilisateurs WHERE id = $1', [u.id]);
    if (u.personnel_id) {
      const autres = await c.one(
        `SELECT (SELECT COUNT(*) FROM utilisateurs WHERE personnel_id = $1) + (SELECT COUNT(*) FROM salaires WHERE personnel_id = $1)
              + (SELECT COUNT(*) FROM classes WHERE enseignant_id = $1) AS n`, [u.personnel_id]);
      if (autres.n === 0) await c.query('DELETE FROM personnel WHERE id = $1', [u.personnel_id]);
    }
  });
  res.json({ ok: true });
}));

// Suppression d'un compte. Les paiements, notes et présences saisis par ce
// compte sont conservés (l'auteur devient vide).
router.delete('/:id', ah(async (req, res) => {
  const u = await one('SELECT id, role FROM utilisateurs WHERE id = $1', [req.params.id]);
  if (!u) throw new HttpError(404, 'Compte introuvable.');
  if (u.id === req.user.id) throw new HttpError(400, 'Vous ne pouvez pas supprimer votre propre compte.');
  if (u.role === 'directeur') {
    const autres = await one(`SELECT COUNT(*) AS n FROM utilisateurs WHERE role = 'directeur' AND actif AND id <> $1`, [u.id]);
    if (autres.n === 0) throw new HttpError(400, 'Il doit rester au moins un compte directeur actif.');
  }
  await query('DELETE FROM utilisateurs WHERE id = $1', [u.id]);
  res.json({ ok: true });
}));

module.exports = router;
