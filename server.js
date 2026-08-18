'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const { config, validate } = require('./src/config');
const { securityHeaders, publicCors } = require('./src/http');
const { loadUser } = require('./src/middleware');
const authRoutes = require('./src/routes/auth.routes');
const billingRoutes = require('./src/routes/billing.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const productsRoutes = require('./src/routes/products.routes');
const storeRoutes = require('./src/routes/store.routes');
const ordersRoutes = require('./src/routes/orders.routes');
const publicRoutes = require('./src/routes/public.routes');
const { hasSmtp } = require('./src/mailer');

const pkg = require('./package.json');
const app = express();
const PUBLIC_DIR = path.join(__dirname, 'public');

// ------------------------------------------------------------------
// Reglages de base
// ------------------------------------------------------------------
app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy); // cookies "secure" + IP correctes derriere un proxy
app.use(securityHeaders);
app.use(express.json({ limit: config.jsonLimit }));
app.use(cookieParser());
app.use(loadUser);

// Sous-domaine de boutique : <slug>.<baseDomain> sert la vitrine (necessite
// un DNS wildcard chez l'hebergeur). Les assets et l'API restent accessibles.
app.use((req, res, next) => {
  const host = (req.hostname || '').toLowerCase();
  const base = config.baseDomain.toLowerCase();
  if (host.endsWith('.' + base)) {
    const sub = host.slice(0, -(base.length + 1));
    if (sub && sub !== 'www' && req.method === 'GET' && !req.path.startsWith('/api') && !req.path.includes('.')) {
      return res.sendFile(path.join(PUBLIC_DIR, 'boutique.html'));
    }
  }
  next();
});

// ------------------------------------------------------------------
// Sante de l'API (utilise par l'hebergeur pour le health check)
// ------------------------------------------------------------------
app.get(['/api/health', '/healthz'], (_req, res) => {
  res.json({ ok: true, name: pkg.name, version: pkg.version, env: config.env, uptime: Math.round(process.uptime()) });
});

// Petit index des routes de l'API.
app.get('/api', (_req, res) => {
  res.json({
    name: 'Karat API',
    version: pkg.version,
    endpoints: {
      auth: ['POST /api/auth/signup', 'POST /api/auth/verify-email', 'POST /api/auth/resend-code', 'POST /api/auth/login', 'POST /api/auth/logout', 'GET /api/auth/me', 'POST /api/auth/forgot', 'POST /api/auth/reset'],
      billing: ['GET /api/billing/status', 'POST /api/billing/pay'],
      dashboard: ['GET /api/dashboard'],
      products: ['GET /api/products', 'POST /api/products', 'PUT /api/products/:id', 'DELETE /api/products/:id'],
      store: ['GET /api/store', 'PUT /api/store', 'PUT /api/store/shipping'],
      orders: ['GET /api/orders', 'PUT /api/orders/:id/status'],
      public: ['GET /api/public/store/:slug', 'POST /api/public/store/:slug/order', 'POST /api/public/store/:slug/visit', 'POST /api/public/store/:slug/event'],
    },
  });
});

// ------------------------------------------------------------------
// API
// ------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/public', publicCors, publicRoutes);

// 404 JSON pour toute route /api inconnue.
app.use('/api', (_req, res) => res.status(404).json({ error: 'Route API introuvable.' }));

// ------------------------------------------------------------------
// Pages protegees (rendues cote client, mais l'acces est garde ici).
// ------------------------------------------------------------------
app.get('/tableau-de-bord', (req, res, next) => {
  if (!req.user) return res.redirect('/connexion?suite=/tableau-de-bord');
  if (req.user.status === 'locked') return res.redirect('/paiement');
  next();
});

app.get('/paiement', (req, res, next) => {
  if (!req.user) return res.redirect('/connexion?suite=/paiement');
  next();
});

// Vitrine publique d'une boutique (rendue côté client).
app.get('/boutique/:slug', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'boutique.html'));
});

// Fichiers statiques (HTML, CSS, JS, images).
app.use(
  express.static(PUBLIC_DIR, {
    extensions: ['html'],
    setHeaders: (res, filePath) => {
      // Les pages HTML ne sont pas mises en cache ; les assets le sont.
      if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
      else res.setHeader('Cache-Control', 'public, max-age=3600');
    },
  })
);

// Repli : page 404 simple.
app.use((_req, res) => {
  res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'));
});

// ------------------------------------------------------------------
// Gestionnaire d'erreurs global (toujours du JSON pour l'API).
// ------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('Erreur serveur :', err && err.message ? err.message : err);
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Requete trop volumineuse.' });
  }
  if (res.headersSent) return;
  res.status(500).json({ error: 'Erreur interne du serveur.' });
});

// ------------------------------------------------------------------
// Demarrage
// ------------------------------------------------------------------
const { warnings, errors } = validate();
errors.forEach((e) => console.error('  ✖ ' + e));
warnings.forEach((w) => console.warn('  ⚠ ' + w));
if (errors.length && config.isProd) {
  console.error('\n  Configuration invalide en production. Arret.\n');
  process.exit(1);
}

const server = app.listen(config.port, () => {
  console.log(`\n  ✦ Karat (${config.env}) en ligne : http://localhost:${config.port}`);
  console.log(hasSmtp ? '  ✉  SMTP configure — e-mails envoyes.\n' : '  ⚠  SMTP non configure — codes affiches ici (mode dev).\n');
});

// Arret propre (Render/Docker envoient SIGTERM).
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => { server.close(() => process.exit(0)); });
}
