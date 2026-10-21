'use strict';

// Années scolaires, décisions de fin d'année et passage en classe supérieure.
const express = require('express');
const { query, one, tx } = require('../db');
const { ah, HttpError, exiger } = require('../utils');
const { autoriser, verifierClasse } = require('../auth');

const router = express.Router();

router.get('/', ah(async (req, res) => {
  res.json(await query(
    `SELECT a.*, (SELECT COUNT(*) FROM inscriptions i WHERE i.annee_id = a.id) AS nb_inscrits
       FROM annees_scolaires a ORDER BY date_debut DESC`));
}));

router.post('/', autoriser('directeur'), ah(async (req, res) => {
  exiger(req.body, ['libelle', 'date_debut', 'date_fin']);
  const { libelle, date_debut, date_fin } = req.body;
  res.status(201).json(await one(
    'INSERT INTO annees_scolaires (libelle, date_debut, date_fin) VALUES ($1,$2,$3) RETURNING *',
    [libelle, date_debut, date_fin]));
}));

// ---- Décisions de fin d'année (admis / redouble / parti) ----
router.put('/decisions', autoriser('directeur', 'enseignant'), ah(async (req, res) => {
  const { decisions } = req.body; // [{ inscription_id, decision }]
  if (!Array.isArray(decisions)) throw new HttpError(400, 'Liste de décisions attendue.');
  for (const d of decisions) {
    if (!['en_cours', 'admis', 'redouble', 'parti'].includes(d.decision)) throw new HttpError(400, 'Décision invalide.');
    const i = await one('SELECT classe_id FROM inscriptions WHERE id = $1', [d.inscription_id]);
    if (!i) continue;
    verifierClasse(req, i.classe_id);
    await query('UPDATE inscriptions SET decision = $1 WHERE id = $2', [d.decision, d.inscription_id]);
  }
  res.json({ ok: true });
}));

router.put('/:id', autoriser('directeur'), ah(async (req, res) => {
  const { libelle, date_debut, date_fin } = req.body;
  res.json(await one(
    `UPDATE annees_scolaires SET libelle = COALESCE($1, libelle), date_debut = COALESCE($2, date_debut),
            date_fin = COALESCE($3, date_fin) WHERE id = $4 RETURNING *`,
    [libelle || null, date_debut || null, date_fin || null, req.params.id]));
}));

router.post('/:id/activer', autoriser('directeur'), ah(async (req, res) => {
  await tx(async (c) => {
    const existe = await c.one('SELECT id FROM annees_scolaires WHERE id = $1', [req.params.id]);
    if (!existe) throw new HttpError(404, 'Année scolaire introuvable.');
    await c.query('UPDATE annees_scolaires SET active = FALSE WHERE active');
    await c.query('UPDATE annees_scolaires SET active = TRUE WHERE id = $1', [req.params.id]);
  });
  res.json({ ok: true });
}));

/**
 * Calcule le plan de passage de l'année active vers l'année cible :
 * admis -> niveau suivant (même groupe si possible), redouble -> même classe,
 * parti -> non réinscrit, CM2 admis -> sortie (fin de cycle).
 */
async function planPassage(c, cibleId) {
  const source = await c.one('SELECT * FROM annees_scolaires WHERE active');
  if (!source) throw new HttpError(400, 'Aucune année active.');
  if (Number(cibleId) === source.id) throw new HttpError(400, 'Choisissez une autre année que l\'année active.');
  const niveaux = await c.query('SELECT * FROM niveaux ORDER BY ordre');
  const parOrdre = Object.fromEntries(niveaux.map((n) => [n.ordre, n]));
  const inscrits = await c.query(
    `SELECT i.*, e.nom, e.prenom, e.matricule, c.groupe, c.nom AS classe, n.ordre, n.id AS niveau_id
       FROM inscriptions i JOIN eleves e ON e.id = i.eleve_id
       JOIN classes c ON c.id = i.classe_id JOIN niveaux n ON n.id = c.niveau_id
      WHERE i.annee_id = $1 AND e.statut = 'actif' ORDER BY n.ordre, c.nom, e.nom`, [source.id]);
  const deja = new Set((await c.query('SELECT eleve_id FROM inscriptions WHERE annee_id = $1', [cibleId])).map((r) => r.eleve_id));
  const plan = inscrits.map((i) => {
    const decision = i.decision === 'en_cours' ? 'admis' : i.decision;
    let niveauCible = null;
    let action;
    if (deja.has(i.eleve_id)) action = 'deja_inscrit';
    else if (decision === 'parti') action = 'sortie';
    else if (decision === 'redouble') { action = 'redouble'; niveauCible = parOrdre[i.ordre]; }
    else if (!parOrdre[i.ordre + 1]) action = 'fin_cycle';
    else { action = 'passe'; niveauCible = parOrdre[i.ordre + 1]; }
    return {
      inscription_id: i.id, eleve_id: i.eleve_id, nom: i.nom, prenom: i.prenom, matricule: i.matricule,
      classe: i.classe, groupe: i.groupe, decision, action,
      niveau_cible: niveauCible && niveauCible.nom, niveau_cible_id: niveauCible && niveauCible.id,
      classe_cible: niveauCible ? `${niveauCible.nom}${i.groupe ? ' ' + i.groupe : ''}` : null,
      reduction: i.reduction, reduction_motif: i.reduction_motif,
    };
  });
  return { source, plan };
}

router.post('/:id/passage/apercu', autoriser('directeur'), ah(async (req, res) => {
  const r = await tx((c) => planPassage(c, req.params.id));
  res.json(r);
}));

router.post('/:id/passage', autoriser('directeur'), ah(async (req, res) => {
  const cibleId = Number(req.params.id);
  const activer = req.body.activer !== false;
  const resultat = await tx(async (c) => {
    const cible = await c.one('SELECT * FROM annees_scolaires WHERE id = $1', [cibleId]);
    if (!cible) throw new HttpError(404, 'Année cible introuvable.');
    const { source, plan } = await planPassage(c, cibleId);

    // 1. Recopie des classes (mêmes groupes, mêmes titulaires) dans l'année cible.
    const classesSrc = await c.query('SELECT * FROM classes WHERE annee_id = $1', [source.id]);
    for (const cl of classesSrc) {
      await c.query(
        `INSERT INTO classes (annee_id, niveau_id, groupe, nom, enseignant_id, salle, frais_inscription, mensualite)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (annee_id, nom) DO NOTHING`,
        [cibleId, cl.niveau_id, cl.groupe, cl.nom, cl.enseignant_id, cl.salle, cl.frais_inscription, cl.mensualite]);
    }
    const classesCible = await c.query(
      `SELECT c.*, COALESCE(c.frais_inscription, n.frais_inscription) AS frais, COALESCE(c.mensualite, n.mensualite) AS mens
         FROM classes c JOIN niveaux n ON n.id = c.niveau_id WHERE c.annee_id = $1 ORDER BY c.nom`, [cibleId]);

    // 2. Inscriptions dans l'année cible.
    const stats = { passe: 0, redouble: 0, fin_cycle: 0, sortie: 0, deja_inscrit: 0 };
    for (const p of plan) {
      stats[p.action]++;
      if (p.action === 'fin_cycle' || p.action === 'sortie') {
        await c.query(
          `UPDATE eleves SET statut = 'archive', date_sortie = $1, motif_sortie = $2 WHERE id = $3`,
          [source.date_fin, p.action === 'fin_cycle' ? 'Fin de cycle (CM2 terminé)' : 'Non réinscrit', p.eleve_id]);
        continue;
      }
      if (p.action !== 'passe' && p.action !== 'redouble') continue;
      const candidates = classesCible.filter((cl) => cl.niveau_id === p.niveau_cible_id);
      const classe = candidates.find((cl) => cl.groupe === p.groupe) || candidates[0];
      if (!classe) continue;
      await c.query(
        `INSERT INTO inscriptions (eleve_id, annee_id, classe_id, date_inscription, frais_inscription, mensualite, reduction, reduction_motif)
         VALUES ($1,$2,$3,$4,$5,$6,LEAST($7,$6),$8)`,
        [p.eleve_id, cibleId, classe.id, cible.date_debut, classe.frais, classe.mens, p.reduction, p.reduction_motif]);
    }
    if (activer) {
      await c.query('UPDATE annees_scolaires SET active = FALSE, cloturee = TRUE WHERE id = $1', [source.id]);
      await c.query('UPDATE annees_scolaires SET active = TRUE WHERE id = $1', [cibleId]);
    }
    return stats;
  });
  res.json({ ok: true, stats: resultat });
}));

module.exports = router;
