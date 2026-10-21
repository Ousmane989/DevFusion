'use strict';

// Application Express : API JSON sous /api, interface statique dans /public.
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const { authentifier } = require('./auth');
const { HttpError } = require('./utils');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '5mb' })); // photos et logo envoyés en data URL
app.use(cookieParser());
app.use((req, res, next) => { if (!req.body) req.body = {}; next(); }); // Express 5 : corps absent = undefined

// En-têtes de sécurité simples.
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  res.set('Referrer-Policy', 'same-origin');
  next();
});

app.get('/healthz', (req, res) => res.json({ ok: true }));

// ---- Routes publiques ----
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cron', require('./routes/cron'));

// ---- Routes protégées ----
const api = express.Router();
api.use(authentifier);
api.use('/tableau-de-bord', require('./routes/tableauDeBord'));
api.use('/parametres', require('./routes/parametres'));
api.use('/utilisateurs', require('./routes/utilisateurs'));
api.use('/annees', require('./routes/annees'));
api.use('/classes', require('./routes/classes'));
api.use('/eleves', require('./routes/eleves'));
api.use('/paiements', require('./routes/paiements'));
api.use('/whatsapp', require('./routes/whatsapp'));
api.use('/presences', require('./routes/presences'));
api.use('/notes', require('./routes/notes'));
api.use('/personnel', require('./routes/personnel'));
api.use('/finances', require('./routes/finances'));
api.use('/calendrier', require('./routes/calendrier'));
api.use('/exports', require('./routes/exports'));
api.use('/certificats', require('./routes/certificats'));
app.use('/api', api);

app.use('/api', (req, res) => res.status(404).json({ erreur: 'Route inconnue.' }));

// ---- Documents publics signés (liens envoyés aux parents par WhatsApp) ----
app.use(require('./routes/public'));

// ---- Interface ----
const pub = path.join(__dirname, '..', 'public');
// Service worker : jamais mis en cache, pour que les mises à jour arrivent tout de suite.
app.get('/sw.js', (req, res) => {
  res.set('Cache-Control', 'no-cache').set('Service-Worker-Allowed', '/').sendFile(path.join(pub, 'sw.js'));
});
app.get('/manifest.webmanifest', (req, res) => {
  res.type('application/manifest+json').set('Cache-Control', 'no-cache').sendFile(path.join(pub, 'manifest.webmanifest'));
});
app.use(express.static(pub, { extensions: ['html'], maxAge: '1h' }));
app.get('/app', (req, res) => res.sendFile(path.join(pub, 'app.html')));

// ---- Gestion des erreurs ----
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ erreur: err.message });
  // Erreurs PostgreSQL fréquentes traduites en messages compréhensibles.
  if (err.code === '23505') return res.status(409).json({ erreur: 'Cette valeur existe déjà (doublon).' });
  if (err.code === '23514') return res.status(400).json({ erreur: 'Une valeur saisie n\'est pas valide.' });
  if (err.code === '23503') return res.status(409).json({ erreur: 'Opération impossible : cet élément est utilisé ailleurs.' });
  if (err.code === '22P02' || err.code === '22007' || err.code === '22008') return res.status(400).json({ erreur: 'Format de donnée invalide.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ erreur: 'Fichier trop volumineux.' });
  console.error(err);
  res.status(500).json({ erreur: 'Erreur interne du serveur.' });
});

module.exports = app;
