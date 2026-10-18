'use strict';

// Documents accessibles sans connexion grâce à un lien signé :
//   /recu/:numero?s=…                  -> reçu PDF
//   /bulletin/:inscription/:periode?s=… -> bulletin PDF d'un élève
const express = require('express');
const { ah, HttpError } = require('../utils');
const { verifier } = require('../services/liens');
const pdf = require('../services/pdf');
const { resultatsClasse } = require('../services/notes');
const { one } = require('../db');
const { observationsDe } = require('./notes');

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

module.exports = router;
