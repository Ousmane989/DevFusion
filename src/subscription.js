'use strict';

// ------------------------------------------------------------------
// Abonnement Karat — essai gratuit + activation manuelle.
// Le paiement se fait hors ligne (Wave / Orange Money / Bankily) : le
// commerçant contacte l'administrateur sur WhatsApp, qui réactive le
// compte manuellement depuis l'espace admin.
// ------------------------------------------------------------------
const { config } = require('./config');

// Prix mensuel affiché selon le pays d'inscription.
const PRICING = {
  SN: { amount: 5000, currency: 'FCFA', methods: ['wave', 'orange-money'] },
  MR: { amount: 1000, currency: 'MRU', methods: ['bankily'] },
};

// Libellés/visuels des moyens de paiement.
const METHODS = {
  wave: { id: 'wave', name: 'Wave', desc: 'Sénégal · paiement mobile', color: '#1dc4ff', text: '#003049' },
  'orange-money': { id: 'orange-money', name: 'Orange Money', desc: 'Sénégal · paiement mobile', color: '#ff7900', text: '#ffffff' },
  bankily: { id: 'bankily', name: 'Bankily', desc: 'Mauritanie · portefeuille mobile', color: '#e8f0ff', text: '#1a3a7a' },
};

function priceFor(country) {
  return PRICING[country] || PRICING.MR;
}

function methodsFor(country) {
  return priceFor(country).methods.map((id) => METHODS[id]).filter(Boolean);
}

function formatPrice(country) {
  const p = priceFor(country);
  return p.amount.toLocaleString('fr-FR') + ' ' + p.currency;
}

// Nombre de jours d'essai restants (ou null si pas en essai).
function trialDaysLeft(user) {
  if (!user || user.status !== 'trial' || !user.trial_ends_at) return null;
  return Math.max(0, Math.ceil((new Date(user.trial_ends_at).getTime() - Date.now()) / 86_400_000));
}

// Lien WhatsApp pré-rempli vers l'administrateur pour activer l'abonnement.
function whatsappUrl(user, methodId) {
  const price = formatPrice(user.country);
  const m = METHODS[methodId];
  const lines = [
    'Bonjour, je souhaite activer mon abonnement Karat (' + price + ' / mois).',
    'Boutique : ' + (user.shop_name || ''),
    'E-mail : ' + (user.email || ''),
  ];
  if (m) lines.push('Paiement : ' + m.name);
  return 'https://wa.me/' + config.adminWhatsapp + '?text=' + encodeURIComponent(lines.join('\n'));
}

module.exports = { PRICING, METHODS, priceFor, methodsFor, formatPrice, trialDaysLeft, whatsappUrl };
