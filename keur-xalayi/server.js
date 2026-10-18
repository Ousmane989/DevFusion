'use strict';

// Point d'entrée : prépare la base, lance les tâches planifiées puis le serveur.
const config = require('./src/config');
const app = require('./src/app');
const { migrer } = require('./src/db');
const { amorcer } = require('./src/services/amorcage');
const { demarrerTaches } = require('./src/services/planificateur');

(async () => {
  try {
    await migrer();
    await amorcer();
  } catch (e) {
    console.error('✖ Impossible de préparer la base de données :', e.message);
    process.exit(1);
  }
  if (config.cronInterne) demarrerTaches();
  app.listen(config.port, () => {
    console.log(`\n  🏫 Keur Xalayi en ligne : http://localhost:${config.port}`);
    console.log(`  WhatsApp : mode « ${config.whatsapp.mode} »\n`);
  });
})();
