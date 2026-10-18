'use strict';

// Initialise la base (tables + données de référence).
//   node scripts/init-db.js          -> structure seule
//   node scripts/init-db.js --demo   -> + données de démonstration (élèves, paiements…)
// Les données de démonstration ne sont ajoutées que si aucun élève n'existe.
const { migrer, pool } = require('../src/db');
const { amorcer } = require('../src/services/amorcage');
const { demo } = require('../src/services/demo');

(async () => {
  await migrer();
  await amorcer();
  console.log('  ✔ Base de données prête.');
  if (process.argv.includes('--demo')) await demo();
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });
