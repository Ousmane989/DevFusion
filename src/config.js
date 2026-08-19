'use strict';

// ------------------------------------------------------------------
// Configuration centralisee de l'API + validation au demarrage.
// ------------------------------------------------------------------
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const isProd = process.env.NODE_ENV === 'production';

const DEFAULT_SECRETS = ['', 'karat-dev-secret-change-me', 'changez-moi-en-production-avec-une-longue-chaine-aleatoire'];

// Resout le secret JWT. Si aucun secret valide n'est fourni via l'environnement,
// on en genere un aleatoire et on le conserve dans data/.jwt-secret afin que le
// service demarre sans configuration tout en restant sur (secret prive, non par
// defaut). Avec un disque persistant, le secret survit aux redemarrages.
function resolveJwtSecret() {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && !DEFAULT_SECRETS.includes(fromEnv)) return { secret: fromEnv, generated: false };
  try {
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const file = path.join(dataDir, '.jwt-secret');
    if (fs.existsSync(file)) {
      const s = fs.readFileSync(file, 'utf8').trim();
      if (s) return { secret: s, generated: true };
    }
    const s = crypto.randomBytes(48).toString('hex');
    fs.writeFileSync(file, s, { mode: 0o600 });
    return { secret: s, generated: true };
  } catch (_) {
    // Systeme de fichiers en lecture seule : secret ephemere en memoire.
    return { secret: crypto.randomBytes(48).toString('hex'), generated: true, ephemeral: true };
  }
}
const jwt = resolveJwtSecret();

const config = {
  env: process.env.NODE_ENV || 'development',
  isProd,
  port: Number(process.env.PORT || 3000),
  jwtSecret: jwt.secret,
  jwtGenerated: jwt.generated,
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
    // Ne devrait plus arriver (secret genere automatiquement), mais on garde
    // le garde-fou par securite.
    (isProd ? errors : warnings).push(
      'JWT_SECRET utilise une valeur par defaut. Definissez une longue chaine aleatoire.'
    );
  } else if (config.jwtGenerated && isProd) {
    warnings.push(
      'JWT_SECRET genere automatiquement. Pour des sessions stables, definissez la variable JWT_SECRET (ou montez un disque persistant).'
    );
  }
  if (isProd && !process.env.SMTP_HOST) {
    warnings.push('SMTP non configure en production : les e-mails ne seront pas envoyes.');
  }
  return { warnings, errors };
}

module.exports = { config, validate };
