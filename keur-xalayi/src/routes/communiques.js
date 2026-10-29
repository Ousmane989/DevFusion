'use strict';

// Informations aux parents (fête, réunion, vacances, sortie…) : enregistrées,
// imprimées (1 ou 2 par feuille A4) et envoyées par WhatsApp depuis « Annonces ».
const express = require('express');
const { query, one } = require('../db');
const { ah, HttpError, vide } = require('../utils');
const { autoriser } = require('../auth');
const pdf = require('../services/pdf');

const router = express.Router();
router.use(autoriser('directeur'));

const TYPES = ['fete', 'reunion', 'vacances', 'fermeture', 'sortie', 'examen', 'autre'];

function nettoyer(b) {
  const t = (v, max) => {
    const x = vide(typeof v === 'string' ? v.trim() : v);
    if (x && String(x).length > max) throw new HttpError(400, 'Texte trop long.');
    return x;
  };
  const d = {
    type: TYPES.includes(b.type) ? b.type : 'autre',
    titre: t(b.titre, 120), texte: t(b.texte, 3000), heure: t(b.heure, 40), lieu: t(b.lieu, 120),
    date_evenement: vide(b.date_evenement), date_fin: vide(b.date_fin), classe_id: vide(b.classe_id), coupon: b.coupon === true || b.coupon === 'true',
  };
  if (!d.titre) throw new HttpError(400, 'Donnez un titre à l\'information (ex. Fête de fin d\'année).');
  if (!d.texte) throw new HttpError(400, 'Écrivez le texte de l\'information.');
  for (const k of ['date_evenement', 'date_fin']) if (d[k] && !/^\d{4}-\d{2}-\d{2}$/.test(d[k])) throw new HttpError(400, 'Date invalide.');
  if (d.date_fin && d.date_evenement && d.date_fin < d.date_evenement) throw new HttpError(400, 'La date de fin est avant la date de début.');
  return d;
}

// Identifiant numérique, sinon 404
router.param('id', (req, res, next, id) => (/^\d+$/.test(id) ? next() : next(new HttpError(404, 'Information introuvable.'))));

const SELECT = `SELECT co.*, c.nom AS classe FROM communiques co LEFT JOIN classes c ON c.id = co.classe_id`;

router.get('/', ah(async (req, res) => {
  res.json(await query(`${SELECT} ORDER BY co.date_evenement DESC NULLS LAST, co.created_at DESC LIMIT 200`));
}));

router.get('/:id', ah(async (req, res) => {
  const c = await one(`${SELECT} WHERE co.id = $1`, [req.params.id]);
  if (!c) throw new HttpError(404, 'Information introuvable.');
  res.json(c);
}));

router.post('/', ah(async (req, res) => {
  const d = nettoyer(req.body);
  const c = await one(
    `INSERT INTO communiques (type, titre, texte, heure, lieu, date_evenement, date_fin, classe_id, coupon, utilisateur_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [d.type, d.titre, d.texte, d.heure, d.lieu, d.date_evenement, d.date_fin, d.classe_id, d.coupon, req.user.id]);
  res.status(201).json(c);
}));

router.put('/:id', ah(async (req, res) => {
  const d = nettoyer(req.body);
  const c = await one(
    `UPDATE communiques SET type=$1, titre=$2, texte=$3, heure=$4, lieu=$5, date_evenement=$6, date_fin=$7, classe_id=$8, coupon=$9, updated_at=now()
      WHERE id = $10 RETURNING id`,
    [d.type, d.titre, d.texte, d.heure, d.lieu, d.date_evenement, d.date_fin, d.classe_id, d.coupon, req.params.id]);
  if (!c) throw new HttpError(404, 'Information introuvable.');
  res.json(c);
}));

router.delete('/:id', ah(async (req, res) => {
  await query('DELETE FROM communiques WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
}));

// PDF : ?par_page=1 (une grande feuille) ou 2 (deux exemplaires, à couper)
router.get('/:id/pdf', ah(async (req, res) => {
  const c = await one(`${SELECT} WHERE co.id = $1`, [req.params.id]);
  if (!c) throw new HttpError(404, 'Information introuvable.');
  const buf = await pdf.communique(c, { parPage: req.query.par_page === '2' ? 2 : 1 });
  res.type('application/pdf').set('Content-Disposition', `inline; filename="information-${c.id}.pdf"`).send(buf);
}));

module.exports = router;
