'use strict';

// Configuration centralisée, lue depuis les variables d'environnement (.env).
require('dotenv').config();

const env = process.env;

const config = {
  port: Number(env.PORT || 3000),
  isProd: env.NODE_ENV === 'production',
  databaseUrl: env.DATABASE_URL || 'postgres://kx:kx@localhost:5432/keurxalayi',
  databaseSsl: env.DATABASE_SSL === 'true',
  jwtSecret: env.JWT_SECRET || 'dev-secret-a-changer',
  sessionHeures: 12,
  admin: {
    identifiant: env.ADMIN_IDENTIFIANT || 'directeur',
    motDePasse: env.ADMIN_MOT_DE_PASSE || 'KeurXalayi2026',
  },
  cronInterne: env.CRON_INTERNE !== 'false',
  cronSecret: env.CRON_SECRET || '',
  whatsapp: {
    mode: (env.WHATSAPP_MODE || 'manuel').toLowerCase(),
    meta: {
      token: env.META_WA_TOKEN || '',
      phoneNumberId: env.META_WA_PHONE_NUMBER_ID || '',
      version: env.META_WA_API_VERSION || 'v21.0',
      template: env.META_WA_TEMPLATE || '',
      templateLang: env.META_WA_TEMPLATE_LANG || 'fr',
    },
    twilio: {
      sid: env.TWILIO_ACCOUNT_SID || '',
      token: env.TWILIO_AUTH_TOKEN || '',
      from: env.TWILIO_WHATSAPP_FROM || '',
    },
  },
  dossierSauvegardes: env.DOSSIER_SAUVEGARDES || require('path').join(__dirname, '..', 'sauvegardes'),
};

if (config.isProd && config.jwtSecret === 'dev-secret-a-changer') {
  console.error('✖ JWT_SECRET doit être défini en production.');
  process.exit(1);
}

module.exports = config;
