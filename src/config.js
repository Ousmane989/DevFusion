'use strict';

// ------------------------------------------------------------------
// Configuration centralisee de l'API + validation au demarrage.
// ------------------------------------------------------------------
const isProd = process.env.NODE_ENV === 'production';

const DEFAULT_SECRETS = ['', 'karat-dev-secret-change-me', 'changez-moi-en-production-avec-une-longue-chaine-aleatoire'];

const config = {
  env: process.env.NODE_ENV || 'development',
  isProd,
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || 'karat-dev-secret-change-me',
  trialDays: Number(process.env.TRIAL_DAYS || 3),
  // Origine(s) autorisee(s) pour l'API publique (vitrine embarquee).
  // '*' par defaut (donnees publiques en lecture seule).
  corsOrigin: process.env.CORS_ORIGIN || '*',
  jsonLimit: process.env.JSON_LIMIT || '2mb', // marge pour les photos produits (data URL)
  trustProxy: process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) : (isProd ? 1 : 0),
  // Domaine de base des boutiques : <slug>.<baseDomain>. Necessite un DNS
  // wildcard (*.baseDomain) chez l'hebergeur pour que les sous-domaines marchent.
  baseDomain: process.env.BASE_DOMAIN || 'karat.shop',
  // URL publique absolue de l'application (ex. https://karat.shop). Sert a
  // construire les liens absolus (flux catalogue Meta, Open Graph). A defaut,
  // on utilise l'URL fournie par Render, sinon l'hote de la requete.
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/+$/, ''),
};

// Verifie la configuration ; renvoie la liste des avertissements/erreurs.
function validate() {
  const warnings = [];
  const errors = [];
  if (DEFAULT_SECRETS.includes(config.jwtSecret)) {
    (isProd ? errors : warnings).push(
      'JWT_SECRET utilise une valeur par defaut. Definissez une longue chaine aleatoire.'
    );
  }
  if (isProd && !process.env.SMTP_HOST) {
    warnings.push('SMTP non configure en production : les e-mails ne seront pas envoyes.');
  }
  return { warnings, errors };
}

module.exports = { config, validate };
