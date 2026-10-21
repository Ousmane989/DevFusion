'use strict';

// Déclenchement des tâches par un cron externe (Render Cron Job, cron-job.org,
// GitHub Actions…). Protégé par l'en-tête « x-cron-secret ».
const express = require('express');
const crypto = require('crypto');
const config = require('../config');
const { ah, HttpError } = require('../utils');
const { executerQuotidien, sauvegardeDuJour } = require('../services/planificateur');

const router = express.Router();

function verifierSecret(req) {
  // En-tête « x-cron-secret », ou « Authorization: Bearer … » (format des crons Vercel).
  const bearer = String(req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const recu = Buffer.from(String(req.get('x-cron-secret') || bearer));
  const attendu = Buffer.from(config.cronSecret);
  if (!config.cronSecret || recu.length !== attendu.length || !crypto.timingSafeEqual(recu, attendu)) {
    throw new HttpError(401, 'Secret de cron invalide.');
  }
}

// GET pour les crons Vercel, POST pour les autres services.
const quotidien = ah(async (req, res) => {
  verifierSecret(req);
  // Sauvegarde d'abord : elle reste faite même si l'envoi des rappels dépasse le temps alloué.
  const sauvegarde = await sauvegardeDuJour();
  const r = await executerQuotidien({ forcer: true });
  res.json({ ...r, sauvegarde });
});
router.get('/quotidien', quotidien);
router.post('/quotidien', quotidien);

module.exports = router;
