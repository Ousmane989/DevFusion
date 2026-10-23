'use strict';

// ------------------------------------------------------------------
// Abonnement Karat — essai gratuit de 3 jours, puis formule mensuelle.
// Le paiement se fait hors ligne (Wave / Orange Money / Bankily) : le
// commerçant paie, envoie la capture à l'administrateur sur WhatsApp, et
// l'administrateur active la formule depuis l'espace admin.
// ------------------------------------------------------------------
const { config } = require('./config');
const { PLANS } = require('./account');

// Devise et moyens de paiement selon le pays d'inscription.
const COUNTRY_BILLING = {
  SN: { currency: 'FCFA', key: 'fcfa', methods: ['wave', 'orange-money'] },
  MR: { currency: 'MRU', key: 'mru', methods: ['bankily'] },
};

// Libellés/visuels des moyens de paiement.
const METHODS = {
  wave: { id: 'wave', name: 'Wave', desc: 'Sénégal · paiement mobile', color: '#1dc4ff', text: '#003049' },
  'orange-money': { id: 'orange-money', name: 'Orange Money', desc: 'Sénégal · paiement mobile', color: '#ff7900', text: '#ffffff' },
  bankily: { id: 'bankily', name: 'Bankily', desc: 'Mauritanie · portefeuille mobile', color: '#e8f0ff', text: '#1a3a7a' },
};

const billingOf = (country) => COUNTRY_BILLING[country] || COUNTRY_BILLING.MR;
const planOf = (planId) => PLANS[planId] || PLANS.pro;

// Une formule est-elle proposée dans ce pays (prix défini, non masquée) ?
function offeredIn(country, planId) {
  const p = PLANS[planId];
  return Boolean(p && !p.hidden && p[billingOf(country).key] != null);
}
// Formule facturée dans ce pays : la formule demandée si elle y est
// proposée, sinon Pro (proposée partout).
const billedPlan = (country, planId) => (offeredIn(country, planId) ? planId : 'pro');

// Prix mensuel d'une formule pour un pays.
function priceFor(country, planId) {
  const b = billingOf(country);
  return { amount: PLANS[billedPlan(country, planId)][b.key], currency: b.currency };
}

function methodsFor(country) {
  return billingOf(country).methods.map((id) => METHODS[id]).filter(Boolean);
}

function formatPrice(country, planId) {
  const p = priceFor(country, planId);
  return p.amount.toLocaleString('fr-FR').replace(/ | /g, ' ') + ' ' + p.currency;
}

// Les formules proposées dans le pays, avec leur prix (site, inscription, paiement).
function plansFor(country) {
  return Object.values(PLANS).filter((p) => offeredIn(country, p.id)).map((p) => ({
    id: p.id, name: p.name, tagline: p.tagline, features: p.features, popular: Boolean(p.popular),
    maxProducts: p.maxProducts, maxShops: p.maxShops,
    price: { ...priceFor(country, p.id), label: formatPrice(country, p.id) },
  }));
}

// Nombre de jours d'essai restants (ou null si pas en essai).
function trialDaysLeft(user) {
  if (!user || user.status !== 'trial' || !user.trial_ends_at) return null;
  return Math.max(0, Math.ceil((new Date(user.trial_ends_at).getTime() - Date.now()) / 86_400_000));
}

// Lien WhatsApp pré-rempli vers l'administrateur pour activer l'abonnement.
// `number` permet de surcharger le numéro (réglage admin) ; sinon config.
function whatsappUrl(user, methodId, number, planId) {
  const plan = planOf(billedPlan(user.country, planId || user.plan));
  const m = METHODS[methodId];
  const lines = [
    'Bonjour, je souhaite activer mon abonnement Karat.',
    'Formule : ' + plan.name + ' — ' + formatPrice(user.country, plan.id) + ' / mois',
    'Boutique : ' + (user.shop_name || ''),
    'E-mail : ' + (user.email || ''),
  ];
  if (m) lines.push('Paiement : ' + m.name);
  return 'https://wa.me/' + (number || config.adminWhatsapp) + '?text=' + encodeURIComponent(lines.join('\n'));
}

// Lien de paiement Wave réglé sur le montant de la formule (si le lien
// configuré par l'admin porte un paramètre « amount »).
function waveLinkFor(link, country, planId) {
  if (!link) return '';
  try {
    const u = new URL(link);
    if (u.searchParams.has('amount')) u.searchParams.set('amount', String(priceFor(country, planId).amount));
    return u.toString();
  } catch (_) { return link; }
}

module.exports = { METHODS, offeredIn, billedPlan, priceFor, methodsFor, formatPrice, plansFor, trialDaysLeft, whatsappUrl, waveLinkFor };
