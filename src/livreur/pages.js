'use strict';

// Pages Karat Livreur (/livreur/…) : fichiers de public/livreur, avec
// redirection vers la connexion pour les espaces protégés.
const path = require('path');
const express = require('express');
const { ensureReady } = require('./store');
const { loadLv } = require('./auth');
const { HOME, LOGIN } = require('./routes');

const DIR = path.join(__dirname, '..', '..', 'public', 'livreur');
const PAGES = ['suivi', 'connexion', 'inscription', 'partenaire', 'coursier', 'agence'];
const PROTECTED = { partenaire: 'partenaire', coursier: 'coursier', agence: 'agence' };

const pages = express.Router();

pages.use(async (req, res, next) => {
  try { await ensureReady(); loadLv(req, res, next); } catch (e) { next(e); }
});

function send(res, name) {
  res.set('Cache-Control', 'no-cache');
  res.sendFile(path.join(DIR, name + '.html'));
}

pages.get('/', (_req, res) => send(res, 'index'));

// Connexion de l'espace agence (agents et livreurs), séparée de celle des partenaires.
pages.get(['/agence/connexion', '/agence-connexion'], (req, res) => {
  if (req.lv && req.lv.role !== 'partenaire' && !req.query.suite) return res.redirect(HOME[req.lv.role]);
  send(res, 'agence-connexion');
});

pages.get('/:page', (req, res, next) => {
  const page = req.params.page.replace(/\.html$/, '');
  if (!PAGES.includes(page)) return next();
  const role = PROTECTED[page];
  if (role && (!req.lv || req.lv.role !== role)) {
    return res.redirect(LOGIN[role] + '?suite=/livreur/' + page);
  }
  if (page === 'connexion' && req.lv && req.lv.role === 'partenaire' && !req.query.suite) return res.redirect(HOME.partenaire);
  send(res, page);
});

module.exports = pages;
