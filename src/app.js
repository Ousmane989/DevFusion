'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const { config } = require('./config');
const { securityHeaders, publicCors } = require('./http');
const { loadUser } = require('./middleware');
const authRoutes = require('./routes/auth.routes');
const billingRoutes = require('./routes/billing.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const productsRoutes = require('./routes/products.routes');
const storeRoutes = require('./routes/store.routes');
const ordersRoutes = require('./routes/orders.routes');
const publicRoutes = require('./routes/public.routes');
const accountRoutes = require('./routes/account.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const financeRoutes = require('./routes/finance.routes');
const pushRoutes = require('./routes/push.routes');
const { router: developerRoutes, apiV1: apiV1Routes } = require('./routes/developer.routes');
const { renderStorefrontHtml } = require('./storefront');

const pkg = require('../package.json');
const app = express();
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// Sert la vitrine avec les balises Open Graph injectees (apercu riche sur
// les reseaux sociaux). base = URL publique absolue si definie, sinon l'hote.
async function sendStorefront(req, res, slug) {
  const base = config.publicBaseUrl || (req.protocol + '://' + req.get('host'));
  try {
    const html = await renderStorefrontHtml(slug, base);
    res.set('Cache-Control', 'no-cache');
    res.type('html').send(html);
  } catch (_) {
    res.sendFile(path.join(PUBLIC_DIR, 'boutique.html'));
  }
}

app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);
app.use(securityHeaders);
app.use(express.json({ limit: config.jsonLimit }));
app.use(cookieParser());
app.use(loadUser);

// Sous-domaine de boutique : <slug>.<baseDomain> sert la vitrine.
app.use((req, res, next) => {
  const host = (req.hostname || '').toLowerCase();
  const base = config.baseDomain.toLowerCase();
  if (host.endsWith('.' + base)) {
    const sub = host.slice(0, -(base.length + 1));
    if (sub && sub !== 'www' && req.method === 'GET' && !req.path.startsWith('/api') && !req.path.includes('.')) {
      return sendStorefront(req, res, sub);
    }
  }
  next();
});

app.get(['/api/health', '/healthz'], (_req, res) => {
  res.json({ ok: true, name: pkg.name, version: pkg.version, env: config.env, uptime: Math.round(process.uptime()) });
});

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
      account: ['GET /api/account', 'PUT /api/account', 'POST /api/account/password', 'DELETE /api/account'],
      analytics: ['GET /api/analytics'],
      finance: ['GET /api/finance', 'POST /api/finance/expense', 'DELETE /api/finance/expense/:id', 'GET /api/finance/export.csv'],
      developer: ['GET /api/dev', 'POST /api/dev/key', 'DELETE /api/dev/key/:id', 'POST /api/dev/webhook', 'DELETE /api/dev/webhook/:id', 'POST /api/dev/webhook/:id/test'],
      v1: ['GET /api/v1/products', 'GET /api/v1/orders', 'GET /api/v1/store'],
      public: ['GET /api/public/store/:slug', 'GET /api/public/store/:slug/catalog.csv', 'POST /api/public/store/:slug/order', 'POST /api/public/store/:slug/visit', 'POST /api/public/store/:slug/event'],
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/dev', developerRoutes);
app.use('/api/v1', publicCors, apiV1Routes);
app.use('/api/public', publicCors, publicRoutes);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Route API introuvable.' }));

app.get('/tableau-de-bord', (req, res, next) => {
  if (!req.user) return res.redirect('/connexion?suite=/tableau-de-bord');
  if (req.user.status === 'locked') return res.redirect('/paiement');
  next();
});

app.get('/paiement', (req, res, next) => {
  if (!req.user) return res.redirect('/connexion?suite=/paiement');
  next();
});

app.get('/boutique/:slug', (req, res) => {
  sendStorefront(req, res, req.params.slug);
});

// Service worker : servi à la racine (portée « / ») et jamais mis en cache
// longtemps, pour que les mises à jour soient prises en compte rapidement.
app.get('/sw.js', (_req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.set('Service-Worker-Allowed', '/');
  res.type('application/javascript');
  res.sendFile(path.join(PUBLIC_DIR, 'sw.js'));
});
app.get('/manifest.webmanifest', (_req, res) => {
  res.type('application/manifest+json');
  res.sendFile(path.join(PUBLIC_DIR, 'manifest.webmanifest'));
});

app.use(
  express.static(PUBLIC_DIR, {
    extensions: ['html'],
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
      else res.setHeader('Cache-Control', 'public, max-age=3600');
    },
  })
);

app.use((_req, res) => {
  res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'));
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('Erreur serveur :', err && err.message ? err.message : err);
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Requete trop volumineuse.' });
  }
  if (res.headersSent) return;
  res.status(500).json({ error: 'Erreur interne du serveur.' });
});

module.exports = app;
