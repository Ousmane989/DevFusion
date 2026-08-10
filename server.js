'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const { loadUser } = require('./src/middleware');
const authRoutes = require('./src/routes/auth.routes');
const billingRoutes = require('./src/routes/billing.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const { hasSmtp } = require('./src/mailer');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');

app.disable('x-powered-by');
app.use(express.json());
app.use(cookieParser());
app.use(loadUser);

// ------------------------------------------------------------------
// API
// ------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ------------------------------------------------------------------
// Pages protegees (rendues cote client, mais l'acces est garde ici).
// Le tableau de bord exige une session ; un compte verrouille est
// redirige vers la page de paiement.
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

// Fichiers statiques (HTML, CSS, JS, images).
app.use(
  express.static(PUBLIC_DIR, {
    extensions: ['html'],
    setHeaders: (res) => res.setHeader('Cache-Control', 'public, max-age=3600'),
  })
);

// Repli : page 404 simple.
app.use((_req, res) => {
  res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'));
});

app.listen(PORT, () => {
  console.log(`\n  ✦ Karat en ligne : http://localhost:${PORT}`);
  if (!hasSmtp) {
    console.log('  ⚠  SMTP non configure — les codes de verification s\'affichent ici (mode dev).\n');
  } else {
    console.log('  ✉  SMTP configure — les codes sont envoyes par e-mail.\n');
  }
});
