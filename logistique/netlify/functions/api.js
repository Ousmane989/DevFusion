'use strict';

// Point d'entrée serverless Netlify de Karat Logistique : l'application
// autonome de l'agence (copiée dans app/ par build.js), enveloppée par serverless-http.
// Toujours en production sur Netlify : jamais de comptes de démonstration
// (mot de passe connu) dans la vraie base.
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const serverless = require('serverless-http');
const app = require('../../app/src/livreur/app');

// Images et polices renvoyées en binaire (sinon elles arrivent abîmées).
exports.handler = serverless(app, { binary: ['image/*', 'font/*', 'application/octet-stream'] });
