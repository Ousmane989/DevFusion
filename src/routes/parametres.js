'use strict';

// Paramètres de l'école, tarifs par niveau, matières/compétences, sauvegardes.
const express = require('express');
const path = require('path');
const { query, one } = require('../db');
const { ah, HttpError, vide, PAYS } = require('../utils');
const { autoriser } = require('../auth');
const config = require('../config');
const { sauvegarder } = require('../services/sauvegarde');

const router = express.Router();

const CHAMPS = ['nom_ecole', 'slogan', 'logo', 'adresse', 'telephone', 'email', 'devise', 'indicatif_defaut',
  'rappel_auto', 'rappel_jour', 'rappel_heure', 'rappel_impayes_seulement', 'date_limite_jour',
  'second_rappel_actif', 'second_rappel_delai', 'modele_rappel', 'modele_second_rappel', 'modele_absence',
  'modele_recu', 'modele_bulletin', 'notif_absence_auto', 'nb_periodes', 'libelle_periode',
  'directrice_nom', 'ville', 'entete_certificat'];

router.get('/', ah(async (req, res) => {
  const p = await one('SELECT * FROM parametres WHERE id = 1');
  const w = config.whatsapp;
  p.whatsapp = {
    mode: w.mode,
    configure: w.mode === 'manuel' || (w.mode === 'meta' && !!w.meta.token && !!w.meta.phoneNumberId)
      || (w.mode === 'twilio' && !!w.twilio.sid && !!w.twilio.token),
  };
  res.json(p);
}));

router.put('/', autoriser('directeur'), ah(async (req, res) => {
  const sets = [];
  const vals = [];
  for (const c of CHAMPS) {
    if (req.body[c] === undefined) continue;
    if (c === 'logo' && req.body.logo && !/^data:image\/(png|jpe?g);base64,/.test(req.body.logo)) {
      throw new HttpError(400, 'Le logo doit être une image PNG ou JPEG.');
    }
    if (c === 'indicatif_defaut' && !PAYS.some((x) => '+' + x[2] === req.body[c])) {
      throw new HttpError(400, 'Indicatif de pays inconnu.');
    }
    if (c === 'libelle_periode' && !['Trimestre', 'Composition', 'Semestre'].includes(req.body[c])) {
      throw new HttpError(400, 'Nom de période invalide.');
    }
    vals.push(c === 'logo' ? vide(req.body[c]) : req.body[c]);
    sets.push(`${c} = $${vals.length}`);
  }
  if (!sets.length) throw new HttpError(400, 'Aucune modification.');
  await query(`UPDATE parametres SET ${sets.join(', ')}, updated_at = now() WHERE id = 1`, vals);
  res.json(await one('SELECT * FROM parametres WHERE id = 1'));
}));

// ---- Niveaux et tarifs par défaut ----
router.get('/niveaux', ah(async (req, res) => {
  res.json(await query('SELECT * FROM niveaux ORDER BY ordre'));
}));

router.put('/niveaux/:id', autoriser('directeur'), ah(async (req, res) => {
  const { frais_inscription, mensualite } = req.body;
  const fournitures = Number(req.body.fournitures ?? 0); const uniforme = Number(req.body.uniforme ?? 0);
  const blouson = Number(req.body.blouson ?? 0);
  if (![frais_inscription, mensualite, fournitures, uniforme, blouson].every((x) => Number.isFinite(Number(x)) && Number(x) >= 0)) {
    throw new HttpError(400, 'Montants invalides.');
  }
  const r = await one('UPDATE niveaux SET frais_inscription = $1, mensualite = $2, fournitures = $3, uniforme = $4, blouson = $5 WHERE id = $6 RETURNING *',
    [frais_inscription, mensualite, fournitures, uniforme, blouson, req.params.id]);
  if (req.body.appliquer_inscriptions) {
    // Met à jour les inscriptions de l'année active des classes sans tarif propre.
    await query(
      `UPDATE inscriptions i SET mensualite = $1, reduction = LEAST(i.reduction, $1)
         FROM classes c, annees_scolaires a
        WHERE c.id = i.classe_id AND a.id = i.annee_id AND a.active AND c.niveau_id = $2 AND c.mensualite IS NULL`,
      [mensualite, req.params.id]);
    // Fournitures, uniforme et blouson : tarif du niveau pour tous les élèves de l'année active.
    await query(
      `UPDATE inscriptions i SET fournitures = $1, uniforme = $2, blouson = $3
         FROM classes c, annees_scolaires a
        WHERE c.id = i.classe_id AND a.id = i.annee_id AND a.active AND c.niveau_id = $4`,
      [fournitures, uniforme, blouson, req.params.id]);
  }
  res.json(r);
}));

// ---- Matières (primaire) ----
router.get('/matieres', ah(async (req, res) => {
  res.json(await query('SELECT * FROM matieres ORDER BY ordre, nom'));
}));

router.post('/matieres', autoriser('directeur'), ah(async (req, res) => {
  const { nom, coefficient = 1, bareme = 10, niveaux = ['CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'] } = req.body;
  if (!nom) throw new HttpError(400, 'Nom de la matière obligatoire.');
  res.status(201).json(await one(
    'INSERT INTO matieres (nom, coefficient, bareme, niveaux, ordre) VALUES ($1,$2,$3,$4,(SELECT COALESCE(MAX(ordre),0)+1 FROM matieres)) RETURNING *',
    [nom, coefficient, bareme, niveaux]));
}));

router.put('/matieres/:id', autoriser('directeur'), ah(async (req, res) => {
  const { nom, coefficient, bareme, niveaux } = req.body;
  res.json(await one(
    'UPDATE matieres SET nom = COALESCE($1, nom), coefficient = COALESCE($2, coefficient), bareme = COALESCE($3, bareme), niveaux = COALESCE($4, niveaux) WHERE id = $5 RETURNING *',
    [vide(nom), vide(coefficient), vide(bareme), niveaux || null, req.params.id]));
}));

router.delete('/matieres/:id', autoriser('directeur'), ah(async (req, res) => {
  await query('DELETE FROM matieres WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
}));

// ---- Compétences (maternelle) ----
router.get('/competences', ah(async (req, res) => {
  res.json(await query('SELECT * FROM competences ORDER BY ordre, domaine, libelle'));
}));

router.post('/competences', autoriser('directeur'), ah(async (req, res) => {
  const { domaine, libelle } = req.body;
  if (!domaine || !libelle) throw new HttpError(400, 'Domaine et compétence obligatoires.');
  res.status(201).json(await one(
    'INSERT INTO competences (domaine, libelle, ordre) VALUES ($1,$2,(SELECT COALESCE(MAX(ordre),0)+1 FROM competences)) RETURNING *',
    [domaine, libelle]));
}));

router.delete('/competences/:id', autoriser('directeur'), ah(async (req, res) => {
  await query('DELETE FROM competences WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
}));

// ---- Sauvegardes ----
router.get('/sauvegardes', autoriser('directeur'), ah(async (req, res) => {
  res.json(await query(
    'SELECT id, fichier, taille, auto, created_at FROM sauvegardes WHERE donnees IS NOT NULL ORDER BY created_at DESC LIMIT 30'));
}));

router.post('/sauvegardes', autoriser('directeur'), ah(async (req, res) => {
  res.status(201).json(await sauvegarder({ auto: false }));
}));

router.get('/sauvegardes/:id/telecharger', autoriser('directeur'), ah(async (req, res) => {
  const s = await one('SELECT fichier, donnees FROM sauvegardes WHERE id = $1 AND donnees IS NOT NULL', [req.params.id]);
  if (!s) throw new HttpError(404, 'Sauvegarde introuvable.');
  res.type('application/gzip').set('Content-Disposition', `attachment; filename="${path.basename(s.fichier)}"`).send(s.donnees);
}));

module.exports = router;
