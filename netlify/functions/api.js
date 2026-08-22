'use strict';

// Point d'entrée serverless Netlify : on enveloppe l'application Express
// (src/app.js, sans listen) avec serverless-http. Toutes les routes /api,
// les pages rendues côté serveur et la vitrine passent par ici.
const serverless = require('serverless-http');
const app = require('../../src/app');

exports.handler = serverless(app, {
  // Conserve le corps binaire (images en data URL) intact.
  binary: ['image/*', 'application/octet-stream'],
});
