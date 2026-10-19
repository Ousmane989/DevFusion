'use strict';

// Personnel (enseignants et employés) et salaires versés — directeur uniquement,
// sauf la liste simple des enseignants utilisée pour les classes.
const express = require('express');
const { query, one } = require('../db');
const { ah, HttpError, exiger, vide, normaliserTel, aujourdhui, debutMois } = require('../utils');
const { autoriser } = require('../auth');

const router = express.Router();

router.get('/', autoriser('directeur'), ah(async (req, res) => {
  const tous = req.query.tous === '1';
  res.json(await query(
    `SELECT p.*, (SELECT string_agg(c.nom, ', ' ORDER BY c.nom) FROM classes c JOIN annees_scolaires a ON a.id = c.annee_id AND a.active
                   WHERE c.enseignant_id = p.id) AS classes,
            (SELECT identifiant FROM utilisateurs u WHERE u.personnel_id = p.id LIMIT 1) AS compte
       FROM personnel p ${tous ? '' : 'WHERE p.actif'} ORDER BY p.actif DESC, p.poste, p.nom`));
}));

async function nettoyer(body) {
  const p = await one('SELECT indicatif_defaut FROM parametres WHERE id = 1');
  const tel = vide(body.telephone) ? normaliserTel(body.telephone, p.indicatif_defaut) : null;
  if (vide(body.telephone) && !tel) throw new HttpError(400, 'Numéro de téléphone invalide.');
  return [String(body.nom || '').trim().toUpperCase(), String(body.prenom || '').trim(), vide(body.sexe), tel,
    vide(body.poste) || 'Enseignant', Number(body.salaire_base || 0), vide(body.date_embauche), vide(body.remarques)];
}

router.post('/', autoriser('directeur'), ah(async (req, res) => {
  exiger(req.body, ['nom', 'prenom']);
  res.status(201).json(await one(
    `INSERT INTO personnel (nom, prenom, sexe, telephone, poste, salaire_base, date_embauche, remarques)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, await nettoyer(req.body)));
}));

router.put('/:id', autoriser('directeur'), ah(async (req, res) => {
  exiger(req.body, ['nom', 'prenom']);
  const v = await nettoyer(req.body);
  res.json(await one(
    `UPDATE personnel SET nom=$1, prenom=$2, sexe=$3, telephone=$4, poste=$5, salaire_base=$6, date_embauche=$7, remarques=$8,
            actif = COALESCE($9, actif) WHERE id = $10 RETURNING *`, [...v, req.body.actif ?? null, req.params.id]));
}));

// ---- Salaires ----
router.get('/salaires', autoriser('directeur'), ah(async (req, res) => {
  const mois = req.query.mois || debutMois(aujourdhui());
  const personnel = await query(
    `SELECT p.id, p.nom, p.prenom, p.poste, p.salaire_base,
            COALESCE(SUM(s.montant), 0) AS verse
       FROM personnel p LEFT JOIN salaires s ON s.personnel_id = p.id AND s.mois = $1
      WHERE p.actif GROUP BY p.id ORDER BY p.poste, p.nom`, [mois]);
  const historique = await query(
    `SELECT s.*, p.nom, p.prenom, p.poste FROM salaires s JOIN personnel p ON p.id = s.personnel_id
      ${req.query.personnel_id ? 'WHERE s.personnel_id = $1' : ''} ORDER BY s.date_paiement DESC, s.id DESC LIMIT 300`,
    req.query.personnel_id ? [req.query.personnel_id] : []);
  res.json({ mois, personnel, historique });
}));

router.post('/salaires', autoriser('directeur'), ah(async (req, res) => {
  exiger(req.body, ['personnel_id', 'mois', 'montant']);
  if (!(Number(req.body.montant) > 0)) throw new HttpError(400, 'Montant invalide.');
  res.status(201).json(await one(
    `INSERT INTO salaires (personnel_id, mois, montant, date_paiement, mode, remarque, saisi_par)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.body.personnel_id, debutMois(req.body.mois), req.body.montant, vide(req.body.date_paiement) || aujourdhui(),
      vide(req.body.mode) || 'especes', vide(req.body.remarque), req.user.id]));
}));

router.delete('/salaires/:id', autoriser('directeur'), ah(async (req, res) => {
  await query('DELETE FROM salaires WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
}));

module.exports = router;
