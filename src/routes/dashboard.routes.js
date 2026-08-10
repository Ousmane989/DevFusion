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
  // PRNG (Lehmer) -> flottant [0,1)
  const next = () => { s = (s * 48271) % 2147483647; return s / 2147483647; };
  const rand = (min, max) => min + next() * (max - min);
  const randi = (min, max) => Math.floor(rand(min, max + 1));

  const MONTHS = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();

  // --- Serie journaliere sur 60 jours (base pour 7j / 30j) ----------
  const base = rand(2200, 9000);          // CA journalier moyen (MRU)
  const growth = rand(0.002, 0.008);      // legere croissance quotidienne
  const daily = [];
  for (let i = 59; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const weekday = d.getDay();
    const weekend = weekday === 5 || weekday === 6 ? 1.28 : 1; // pics vendredi/samedi
    const noise = rand(0.6, 1.4);
    const drift = Math.pow(1 + growth, 60 - i);
    const revenue = Math.round(base * weekend * noise * drift);
    const orders = Math.max(1, Math.round(revenue / rand(1500, 3200)));
    const visitors = orders * randi(11, 24);
    daily.push({
      date: d.toISOString().slice(0, 10),
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      revenue,
      orders,
      visitors,
    });
  }

  // --- Serie mensuelle sur 12 mois ----------------------------------
  const monthly = [];
  let mBase = rand(60000, 140000);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    mBase = mBase * rand(1.02, 1.16);
    monthly.push({
      label: MONTHS[d.getMonth()],
      value: Math.round(mBase * rand(0.85, 1.12)),
    });
  }

  const sum = (arr, k) => arr.reduce((t, x) => t + (k ? x[k] : x), 0);
  const last = (arr, n) => arr.slice(arr.length - n);

  // --- Fenetres 7j et 30j + variation vs periode precedente ---------
  const win30 = last(daily, 30);
  const prev30 = daily.slice(0, 30);
  const win7 = last(daily, 7);
  const prev7 = daily.slice(daily.length - 14, daily.length - 7);

  const revenueMru = sum(win30, 'revenue');
  const revenuePrev = sum(prev30, 'revenue');
  const orders = sum(win30, 'orders');
  const ordersPrev = sum(prev30, 'orders');
  const visitors = sum(win30, 'visitors');
  const visitorsPrev = sum(prev30, 'visitors');
  const conversion = (orders / visitors) * 100;
  const conversionPrev = (ordersPrev / visitorsPrev) * 100;
  const basket = revenueMru / orders;
  const basketPrev = revenuePrev / ordersPrev;

  const delta = (cur, prev) => (prev ? Number((((cur - prev) / prev) * 100).toFixed(1)) : 0);
  const spark = (arr, k) => last(arr, 14).map((x) => x[k]);

  const kpis = {
    revenue: { value: revenueMru, fcfa: revenueMru * 6, delta: delta(revenueMru, revenuePrev), spark: spark(win30.length >= 14 ? win30 : daily, 'revenue') },
    orders: { value: orders, delta: delta(orders, ordersPrev), spark: spark(win30, 'orders') },
    visitors: { value: visitors, delta: delta(visitors, visitorsPrev), spark: spark(win30, 'visitors') },
    conversion: { value: Number(conversion.toFixed(1)), delta: delta(conversion, conversionPrev), spark: spark(win30, 'orders') },
    basket: { value: Math.round(basket), fcfa: Math.round(basket * 6), delta: delta(basket, basketPrev) },
  };

  // --- Series de CA pour le selecteur de periode --------------------
  const revenueTrend = {
    '7j': win7.map((x) => ({ label: x.label, value: x.revenue })),
    '30j': win30.map((x) => ({ label: x.label, value: x.revenue })),
    '12m': monthly,
  };

  // --- Ventes par categorie (rampe doree = magnitude) ---------------
  const catNames = ['Mode', 'Électronique', 'Alimentation', 'Cosmétique', 'Artisanat', 'Accessoires'];
  let cats = catNames.map((name) => ({ name, value: Math.round(rand(8000, revenueMru / 2)) }));
  const catTotal = sum(cats, 'value');
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
  const statuses = [
    { key: 'paid', label: 'Payée', tone: 'good' },
    { key: 'pending', label: 'En cours', tone: 'warning' },
    { key: 'refunded', label: 'Remboursée', tone: 'critical' },
  ];
  const recentOrders = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const st = i === 4 ? statuses[1] : i === 5 ? statuses[2] : statuses[randi(0, 0)] || statuses[0];
    recentOrders.push({
      ref: '#KRT-' + (10480 - i * 7),
      client: clients[randi(0, clients.length - 1)],
      product: productNames[randi(0, productNames.length - 1)],
      amount: Math.round(rand(1200, 14000)),
      status: st.label,
      tone: st.tone,
      date: `${d.getDate()}/${d.getMonth() + 1}`,
    });
  }

  const products = randi(14, 60);
  return {
    kpis,
    revenueTrend,
    categories: cats,
    topProducts,
    recentOrders,
    products,
    // conserve pour compatibilite eventuelle
    revenueMru,
    revenueFcfa: revenueMru * 6,
    orders,
    visitors,
    conversion: kpis.conversion.value,
  };
}

// GET /api/dashboard  — donnees agregees du tableau de bord
router.get('/', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user), stats: seededStats(req.user) });
});

module.exports = router;
