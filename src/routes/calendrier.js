'use strict';

// Calendrier scolaire : vacances, examens, événements, jours fériés, réunions.
const express = require('express');
const { query, one } = require('../db');
const { ah, HttpError, exiger, vide } = require('../utils');
const { autoriser } = require('../auth');

const router = express.Router();
const TYPES = ['vacances', 'examen', 'evenement', 'ferie', 'reunion'];

router.get('/', ah(async (req, res) => {
  const { du, au } = req.query;
  const params = []; const where = [];
  if (du) { params.push(du); where.push(`date_fin >= $${params.length}`); }
  if (au) { params.push(au); where.push(`date_debut <= $${params.length}`); }
  res.json(await query(`SELECT * FROM evenements ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY date_debut`, params));
}));

router.post('/', autoriser('directeur', 'secretaire'), ah(async (req, res) => {
  exiger(req.body, ['titre', 'type', 'date_debut']);
  if (!TYPES.includes(req.body.type)) throw new HttpError(400, 'Type d\'événement invalide.');
  res.status(201).json(await one(
    'INSERT INTO evenements (titre, type, date_debut, date_fin, description) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [req.body.titre, req.body.type, req.body.date_debut, vide(req.body.date_fin) || req.body.date_debut, vide(req.body.description)]));
}));

router.put('/:id', autoriser('directeur', 'secretaire'), ah(async (req, res) => {
  exiger(req.body, ['titre', 'type', 'date_debut']);
  if (!TYPES.includes(req.body.type)) throw new HttpError(400, 'Type d\'événement invalide.');
  res.json(await one(
    'UPDATE evenements SET titre=$1, type=$2, date_debut=$3, date_fin=$4, description=$5 WHERE id=$6 RETURNING *',
    [req.body.titre, req.body.type, req.body.date_debut, vide(req.body.date_fin) || req.body.date_debut, vide(req.body.description), req.params.id]));
}));

router.delete('/:id', autoriser('directeur', 'secretaire'), ah(async (req, res) => {
  await query('DELETE FROM evenements WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
}));

module.exports = router;
