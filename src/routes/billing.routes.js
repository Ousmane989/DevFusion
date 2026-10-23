'use strict';

const express = require('express');
const db = require('../db');
const { PLANS, getUserById, publicUser } = require('../account');
const { requireAuth } = require('../middleware');
const { offeredIn, billedPlan, priceFor, methodsFor, formatPrice, plansFor, trialDaysLeft, whatsappUrl, waveLinkFor } = require('../subscription');
const { config } = require('../config');

const router = express.Router();

async function adminNumber() {
  const row = await db.prepare("SELECT value FROM app_config WHERE key = 'admin_whatsapp'").get();
  return (row && row.value) || config.adminWhatsapp;
}

// ------------------------------------------------------------------
// GET /api/billing/plans?country=MR|SN — formules publiques (site vitrine).
// ------------------------------------------------------------------
router.get('/plans', (req, res) => {
  const country = req.query.country === 'SN' ? 'SN' : 'MR';
  res.json({ country, trialDays: config.trialDays, plans: plansFor(country) });
});

// ------------------------------------------------------------------
// GET /api/billing/status
// État de l'abonnement, formules et prix du pays, moyens de paiement, lien
// WhatsApp d'activation (avec la formule choisie) et lien Wave au bon montant.
// ------------------------------------------------------------------
router.get('/status', requireAuth, async (req, res) => {
  const u = await getUserById((req.account && req.account.id) || req.user.id);
  const country = u.country || 'MR';
  const planId = billedPlan(country, u.plan);
  const price = priceFor(country, planId);
  const number = await adminNumber();
  const waveRow = await db.prepare("SELECT value FROM app_config WHERE key = 'wave_link'").get();
  res.json({
    status: u.status,
    trialDaysLeft: trialDaysLeft(u),
    trialEndsAt: u.trial_ends_at,
    subscriptionEndsAt: u.subscription_ends_at,
    plan: planId,
    plans: plansFor(country),
    price: { amount: price.amount, currency: price.currency, label: formatPrice(country, planId) },
    methods: methodsFor(country),
    waveLink: waveLinkFor((waveRow && waveRow.value) || '', country, planId),
    whatsapp: { number, url: whatsappUrl(u, null, number, planId) },
    user: publicUser(u),
  });
});

// ------------------------------------------------------------------
// POST /api/billing/plan { plan } — pendant l'essai (ou une fois l'essai
// terminé) le commerçant choisit sa formule avant de payer. Aucun effet sur
// l'accès : seul l'administrateur active l'abonnement après le paiement.
// ------------------------------------------------------------------
router.post('/plan', requireAuth, async (req, res) => {
  const plan = String((req.body && req.body.plan) || '');
  const acct = req.account || req.user;
  if (!offeredIn(acct.country || 'MR', plan)) return res.status(400).json({ error: "Cette formule n'est pas proposée dans votre pays." });
  // Abonnement payé en cours : la formule (donc les limites) ne change qu'à
  // la réception du paiement, par l'administrateur.
  if (acct.status === 'active' && plan !== acct.plan) {
    return res.status(409).json({ error: 'Pour changer de formule, contactez-nous sur WhatsApp : elle sera activée à réception du paiement.' });
  }
  await db.prepare('UPDATE users SET plan = ? WHERE id = ?').run(plan, acct.id);
  res.json({ ok: true, plan });
});

module.exports = router;
