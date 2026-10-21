'use strict';

// Point d'entrée serverless pour Vercel : l'application Express est exportée
// sans écouter de port. Au premier appel de chaque instance, on vérifie la
// structure de la base (script idempotent) avant de traiter la requête.
const app = require('../src/app');
const { migrer } = require('../src/db');
const { amorcer } = require('../src/services/amorcage');
const { demo } = require('../src/services/demo');

let pret = null;

module.exports = async (req, res) => {
  if (!pret) {
    // Démarrages simultanés sur une base neuve : une instance peut perdre la course à
    // l'insertion des données de départ (doublon) ; on recommence alors une fois.
    const amorcerSur = () => amorcer().catch((e) => (e.code === '23505' ? amorcer() : Promise.reject(e)));
    pret = migrer().then(amorcerSur)
      // DONNEES_DEMO=true : remplit une base vide avec des élèves fictifs.
      .then(() => (process.env.DONNEES_DEMO === 'true' ? demo() : null))
      .catch((e) => { pret = null; throw e; });
  }
  try {
    await pret;
  } catch (e) {
    console.error('Base de données indisponible :', e.message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ erreur: 'Base de données momentanément indisponible.' }));
  }
  return app(req, res);
};
