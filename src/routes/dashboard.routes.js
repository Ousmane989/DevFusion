'use strict';

const express = require('express');
const { requireAuth } = require('../middleware');
const { publicUser } = require('../account');

const router = express.Router();

// ------------------------------------------------------------------
// Generateur de statistiques de demonstration, deterministe par
// boutique : les memes chiffres s'affichent a chaque visite.
// En production, ces valeurs proviendraient des vraies ventes.
// ------------------------------------------------------------------
function seededStats(user) {
  let s = 0;
  const key = `${user.id}:${user.shop_name}`;
  for (const ch of key) s = (s * 31 + ch.charCodeAt(0)) % 2147483647;
  if (s <= 0) s = 123457;
  const next = () => { s = (s * 48271) % 2147483647; return s / 2147483647; };
  const rand = (min, max) => min + next() * (max - min);
  const randi = (min, max) => Math.floor(rand(min, max + 1));

  const MONTHS = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();

  const sum = (arr, k) => arr.reduce((t, x) => t + x[k], 0);
  const last = (arr, n) => arr.slice(arr.length - n);
  const delta = (cur, prev) => (prev ? Number((((cur - prev) / prev) * 100).toFixed(1)) : 0);

  // --- Serie journaliere sur 60 jours -------------------------------
  const base = rand(2200, 9000);
  const growth = rand(0.002, 0.008);
  const daily = [];
  for (let i = 59; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const weekend = d.getDay() === 5 || d.getDay() === 6 ? 1.28 : 1;
    const revenue = Math.round(base * weekend * rand(0.6, 1.4) * Math.pow(1 + growth, 60 - i));
    const orders = Math.max(1, Math.round(revenue / rand(1500, 3200)));
    const visitors = orders * randi(11, 24);
    daily.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, revenue, orders, visitors });
  }

  // --- Serie mensuelle sur 24 mois ----------------------------------
  const monthly = [];
  let mBase = rand(55000, 130000);
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    mBase = mBase * rand(1.008, 1.038);
    const revenue = Math.round(mBase * rand(0.85, 1.12));
    const orders = Math.max(1, Math.round(revenue / rand(1800, 2600)));
    const visitors = orders * randi(12, 22);
    monthly.push({ label: MONTHS[d.getMonth()], revenue, orders, visitors });
  }

  // --- KPIs a partir d'une fenetre + fenetre precedente -------------
  function kpisOf(win, prev, sparks) {
    const rev = sum(win, 'revenue'), revP = sum(prev, 'revenue');
    const ord = sum(win, 'orders'), ordP = sum(prev, 'orders');
    const vis = sum(win, 'visitors'), visP = sum(prev, 'visitors');
    const conv = vis ? (ord / vis) * 100 : 0, convP = visP ? (ordP / visP) * 100 : 0;
    const bask = ord ? rev / ord : 0, baskP = ordP ? revP / ordP : 0;
    return {
      revenue: { value: rev, fcfa: rev * 6, delta: delta(rev, revP), spark: sparks.rev },
      orders: { value: ord, delta: delta(ord, ordP), spark: sparks.ord },
      visitors: { value: vis, delta: delta(vis, visP), spark: sparks.vis },
      conversion: { value: Number(conv.toFixed(1)), delta: delta(conv, convP), spark: sparks.conv },
      basket: { value: Math.round(bask), fcfa: Math.round(bask * 6), delta: delta(bask, baskP) },
    };
  }
  const series = (arr) => arr.map((x) => ({ label: x.label, value: x.revenue }));

  // Fenetres 7 jours / 30 jours / 12 mois (chacune avec sa periode precedente)
  const w7 = last(daily, 7), p7 = daily.slice(daily.length - 14, daily.length - 7);
  const w30 = last(daily, 30), p30 = daily.slice(0, 30);
  const w12 = last(monthly, 12), p12 = monthly.slice(0, 12);

  const periods = {
    '7j': {
      rangeLabel: '7 derniers jours', subLabel: 'Sur 7 jours',
      kpis: kpisOf(w7, p7, { rev: w7.map((x) => x.revenue), ord: w7.map((x) => x.orders), vis: w7.map((x) => x.visitors), conv: w7.map((x) => x.orders) }),
      series: series(w7),
    },
    '30j': {
      rangeLabel: '30 derniers jours', subLabel: 'Sur 30 jours',
      kpis: kpisOf(w30, p30, { rev: last(w30, 14).map((x) => x.revenue), ord: last(w30, 14).map((x) => x.orders), vis: last(w30, 14).map((x) => x.visitors), conv: last(w30, 14).map((x) => x.orders) }),
      series: series(w30),
    },
    '12m': {
      rangeLabel: '12 derniers mois', subLabel: 'Sur 12 mois',
      kpis: kpisOf(w12, p12, { rev: w12.map((x) => x.revenue), ord: w12.map((x) => x.orders), vis: w12.map((x) => x.visitors), conv: w12.map((x) => x.orders) }),
      series: series(w12),
    },
  };

  // --- Tunnel de conversion (base sur 30 jours) ---------------------
  const vis30 = sum(w30, 'visitors');
  const ord30 = sum(w30, 'orders');
  const productViews = Math.round(vis30 * rand(0.58, 0.72));
  const addToCart = Math.round(vis30 * rand(0.19, 0.28));
  const funnel = [
    { stage: 'Visiteurs', value: vis30 },
    { stage: 'Vues produit', value: productViews },
    { stage: 'Ajouts au panier', value: addToCart },
    { stage: 'Commandes', value: ord30 },
  ];

  // --- Sources de trafic --------------------------------------------
  const srcNames = ['Direct', 'Réseaux sociaux', 'Recherche Google', 'WhatsApp', 'Référence'];
  let sources = srcNames.map((name) => ({ name, w: rand(0.5, 3) }));
  const wsum = sources.reduce((t, x) => t + x.w, 0);
  sources = sources
    .map((x) => ({ name: x.name, value: Math.round((x.w / wsum) * vis30), share: Number(((x.w / wsum) * 100).toFixed(1)) }))
    .sort((a, b) => b.value - a.value);

  // --- Ventes par categorie -----------------------------------------
  const revenue30 = sum(w30, 'revenue');
  const catNames = ['Mode', 'Électronique', 'Alimentation', 'Cosmétique', 'Artisanat', 'Accessoires'];
  let cats = catNames.map((name) => ({ name, value: Math.round(rand(8000, revenue30 / 2)) }));
  const catTotal = cats.reduce((t, c) => t + c.value, 0);
  cats = cats
    .map((c) => ({ ...c, share: Number(((c.value / catTotal) * 100).toFixed(1)) }))
    .sort((a, b) => b.value - a.value);

  // --- Meilleures ventes --------------------------------------------
  const productNames = ['Boubou brodé main', 'Sac en cuir artisanal', 'Casque sans fil', 'Montre dorée', 'Foulard en soie', 'Sandales cuir', 'Sérum éclat', 'Thé Touba premium'];
  const topProducts = productNames.slice(0, 5).map((name) => {
    const sales = randi(12, 90);
    return { name, sales, revenue: Math.round(sales * rand(900, 2600)) };
  }).sort((a, b) => b.revenue - a.revenue);

  // --- Commandes recentes -------------------------------------------
  const clients = ['Fatimetou M.', 'Ousmane D.', 'Aicha B.', 'Moussa S.', 'Mariam K.', 'Cheikh N.', 'Ramata L.', 'Ibrahima F.'];
  const st = [
    { label: 'Payée', tone: 'good' },
    { label: 'En cours', tone: 'warning' },
    { label: 'Remboursée', tone: 'critical' },
  ];
  const recentOrders = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    const status = i === 4 ? st[1] : i === 5 ? st[2] : st[0];
    recentOrders.push({
      ref: '#KRT-' + (10480 - i * 7),
      client: clients[randi(0, clients.length - 1)],
      product: productNames[randi(0, productNames.length - 1)],
      amount: Math.round(rand(1200, 14000)),
      status: status.label, tone: status.tone,
      date: `${d.getDate()}/${d.getMonth() + 1}`,
    });
  }

  return {
    periods,
    defaultPeriod: '30j',
    funnel,
    sources,
    categories: cats,
    topProducts,
    recentOrders,
    products: randi(14, 60),
  };
}

// GET /api/dashboard  — donnees agregees du tableau de bord
router.get('/', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user), stats: seededStats(req.user) });
});

module.exports = router;
