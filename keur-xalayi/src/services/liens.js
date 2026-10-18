'use strict';

// Liens publics signés (ex. reçu PDF consultable par le parent depuis WhatsApp,
// sans compte). La signature HMAC empêche de deviner les reçus des autres.
const crypto = require('crypto');
const config = require('../config');

function signer(valeur) {
  return crypto.createHmac('sha256', config.jwtSecret).update(String(valeur)).digest('base64url').slice(0, 22);
}

function verifier(valeur, signature) {
  const attendu = Buffer.from(signer(valeur));
  const recu = Buffer.from(String(signature || ''));
  return attendu.length === recu.length && crypto.timingSafeEqual(attendu, recu);
}

/** URL de base publique : PUBLIC_URL ou hôte de la requête. */
function baseUrl(req) {
  return (process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

function lienRecu(req, numero) {
  return `${baseUrl(req)}/recu/${encodeURIComponent(numero)}?s=${signer('recu:' + numero)}`;
}

module.exports = { signer, verifier, baseUrl, lienRecu };
