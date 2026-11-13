'use strict';

// ------------------------------------------------------------------
// Statistiques de l'espace administrateur : comptes, abonnements payants,
// revenus (MRR / ARR), entonnoir d'inscription et activité des boutiques,
// sur une période choisie et comparées à la période précédente.
//
// Les dates sont stockées en texte (SQLite et Postgres) : les calculs se
// font ici, en millisecondes UTC (Nouakchott et Dakar sont à GMT+0).
// ------------------------------------------------------------------
const db = require('./db');
const { isAdminUser } = require('./config');
const { priceFor, billedPlan } = require('./subscription');

const isPg = db._driver === 'postgres';
const ID = isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';

// Journal des paiements d'abonnement : une ligne à chaque activation par
// l'administrateur (nouvel abonné ou renouvellement).
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS sub_payments (
    id ${ID}, user_id INTEGER NOT NULL, plan TEXT NOT NULL DEFAULT 'pro',
    amount INTEGER NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'MRU',
    days INTEGER NOT NULL DEFAULT 30, kind TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL DEFAULT (${isPg ? 'karat_now()' : "datetime('now')"})
  );
  CREATE INDEX IF NOT EXISTS idx_subpay_date ON sub_payments(created_at)
`;
let ready = null;
function ensureReady() {
  if (!ready) {
    ready = (async () => {
      // En production les tables sont créées par migration : on tolère l'échec.
      for (const stmt of SCHEMA.split(';').map((s) => s.trim()).filter(Boolean)) {
        try { await db.exec(stmt); } catch (_) { /* déjà en place */ }
      }
    })().catch((e) => { ready = null; throw e; });
  }
  return ready;
}

const DAY = 86400000;
const pad = (n) => String(n).padStart(2, '0');
const sqlTime = (ms) => { const d = new Date(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`; };
// « 2026-08-29 00:55:23.566742+00 », « 2026-11-13 10:00:00 » ou ISO → ms UTC.
function toMs(v) {
  if (!v) return NaN;
  let s = String(v).trim().replace(' ', 'T');
  if (/[+-]\d\d$/.test(s)) s += ':00';
  else if (!/(Z|[+-]\d\d:\d\d)$/.test(s)) s += 'Z';
  return Date.parse(s);
}

// Enregistre un paiement à l'activation d'un abonnement (montant de la
// formule dans la devise du pays, au prorata des mois activés).
async function recordPayment(user, planId, days) {
  await ensureReady();
  const prev = await db.prepare('SELECT id FROM sub_payments WHERE user_id = ? LIMIT 1').get(user.id);
  const wasPaid = Boolean(prev) || (user.status === 'active' && user.subscription_ends_at);
  const plan = billedPlan(user.country || 'MR', planId);
  const price = priceFor(user.country || 'MR', plan);
  const months = Math.max(1, Math.round(days / 30));
  await db.prepare('INSERT INTO sub_payments (user_id, plan, amount, currency, days, kind, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(user.id, plan, price.amount * months, price.currency, days, wasPaid ? 'renewal' : 'new', sqlTime(Date.now()));
}

// ------------------------------------------------------------------
// Périodes
// ------------------------------------------------------------------
const PERIODS = {
  today: "Aujourd'hui", yesterday: 'Hier', week: 'Cette semaine', month: 'Ce mois-ci',
  '90d': '90 derniers jours', year: 'Cette année', all: 'Depuis toujours', custom: 'Période personnalisée',
};
function startOfDay(ms) { const d = new Date(ms); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); }
function parseDay(s) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN; }

function resolvePeriod(key, fromStr, toStr, now = Date.now()) {
  const k = PERIODS[key] ? key : 'month';
  const today = startOfDay(now);
  let from, to = now;
  if (k === 'today') from = today;
  else if (k === 'yesterday') { from = today - DAY; to = today; }
  else if (k === 'week') { const dow = (new Date(today).getUTCDay() + 6) % 7; from = today - dow * DAY; }
  else if (k === 'month') { const d = new Date(today); from = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1); }
  else if (k === '90d') from = today - 89 * DAY;
  else if (k === 'year') from = Date.UTC(new Date(today).getUTCFullYear(), 0, 1);
  else if (k === 'all') from = 0;
  else {
    const a = parseDay(fromStr), b = parseDay(toStr);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return resolvePeriod('month', null, null, now);
    from = a; to = Math.min(b + DAY, now);
  }
  // Période précédente de même durée (pas de comparaison pour « depuis toujours »).
  const prev = k === 'all' ? null : { from: from - (to - from), to: from };
  return { key: k, label: PERIODS[k], from, to, prev };
}

// ------------------------------------------------------------------
// Calcul
// ------------------------------------------------------------------
const inRange = (ms, r) => r && ms >= r.from && ms < r.to;
const pct = (cur, prev) => (prev ? Math.round(((cur - prev) / prev) * 1000) / 10 : null);
const addCur = (m, cur, n) => { m[cur] = (m[cur] || 0) + n; return m; };

async function computeStats(period) {
  await ensureReady();
  const now = Date.now();
  const [users, payments, prodRows, orderRows] = await Promise.all([
    db.prepare('SELECT id, owner_id, email, is_admin, status, plan, country, currency, email_verified, created_at, trial_ends_at, subscription_ends_at FROM users').all(),
    db.prepare('SELECT user_id, plan, amount, currency, kind, created_at FROM sub_payments').all(),
    db.prepare('SELECT user_id, created_at FROM products').all(),
    db.prepare('SELECT user_id, total_mru, status, created_at FROM orders').all(),
  ]);
  const evRange = (r) => db.prepare("SELECT COUNT(*) AS n FROM store_events WHERE type = 'visit' AND created_at >= ? AND created_at < ?").get(sqlTime(r.from), sqlTime(r.to)).then((x) => Number(x && x.n) || 0);

  // Comptes clients (hors administrateurs) ; boutiques filles rattachées au compte.
  const accounts = users.filter((u) => !u.owner_id && !isAdminUser(u));
  const ownerOf = new Map(users.map((u) => [Number(u.id), u.owner_id ? Number(u.owner_id) : Number(u.id)]));
  const shopCur = new Map(users.map((u) => [Number(u.id), u.currency === 'FCFA' ? 'FCFA' : 'MRU']));
  const hasProduct = new Set(prodRows.map((p) => ownerOf.get(Number(p.user_id))));
  const hasOrder = new Set(orderRows.map((o) => ownerOf.get(Number(o.user_id))));
  const paidEver = new Set(payments.map((p) => Number(p.user_id)));
  const isActivePaid = (u) => u.status === 'active' && (!u.subscription_ends_at || toMs(u.subscription_ends_at) > now);

  const P = period, R = P.prev;
  const created = (u) => toMs(u.created_at);
  const signups = (r) => accounts.filter((u) => inRange(created(u), r));
  const pays = (r, kind) => payments.filter((p) => inRange(toMs(p.created_at), r) && (!kind || p.kind === kind));
  const revenue = (r) => pays(r).reduce((m, p) => addCur(m, p.currency, Number(p.amount) || 0), {});
  const conv = (r) => { const s = signups(r).length; return s ? Math.round((pays(r, 'new').length / s) * 1000) / 10 : 0; };

  // MRR : prix mensuel actuel des abonnés payants en cours, par devise.
  const mrr = accounts.filter(isActivePaid).reduce((m, u) => {
    const p = priceFor(u.country || 'MR', billedPlan(u.country || 'MR', u.plan));
    return addCur(m, p.currency, p.amount);
  }, {});
  const arr = Object.fromEntries(Object.entries(mrr).map(([c, v]) => [c, v * 12]));

  const ordersIn = (r) => orderRows.filter((o) => inRange(toMs(o.created_at), r) && o.status !== 'annulee');
  const gmv = (r) => ordersIn(r).reduce((m, o) => addCur(m, shopCur.get(Number(o.user_id)) || 'MRU', Number(o.total_mru) || 0), {});
  const activeShops = (r) => new Set(ordersIn(r).map((o) => Number(o.user_id))).size;
  const newProducts = (r) => prodRows.filter((p) => inRange(toMs(p.created_at), r)).length;

  const cur = { signups: signups(P), newPaid: pays(P, 'new').length, renewals: pays(P, 'renewal').length, orders: ordersIn(P).length };
  const prv = R ? { signups: signups(R).length, newPaid: pays(R, 'new').length, renewals: pays(R, 'renewal').length, orders: ordersIn(R).length } : null;
  const [visits, visitsPrev, live] = await Promise.all([
    evRange(P), R ? evRange(R) : Promise.resolve(null),
    db.prepare("SELECT COUNT(*) AS n, COUNT(DISTINCT user_id) AS shops FROM store_events WHERE type = 'visit' AND created_at >= ?").get(sqlTime(now - 15 * 60000)),
  ]);

  const total = accounts.filter((u) => created(u) < P.to).length;
  const firstPay = payments.reduce((m, p) => Math.min(m, toMs(p.created_at)), Infinity);
  const todayOrders = orderRows.filter((o) => toMs(o.created_at) >= startOfDay(now)).length;
  const toActivate = accounts.filter((u) => u.status === 'locked'
    || (u.status === 'trial' && toMs(u.trial_ends_at) - now < DAY)
    || (u.status === 'active' && u.subscription_ends_at && toMs(u.subscription_ends_at) < now)).length;

  // Entonnoir : comptes inscrits sur la période, étape par étape.
  const cohort = cur.signups;
  const funnel = [
    ['Inscrits', cohort.length],
    ['E-mail vérifié', cohort.filter((u) => Number(u.email_verified) === 1).length],
    ['Premier produit ajouté', cohort.filter((u) => hasProduct.has(Number(u.id))).length],
    ['Première commande reçue', cohort.filter((u) => hasOrder.has(Number(u.id))).length],
    ['Abonné payant', cohort.filter((u) => paidEver.has(Number(u.id)) || isActivePaid(u)).length],
  ].map(([label, n]) => ({ label, n, pct: cohort.length ? Math.round((n / cohort.length) * 1000) / 10 : 0 }));

  return {
    period: { key: P.key, label: P.label, from: new Date(P.from).toISOString(), to: new Date(P.to).toISOString() },
    paymentsSince: Number.isFinite(firstPay) ? new Date(firstPay).toISOString() : null,
    live: { visitors: Number(live && live.n) || 0, shops: Number(live && live.shops) || 0, ordersToday: todayOrders, toActivate },
    karat: {
      usersTotal: total, newUsers: cur.signups.length, newUsersChange: R ? pct(cur.signups.length, prv.signups) : null,
      activePaid: accounts.filter(isActivePaid).length,
      newPaid: cur.newPaid, newPaidChange: R ? pct(cur.newPaid, prv.newPaid) : null,
      conversion: conv(P), conversionChange: R ? pct(conv(P), conv(R)) : null,
      renewals: cur.renewals, renewalsChange: R ? pct(cur.renewals, prv.renewals) : null,
      revenue: revenue(P), revenuePrev: R ? revenue(R) : null,
      mrr, arr,
    },
    funnel,
    shops: {
      orders: cur.orders, ordersChange: R ? pct(cur.orders, prv.orders) : null,
      gmv: gmv(P), gmvPrev: R ? gmv(R) : null,
      visits, visitsChange: R ? pct(visits, visitsPrev) : null,
      activeShops: activeShops(P), activeShopsChange: R ? pct(activeShops(P), activeShops(R)) : null,
      newProducts: newProducts(P), newProductsChange: R ? pct(newProducts(P), newProducts(R)) : null,
    },
  };
}

module.exports = { ensureReady, recordPayment, resolvePeriod, computeStats, PERIODS, toMs };
