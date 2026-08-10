'use strict';

const express = require('express');
const { requireAuth } = require('../middleware');
const { publicUser } = require('../account');

const router = express.Router();

// Genere des statistiques de demonstration deterministes par boutique,
// afin que le tableau de bord affiche des chiffres coherents et stables.
function seededStats(user) {
  let seed = 0;
  const key = `${user.id}:${user.shop_name}`;
  for (const ch of key) seed = (seed * 31 + ch.charCodeAt(0)) % 100000;
  const rnd = (min, max) => {
    seed = (seed * 9301 + 49297) % 233280;
    return Math.floor(min + (seed / 233280) * (max - min));
  };

  const revenueMru = rnd(45000, 320000);
  const orders = rnd(38, 420);
  const visitors = orders * rnd(9, 22);
  const products = rnd(6, 48);
  const conversion = ((orders / visitors) * 100).toFixed(1);

  const months = ['Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil'];
  const trend = months.map((m) => ({ label: m, value: rnd(15000, revenueMru) }));

  const productNames = [
    'Boubou brode',
    'Sac artisanal',
    'The Touba premium',
    'Montre doree',
    'Foulard soie',
    'Sandales cuir',
  ];
  const topProducts = productNames.slice(0, 5).map((name) => ({
    name,
    sales: rnd(4, 60),
    revenue: rnd(8000, 90000),
  }));

  return {
    revenueMru,
    revenueFcfa: revenueMru * 6, // ~ parite indicative MRU -> FCFA
    orders,
    visitors,
    products,
    conversion,
    trend,
    topProducts,
  };
}

// GET /api/dashboard  — donnees agregees du tableau de bord
router.get('/', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user), stats: seededStats(req.user) });
});

module.exports = router;
