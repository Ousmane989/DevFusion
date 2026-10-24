'use strict';

// ------------------------------------------------------------------
// Application autonome Karat Logistique : uniquement l'agence de livraison
// (vitrine, suivi, espaces partenaire / agence / livreur et leur API), sans
// le reste de la plateforme Karat. Sert au déploiement dans son propre
// projet (Netlify : dossier logistique/). Même base de données que Karat :
// les commandes des boutiques Karat liées continuent d'arriver.
// ------------------------------------------------------------------
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const { config } = require('../config');
const { router: api } = require('./routes');
const pages = require('./pages');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);
app.use(express.json({ limit: config.jsonLimit }));
app.use(cookieParser());

// Seuls les scripts du site (dossier /livreur) et les scripts intégrés aux
// pages peuvent s'exécuter : cela bloque aussi le badge « Powered by Netlify »
// que l'hébergeur ajoute aux pages des projets gratuits.
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', `script-src 'unsafe-inline' ${req.protocol}://${req.get('host')}/livreur/`);
  next();
});

app.use('/api/livreur', api);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Route API introuvable.' }));

// Le site a son propre domaine : la racine mène à la vitrine.
app.get('/', (_req, res) => res.redirect('/livreur'));
app.use('/livreur', pages);
app.use('/livreur', express.static(path.join(PUBLIC_DIR, 'livreur'), {
  setHeaders: (res) => res.setHeader('Cache-Control', 'public, max-age=3600'),
}));
app.get('/favicon.svg', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'favicon.svg')));

app.use((_req, res) => res.redirect('/livreur'));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Erreur serveur :', err && err.message ? err.message : err);
  if (res.headersSent) return;
  res.status(err && err.status ? err.status : 500).json({ error: 'Erreur interne du serveur.' });
});

module.exports = app;
