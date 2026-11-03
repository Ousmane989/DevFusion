'use strict';

// Documents accessibles sans connexion grâce à un lien signé :
//   /recu/:numero?s=…                  -> reçu PDF
//   /bulletin/:inscription/:periode?s=… -> bulletin PDF d'un élève
//   /facture/mois/:mois/:eleve?s=…      -> facture du mois d'un élève
//   /facture/inscription/:eleve?s=…     -> facture d'inscription
const express = require('express');
const { ah, HttpError } = require('../utils');
const { verifier } = require('../services/liens');
const pdf = require('../services/pdf');
const { resultatsClasse } = require('../services/notes');
const { one } = require('../db');
const { observationsDe } = require('./notes');
const finance = require('../services/finance');

const router = express.Router();

router.get('/recu/:numero', ah(async (req, res) => {
  if (!verifier('recu:' + req.params.numero, req.query.s)) throw new HttpError(403, 'Lien invalide.');
  const buf = await pdf.recu(req.params.numero);
  if (!buf) throw new HttpError(404, 'Reçu introuvable.');
  res.type('application/pdf').set('Content-Disposition', `inline; filename="recu-${req.params.numero}.pdf"`).send(buf);
}));

router.get('/bulletin/:inscription/:periode', ah(async (req, res) => {
  const { inscription, periode } = req.params;
  if (!verifier(`bulletin:${inscription}:${periode}`, req.query.s)) throw new HttpError(403, 'Lien invalide.');
  const insc = await one('SELECT classe_id FROM inscriptions WHERE id = $1', [inscription]);
  if (!insc) throw new HttpError(404, 'Bulletin introuvable.');
  const r = await resultatsClasse(insc.classe_id, Number(periode));
  const obs = Number(periode) > 0 ? await observationsDe([Number(inscription)], Number(periode)) : {};
  const buf = await pdf.bulletins(r, [Number(inscription)], obs);
  res.type('application/pdf').set('Content-Disposition', 'inline; filename="bulletin.pdf"').send(buf);
}));

router.get('/facture/mois/:mois/:eleve', ah(async (req, res) => {
  const { mois, eleve } = req.params;
  const r = req.query.r ? String(req.query.r) : '';
  if (!/^\d{4}-\d{2}-01$/.test(mois) || !verifier(`facture:${mois}:${eleve}:${r}`, req.query.s)) throw new HttpError(403, 'Lien invalide.');
  const moisRetard = r ? r.split(',').filter((x) => /^\d{4}-\d{2}-01$/.test(x)) : undefined;
  const liste = await finance.facturesMois(mois, { eleveId: eleve, moisRetard });
  if (!liste.length) throw new HttpError(404, 'Facture introuvable.');
  const buf = await pdf.facturesMensualite(liste, mois);
  res.type('application/pdf').set('Content-Disposition', `inline; filename="facture-${mois.slice(0, 7)}.pdf"`).send(buf);
}));

router.get('/facture/inscription/:eleve', ah(async (req, res) => {
  if (!verifier(`facture-inscription:${req.params.eleve}`, req.query.s)) throw new HttpError(403, 'Lien invalide.');
  const insc = await one(`SELECT i.id FROM inscriptions i JOIN annees_scolaires a ON a.id = i.annee_id
                           WHERE i.eleve_id = $1 ORDER BY a.active DESC, a.date_debut DESC LIMIT 1`, [req.params.eleve]);
  const f = insc && await pdf.factureInscription(insc.id);
  if (!f) throw new HttpError(404, 'Facture introuvable.');
  res.type('application/pdf').set('Content-Disposition', `inline; filename="facture-${f.numero}.pdf"`).send(f.buf);
}));

module.exports = router;
