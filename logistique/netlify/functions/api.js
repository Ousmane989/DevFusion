'use strict';

// Point d'entrée serverless Netlify de Karat Logistique : l'application
// autonome de l'agence (copiée dans app/ par build.js), enveloppée par serverless-http.
// Toujours en production sur Netlify : jamais de comptes de démonstration
// (mot de passe connu) dans la vraie base.
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const serverless = require('serverless-http');
const app = require('../../app/src/livreur/app');

exports.handler = serverless(app);
