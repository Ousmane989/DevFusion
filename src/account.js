'use strict';

const db = require('./db');

const PLANS = {
  decouverte: { id: 'decouverte', name: 'Decouverte', mru: 500, fcfa: 3000 },
  pro: { id: 'pro', name: 'Pro', mru: 1500, fcfa: 9000 },
  business: { id: 'business', name: 'Business', mru: 3500, fcfa: 21000 },
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
function refreshStatus(user) {
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
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(next, user.id);
    user.status = next;
  }
  return user;
}

function getUserById(id) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return refreshStatus(user);
}

function getUserByEmail(email) {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase());
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
  };
}

module.exports = { PLANS, TRIAL_DAYS, isoIn, refreshStatus, getUserById, getUserByEmail, publicUser };
