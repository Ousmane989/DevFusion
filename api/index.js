'use strict';

// Point d'entrée serverless pour Vercel : on exporte l'application Express
// (sans écouter de port ; Vercel invoque le handler par requête).
module.exports = require('../src/app');
