'use strict';

// Finances : dépenses, bilan mensuel (recettes / dépenses / solde), évolution.
const express = require('express');
const { query, one } = require('../db');
const { ah, HttpError, exiger, vide, aujourdhui } = require('../utils');
const { autoriser } = require('../auth');
const finance = require('../services/finance');

const router = express.Router();

const CATEGORIES = ['Loyer', 'Électricité', 'Eau', 'Internet / Téléphone', 'Fournitures', 'Entretien / Réparations',
  'Transport', 'Alimentation', 'Impôts / Taxes', 'Événements', 'Autre'];

router.get('/categories', (req, res) => res.json(CATEGORIES));

// ---- Dépenses ----
router.get('/depenses', autoriser('directeur'), ah(async (req, res) => {
  const { du, au, categorie } = req.query;
  const params = []; const where = [];
  if (du) { params.push(du); where.push(`d.date >= $${params.length}`); }
  if (au) { params.push(au); where.push(`d.date <= $${params.length}`); }
  if (categorie) { params.push(categorie); where.push(`d.categorie = $${params.length}`); }
  const rows = await query(
    `SELECT d.*, u.nom_complet AS saisi_par_nom FROM depenses d LEFT JOIN utilisateurs u ON u.id = d.saisi_par
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY d.date DESC, d.id DESC LIMIT 1000`, params);
  res.json({ depenses: rows, total: rows.reduce((s, r) => s + r.montant, 0) });
}));

router.post('/depenses', autoriser('directeur'), ah(async (req, res) => {
  exiger(req.body, ['categorie', 'libelle', 'montant']);
  if (!(Number(req.body.montant) > 0)) throw new HttpError(400, 'Montant invalide.');
  res.status(201).json(await one(
    'INSERT INTO depenses (date, categorie, libelle, montant, mode, saisi_par) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [vide(req.body.date) || aujourdhui(), req.body.categorie, req.body.libelle, req.body.montant, vide(req.body.mode) || 'especes', req.user.id]));
}));

router.delete('/depenses/:id', autoriser('directeur'), ah(async (req, res) => {
  await query('DELETE FROM depenses WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
}));

// ---- Bilan : par mois civil sur l'année scolaire active ----
// Recettes = paiements encaissés dans le mois (date de paiement).
// Dépenses = dépenses + salaires versés dans le mois.
router.get('/bilan', autoriser('directeur'), ah(async (req, res) => {
  const annee = await finance.anneeActiveRequise();
  const debut = req.query.du || annee.date_debut;
  const fin = req.query.au || annee.date_fin;
  const recettes = await query(
    `SELECT to_char(date_paiement, 'YYYY-MM-01') AS mois, type, SUM(montant) AS total
       FROM paiements WHERE NOT annule AND date_paiement BETWEEN $1 AND $2 GROUP BY 1, 2`, [debut, fin]);
  const depenses = await query(
    `SELECT to_char(date, 'YYYY-MM-01') AS mois, categorie, SUM(montant) AS total
       FROM depenses WHERE date BETWEEN $1 AND $2 GROUP BY 1, 2`, [debut, fin]);
  const salaires = await query(
    `SELECT to_char(date_paiement, 'YYYY-MM-01') AS mois, SUM(montant) AS total
       FROM salaires WHERE date_paiement BETWEEN $1 AND $2 GROUP BY 1`, [debut, fin]);
  const mois = finance.moisAnnee({ date_debut: debut, date_fin: fin });
  const lignes = mois.map((m) => {
    const rec = recettes.filter((r) => r.mois === m);
    const dep = depenses.filter((r) => r.mois === m);
    const sal = salaires.find((r) => r.mois === m);
    const totalRec = rec.reduce((s, r) => s + r.total, 0);
    const totalDep = dep.reduce((s, r) => s + r.total, 0) + (sal ? sal.total : 0);
    return {
      mois: m,
      recettes: totalRec,
      mensualites: rec.filter((r) => r.type === 'mensualite').reduce((s, r) => s + r.total, 0),
      inscriptions: rec.filter((r) => r.type === 'inscription').reduce((s, r) => s + r.total, 0),
      autres: rec.filter((r) => r.type === 'autre').reduce((s, r) => s + r.total, 0),
      salaires: sal ? sal.total : 0,
      depenses: totalDep,
      solde: totalRec - totalDep,
    };
  });
  const parCategorie = {};
  for (const d of depenses) parCategorie[d.categorie] = (parCategorie[d.categorie] || 0) + d.total;
  const totSal = salaires.reduce((s, r) => s + r.total, 0);
  if (totSal) parCategorie.Salaires = totSal;
  const totaux = lignes.reduce((t, l) => ({ recettes: t.recettes + l.recettes, depenses: t.depenses + l.depenses, solde: t.solde + l.solde }),
    { recettes: 0, depenses: 0, solde: 0 });
  res.json({ du: debut, au: fin, lignes, totaux, par_categorie: Object.entries(parCategorie).map(([categorie, total]) => ({ categorie, total })).sort((a, b) => b.total - a.total) });
}));

module.exports = router;
