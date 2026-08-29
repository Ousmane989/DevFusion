'use strict';

const express = require('express');
const db = require('../db');
const { getUserById, publicUser } = require('../account');
const { requireAuth } = require('../middleware');
const { priceFor, methodsFor, formatPrice, trialDaysLeft, whatsappUrl } = require('../subscription');
const { config } = require('../config');

const router = express.Router();

// ------------------------------------------------------------------
// GET /api/billing/status
// Renvoie l'état de l'abonnement, le prix selon le pays, les moyens de
// paiement et le lien WhatsApp d'activation manuelle.
// ------------------------------------------------------------------
router.get('/status', requireAuth, async (req, res) => {
  const u = await getUserById((req.account && req.account.id) || req.user.id);
  const country = u.country || 'MR';
  const price = priceFor(country);
  const waRow = await db.prepare("SELECT value FROM app_config WHERE key = 'admin_whatsapp'").get();
  const number = (waRow && waRow.value) || config.adminWhatsapp;
  res.json({
    status: u.status,
    trialDaysLeft: trialDaysLeft(u),
    subscriptionEndsAt: u.subscription_ends_at,
    price: { amount: price.amount, currency: price.currency, label: formatPrice(country) },
    methods: methodsFor(country),
    whatsapp: { number, url: whatsappUrl(u, null, number) },
    user: publicUser(u),
  });
});

module.exports = router;
