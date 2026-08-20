'use strict';

const express = require('express');
const db = require('../db');
const { PLANS, isoIn, getUserById, publicUser } = require('../account');
const { requireAuth } = require('../middleware');

const router = express.Router();

const METHODS = ['bankily', 'wave', 'orange-money'];

// ------------------------------------------------------------------
// POST /api/billing/pay  { method, plan? }
// Simule un paiement mobile local (Bankily / Wave / Orange Money).
// En production, cet endpoint declencherait le prestataire de paiement
// puis confirmerait via webhook. Ici, on active directement l'abonnement.
// ------------------------------------------------------------------
router.post('/pay', requireAuth, async (req, res) => {
  const method = String(req.body?.method || '').toLowerCase();
  if (!METHODS.includes(method)) {
    return res.status(400).json({ error: 'Moyen de paiement non pris en charge.' });
  }

  // Permet de changer de formule au moment du paiement.
  const plan = req.body?.plan && PLANS[req.body.plan] ? req.body.plan : req.user.plan;
  const subEnd = isoIn(30);

  await db.prepare(
    `UPDATE users SET plan = ?, status = 'active', subscription_ends_at = ? WHERE id = ?`
  ).run(plan, subEnd, req.user.id);

  res.json({
    ok: true,
    message: 'Paiement confirme. Votre abonnement est actif pour 30 jours.',
    user: publicUser(await getUserById(req.user.id)),
  });
});

// ------------------------------------------------------------------
// GET /api/billing/status
// ------------------------------------------------------------------
router.get('/status', requireAuth, (req, res) => {
  const u = req.user;
  let daysLeft = null;
  if (u.status === 'trial' && u.trial_ends_at) {
    daysLeft = Math.max(0, Math.ceil((new Date(u.trial_ends_at).getTime() - Date.now()) / 86_400_000));
  }
  res.json({ status: u.status, trialDaysLeft: daysLeft, user: publicUser(u) });
});

module.exports = router;
