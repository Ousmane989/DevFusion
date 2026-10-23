'use strict';

const db = require('./db');

// Formules mensuelles — SOURCE UNIQUE des prix, limites et avantages (site
// vitrine, inscription, page de paiement, espace admin). maxProducts /
// maxShops : null = illimité.
// Prix par pays : `null` = formule non proposée dans ce pays.
// Mauritanie : une seule formule (Pro, 350 MRU). Sénégal : Découverte 5 000 F
// et Pro 10 000 F. Business n'est plus proposée ; elle reste définie pour les
// comptes qui l'avaient déjà (facturés au prix Pro).
const PLANS = {
  decouverte: {
    id: 'decouverte', name: 'Découverte', mru: null, fcfa: 5000, maxProducts: 30, maxShops: 1, api: false,
    tagline: 'Pour lancer votre première boutique',
    features: ['1 boutique en ligne', "Jusqu'à 30 produits", 'Commandes & paiement à la livraison', 'Tableau de bord des ventes'],
  },
  pro: {
    id: 'pro', name: 'Pro', mru: 350, fcfa: 10000, maxProducts: 300, maxShops: 3, api: true, popular: true,
    tagline: 'Pour les commerçants qui vendent chaque jour',
    features: ["Jusqu'à 3 boutiques", "Jusqu'à 300 produits", 'Livraison avec Karat Logistique', 'Marketing : Pixel Meta, catalogue Facebook', 'Finances & statistiques avancées', 'API & webhooks'],
  },
  business: {
    id: 'business', name: 'Business', mru: null, fcfa: null, maxProducts: null, maxShops: 10, api: true, hidden: true,
    tagline: 'Pour les marques et les grands catalogues',
    features: ["Jusqu'à 10 boutiques", 'Produits illimités', 'Tout le contenu Pro', 'API & webhooks', 'Support prioritaire WhatsApp'],
  },
};

const TRIAL_DAYS = Number(process.env.TRIAL_DAYS || 3);

function isoIn(days) {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

/**
 * Recalcule le statut d'un utilisateur en fonction des dates.
 * Un compte en essai dont la date est depassee passe en "locked".
 * Un abonnement expire repasse aussi en "locked".
 * Renvoie l'utilisateur (potentiellement mis a jour).
 */
async function refreshStatus(user) {
  if (!user) return user;
  const now = Date.now();
  let next = user.status;

  if (user.status === 'trial' && user.trial_ends_at && new Date(user.trial_ends_at).getTime() < now) {
    next = 'locked';
  }
  if (
    user.status === 'active' &&
    user.subscription_ends_at &&
    new Date(user.subscription_ends_at).getTime() < now
  ) {
    next = 'locked';
  }

  if (next !== user.status) {
    await db.prepare('UPDATE users SET status = ? WHERE id = ?').run(next, user.id);
    user.status = next;
  }
  return user;
}

async function getUserById(id) {
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return refreshStatus(user);
}

async function getUserByEmail(email) {
  const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase());
  return refreshStatus(user);
}

/** Vue publique d'un utilisateur, sans donnees sensibles. */
function publicUser(user) {
  if (!user) return null;
  const plan = PLANS[user.plan] || PLANS.pro;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    shopName: user.shop_name,
    plan: plan.id,
    planName: plan.name,
    planMru: plan.mru,
    planFcfa: plan.fcfa,
    status: user.status,
    emailVerified: Boolean(user.email_verified),
    trialEndsAt: user.trial_ends_at,
    subscriptionEndsAt: user.subscription_ends_at,
    createdAt: user.created_at,
    country: user.country || 'MR',
    currency: user.currency || 'MRU',
  };
}

module.exports = { PLANS, TRIAL_DAYS, isoIn, refreshStatus, getUserById, getUserByEmail, publicUser };
