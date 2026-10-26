'use strict';

// Certificats de scolarité (Espace Directrice) : données préremplies à partir
// des fiches élèves, modifiables, puis PDF à 2 certificats par page A4.
const express = require('express');
const { query } = require('../db');
const { ah, HttpError, aujourdhui } = require('../utils');
const { autoriser } = require('../auth');
const pdf = require('../services/pdf');

const router = express.Router();
router.use(autoriser('directeur'));

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const dateLongue = (iso) => {
  if (!iso) return '';
  const [a, m, j] = String(iso).slice(0, 10).split('-').map(Number);
  return `${j === 1 ? '1er' : j} ${MOIS[m - 1]} ${a}`;
};

/** Données préremplies pour des élèves (ids) ou toute une classe (classe_id). */
router.get('/donnees', ah(async (req, res) => {
  const params = []; let filtre = '';
  if (req.query.classe_id) { params.push(req.query.classe_id); filtre = `AND c.id = $${params.length}`; }
  else if (req.query.eleve_ids) { params.push(String(req.query.eleve_ids).split(',').map(Number).filter(Boolean)); filtre = `AND e.id = ANY($${params.length})`; }
  else throw new HttpError(400, 'Choisissez au moins un élève.');
  const rows = await query(
    `SELECT e.id, e.prenom, e.nom, e.sexe, e.date_naissance, e.lieu_naissance, e.pere_nom, e.mere_nom, e.tuteur_nom,
            c.nom AS classe, n.cycle, a.libelle AS annee
       FROM eleves e JOIN inscriptions i ON i.eleve_id = e.id JOIN annees_scolaires a ON a.id = i.annee_id AND a.active
       JOIN classes c ON c.id = i.classe_id JOIN niveaux n ON n.id = c.niveau_id
      WHERE e.statut = 'actif' ${filtre} ORDER BY n.ordre, c.nom, i.numero, e.nom, e.prenom`, params);
  const date = dateLongue(aujourdhui());
  res.json(rows.map((r) => {
    const parents = [r.pere_nom, r.mere_nom].filter(Boolean);
    return {
      eleve_id: r.id,
      eleve: `${r.prenom} ${r.nom}`,
      sexe: r.sexe,
      naissance: [dateLongue(r.date_naissance), r.lieu_naissance && `à ${r.lieu_naissance}`].filter(Boolean).join(' '),
      filiation: parents.length ? parents.join(' et de ') : (r.tuteur_nom || ''),
      classe: r.cycle === 'maternelle' ? `la ${r.classe}` : `la classe de ${r.classe}`,
      annee: r.annee,
      date,
    };
  }));
}));

/**
 * PDF, 2 certificats par feuille A4 :
 *  - mise_en_page « vierge » (par défaut) : en haut le certificat rempli de l'élève,
 *    en bas un certificat vierge que la directrice remplit à la main ;
 *  - « suite » : deux élèves différents par feuille.
 * Liste vide = une feuille de 2 certificats vierges.
 */
router.post('/pdf', ah(async (req, res) => {
  const champs = ['eleve', 'naissance', 'sexe', 'filiation', 'classe', 'annee', 'date'];
  const liste = (Array.isArray(req.body.certificats) ? req.body.certificats : []).slice(0, 300).map((c) => (
    c ? Object.fromEntries(champs.map((k) => [k, String(c[k] ?? '').slice(0, 160)])) : null));
  const pages = req.body.mise_en_page === 'suite' ? liste : liste.flatMap((c) => [c, null]);
  const buf = await pdf.certificats(pages);
  res.type('application/pdf').set('Content-Disposition', 'inline; filename="certificats-scolarite.pdf"').send(buf);
}));

module.exports = router;
