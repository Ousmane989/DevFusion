'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware');
const { publicUser } = require('../account');

const router = express.Router();

const SRC_LABELS = { direct: 'Direct', social: 'Réseaux sociaux', search: 'Recherche', whatsapp: 'WhatsApp', referral: 'Référence', facebook: 'Facebook', instagram: 'Instagram', ads: 'Publicités' };
const MONTHS = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];

const parseDate = (s) => new Date(String(s).replace(' ', 'T') + 'Z');
const dayKey = (d) => d.toISOString().slice(0, 10);
const monthKey = (d) => d.toISOString().slice(0, 7);
const delta = (cur, prev) => (prev ? Number((((cur - prev) / prev) * 100).toFixed(1)) : (cur > 0 ? 100 : 0));

// ------------------------------------------------------------------
// Statistiques REELLES, calculees a partir des commandes et des
// evenements de la vitrine. Tout est a 0 pour une nouvelle boutique.
// Le chiffre d'affaires ne compte que les commandes LIVREES.
// ------------------------------------------------------------------
async function realStats(user) {
  const now = new Date();
  const orders = (await db
    .prepare('SELECT total_mru, status, created_at FROM orders WHERE user_id = ?')
    .all(user.id))
    .map((o) => ({ total: o.total_mru, status: o.status, d: parseDate(o.created_at) }));
  const events = (await db
    .prepare('SELECT type, source, created_at FROM store_events WHERE user_id = ?')
    .all(user.id))
    .map((e) => ({ type: e.type, source: e.source, d: parseDate(e.created_at) }));

  const visits = events.filter((e) => e.type === 'visit');
  const addCarts = events.filter((e) => e.type === 'add_cart');
  const isDelivered = (o) => o.status === 'livree';

  // ---- Buckets journaliers (60 j) et mensuels (12 mois) ----
  function dailyBuckets(n) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now); d.setUTCDate(now.getUTCDate() - i);
      out.push({ key: dayKey(d), label: `${d.getUTCDate()}/${d.getUTCMonth() + 1}` });
    }
    return out;
  }
  function monthlyBuckets(n) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      out.push({ key: monthKey(d), label: MONTHS[d.getUTCMonth()] });
    }
    return out;
  }
  const revByDay = {};
  orders.filter(isDelivered).forEach((o) => { const k = dayKey(o.d); revByDay[k] = (revByDay[k] || 0) + o.total; });
  const revByMonth = {};
  orders.filter(isDelivered).forEach((o) => { const k = monthKey(o.d); revByMonth[k] = (revByMonth[k] || 0) + o.total; });
  const ordByDay = {}; orders.forEach((o) => { const k = dayKey(o.d); ordByDay[k] = (ordByDay[k] || 0) + 1; });
  const visByDay = {}; visits.forEach((v) => { const k = dayKey(v.d); visByDay[k] = (visByDay[k] || 0) + 1; });

  // ---- KPIs sur une fenetre glissante (jours) ----
  function windowKpis(days, sparkArr) {
    const startCur = now.getTime() - days * 86400000;
    const startPrev = now.getTime() - 2 * days * 86400000;
    const inCur = (x) => x.d.getTime() >= startCur;
    const inPrev = (x) => x.d.getTime() >= startPrev && x.d.getTime() < startCur;

    const oCur = orders.filter(inCur), oPrev = orders.filter(inPrev);
    const revCur = oCur.filter(isDelivered).reduce((s, o) => s + o.total, 0);
    const revPrev = oPrev.filter(isDelivered).reduce((s, o) => s + o.total, 0);
    const cmdCur = oCur.length, cmdPrev = oPrev.length;
    const delCur = oCur.filter(isDelivered).length, delPrev = oPrev.filter(isDelivered).length;
    const visCur = visits.filter(inCur).length, visPrev = visits.filter(inPrev).length;
    const conv = visCur ? (cmdCur / visCur) * 100 : 0, convPrev = visPrev ? (cmdPrev / visPrev) * 100 : 0;
    const basket = delCur ? revCur / delCur : 0, basketPrev = delPrev ? revPrev / delPrev : 0;
    return {
      revenue: { value: revCur, fcfa: revCur * 6, delta: delta(revCur, revPrev), spark: sparkArr.rev },
      orders: { value: cmdCur, delta: delta(cmdCur, cmdPrev), spark: sparkArr.ord },
      visitors: { value: visCur, delta: delta(visCur, visPrev), spark: sparkArr.vis },
      conversion: { value: Number(conv.toFixed(1)), delta: delta(conv, convPrev), spark: sparkArr.ord },
      basket: { value: Math.round(basket), fcfa: Math.round(basket * 6), delta: delta(basket, basketPrev) },
    };
  }

  // ---- KPIs entre deux prédicats (aujourd'hui vs hier, etc.) ----
  function kpisBetween(inCur, inPrev, sparkArr) {
    const oCur = orders.filter(inCur), oPrev = orders.filter(inPrev);
    const revCur = oCur.filter(isDelivered).reduce((s, o) => s + o.total, 0);
    const revPrev = oPrev.filter(isDelivered).reduce((s, o) => s + o.total, 0);
    const cmdCur = oCur.length, cmdPrev = oPrev.length;
    const delCur = oCur.filter(isDelivered).length, delPrev = oPrev.filter(isDelivered).length;
    const visCur = visits.filter(inCur).length, visPrev = visits.filter(inPrev).length;
    const conv = visCur ? (cmdCur / visCur) * 100 : 0, convPrev = visPrev ? (cmdPrev / visPrev) * 100 : 0;
    const basket = delCur ? revCur / delCur : 0, basketPrev = delPrev ? revPrev / delPrev : 0;
    return {
      revenue: { value: revCur, delta: delta(revCur, revPrev), spark: sparkArr.rev },
      orders: { value: cmdCur, delta: delta(cmdCur, cmdPrev), spark: sparkArr.ord },
      visitors: { value: visCur, delta: delta(visCur, visPrev), spark: sparkArr.vis },
      conversion: { value: Number(conv.toFixed(1)), delta: delta(conv, convPrev), spark: sparkArr.ord },
      basket: { value: Math.round(basket), delta: delta(basket, basketPrev) },
    };
  }

  // ---- Aujourd'hui : buckets horaires + KPIs (jour calendaire vs hier) ----
  const todayStr = dayKey(now);
  const yStr = dayKey(new Date(now.getTime() - 86400000));
  const inToday = (x) => dayKey(x.d) === todayStr;
  const inYesterday = (x) => dayKey(x.d) === yStr;
  const hourly = [];
  for (let h = 0; h <= now.getUTCHours(); h++) hourly.push({ h, label: String(h).padStart(2, '0') + 'h' });
  const revByHour = {}, ordByHour = {}, visByHour = {};
  orders.filter((o) => inToday(o) && isDelivered(o)).forEach((o) => { const h = o.d.getUTCHours(); revByHour[h] = (revByHour[h] || 0) + o.total; });
  orders.filter(inToday).forEach((o) => { const h = o.d.getUTCHours(); ordByHour[h] = (ordByHour[h] || 0) + 1; });
  visits.filter(inToday).forEach((v) => { const h = v.d.getUTCHours(); visByHour[h] = (visByHour[h] || 0) + 1; });
  const sparksToday = {
    rev: hourly.map((b) => revByHour[b.h] || 0),
    ord: hourly.map((b) => ordByHour[b.h] || 0),
    vis: hourly.map((b) => visByHour[b.h] || 0),
  };

  const d7 = dailyBuckets(7), d30 = dailyBuckets(30), m12 = monthlyBuckets(12);
  const spark14 = dailyBuckets(14);
  const sparksDaily = {
    rev: spark14.map((b) => revByDay[b.key] || 0),
    ord: spark14.map((b) => ordByDay[b.key] || 0),
    vis: spark14.map((b) => visByDay[b.key] || 0),
  };
  const sparks7 = { rev: d7.map((b) => revByDay[b.key] || 0), ord: d7.map((b) => ordByDay[b.key] || 0), vis: d7.map((b) => visByDay[b.key] || 0) };
  const sparks12 = { rev: m12.map((b) => revByMonth[b.key] || 0), ord: m12.map((b) => revByMonth[b.key] || 0), vis: m12.map((b) => revByMonth[b.key] || 0) };

  const periods = {
    'today': { rangeLabel: 'aujourd\'hui', subLabel: "Aujourd'hui", today: true, kpis: kpisBetween(inToday, inYesterday, sparksToday), series: hourly.map((b) => ({ label: b.label, value: revByHour[b.h] || 0 })) },
    '7j': { rangeLabel: '7 derniers jours', subLabel: 'Sur 7 jours', kpis: windowKpis(7, sparks7), series: d7.map((b) => ({ label: b.label, value: revByDay[b.key] || 0 })) },
    '30j': { rangeLabel: '30 derniers jours', subLabel: 'Sur 30 jours', kpis: windowKpis(30, sparksDaily), series: d30.map((b) => ({ label: b.label, value: revByDay[b.key] || 0 })) },
    '12m': { rangeLabel: '12 derniers mois', subLabel: 'Sur 12 mois', kpis: windowKpis(365, sparks12), series: m12.map((b) => ({ label: b.label, value: revByMonth[b.key] || 0 })) },
  };

  // ---- Tunnel de conversion reel (30 derniers jours) ----
  const start30 = now.getTime() - 30 * 86400000;
  const in30 = (x) => x.d.getTime() >= start30;
  const funnel = [
    { stage: 'Visiteurs', value: visits.filter(in30).length },
    { stage: 'Ajouts au panier', value: addCarts.filter(in30).length },
    { stage: 'Commandes', value: orders.filter(in30).length },
    { stage: 'Livrées', value: orders.filter((o) => in30(o) && isDelivered(o)).length },
  ];

  // ---- Sources de trafic reelles (30 derniers jours) ----
  const srcCount = {};
  visits.filter(in30).forEach((v) => { const s = v.source || 'direct'; srcCount[s] = (srcCount[s] || 0) + 1; });
  const srcTotal = Object.values(srcCount).reduce((a, b) => a + b, 0);
  const sources = Object.entries(srcCount)
    .map(([k, v]) => ({ name: SRC_LABELS[k] || k, value: v, share: srcTotal ? Number(((v / srcTotal) * 100).toFixed(1)) : 0 }))
    .sort((a, b) => b.value - a.value);

  // ---- Commandes d'aujourd'hui ----
  const todayKey = dayKey(now);
  const todayOrders = orders.filter((o) => dayKey(o.d) === todayKey);
  const today = {
    orders: todayOrders.length,
    // Ventes du jour = valeur de toutes les commandes reçues aujourd'hui
    // (hors annulées). C'est le chiffre que le commerçant veut voir en premier.
    sales: todayOrders.filter((o) => o.status !== 'annulee').reduce((s, o) => s + o.total, 0),
    revenue: todayOrders.filter(isDelivered).reduce((s, o) => s + o.total, 0),
    pending: todayOrders.filter((o) => !isDelivered(o) && o.status !== 'annulee').length,
  };

  const prodRow = await db.prepare('SELECT COUNT(*) AS c FROM products WHERE user_id = ?').get(user.id);
  const products = Number(prodRow && prodRow.c) || 0;
  const pending = orders.filter((o) => ['nouvelle', 'confirmee', 'expediee'].includes(o.status)).length;

  return { periods, defaultPeriod: '30j', funnel, sources, today, products, pending };
}

// GET /api/dashboard
router.get('/', requireAuth, async (req, res) => {
  res.json({ user: publicUser(req.user), stats: await realStats(req.user) });
});

module.exports = router;
