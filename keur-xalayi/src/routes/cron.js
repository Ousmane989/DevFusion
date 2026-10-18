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
  const recu = Buffer.from(String(req.get('x-cron-secret') || ''));
  const attendu = Buffer.from(config.cronSecret);
  if (!config.cronSecret || recu.length !== attendu.length || !crypto.timingSafeEqual(recu, attendu)) {
    throw new HttpError(401, 'Secret de cron invalide.');
  }
}

router.post('/quotidien', ah(async (req, res) => {
  verifierSecret(req);
  const r = await executerQuotidien({ forcer: true });
  r.sauvegarde = await sauvegardeDuJour();
  res.json(r);
}));

module.exports = router;
