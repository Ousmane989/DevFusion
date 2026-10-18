'use strict';

// Tâches planifiées internes (node-cron) :
//   • chaque heure : si l'heure configurée est atteinte, rappels WhatsApp du jour ;
//   • chaque nuit à 2 h : sauvegarde automatique.
// Les tâches sont idempotentes : on peut aussi les déclencher depuis un cron
// externe via POST /api/cron/quotidien.
const cron = require('node-cron');
const { one } = require('../db');
const { tacheQuotidienne } = require('./rappels');
const { sauvegarder } = require('./sauvegarde');

async function executerQuotidien({ forcer = false } = {}) {
  const p = await one('SELECT rappel_heure FROM parametres WHERE id = 1');
  const resultat = { rappels: [], sauvegarde: null };
  if (forcer || new Date().getHours() >= p.rappel_heure) resultat.rappels = await tacheQuotidienne();
  return resultat;
}

async function sauvegardeDuJour() {
  const derniere = await one(`SELECT 1 FROM sauvegardes WHERE auto AND created_at::date = CURRENT_DATE`);
  if (!derniere) return sauvegarder({ auto: true });
  return null;
}

function demarrerTaches() {
  const tz = process.env.TZ || 'Africa/Dakar';
  cron.schedule('5 * * * *', () => {
    executerQuotidien()
      .then((r) => r.rappels.length && console.log('  ✉ Rappels envoyés :', JSON.stringify(r.rappels)))
      .catch((e) => console.error('✖ Rappels automatiques :', e.message));
  }, { timezone: tz });
  cron.schedule('0 2 * * *', () => {
    sauvegardeDuJour().catch((e) => console.error('✖ Sauvegarde automatique :', e.message));
  }, { timezone: tz });
  console.log(`  ⏰ Tâches planifiées actives (fuseau ${tz}).`);
}

module.exports = { demarrerTaches, executerQuotidien, sauvegardeDuJour };
