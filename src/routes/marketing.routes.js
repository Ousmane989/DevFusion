'use strict';

// Suivi publicitaire (façon « Ads Manager ») : comptes publicitaires,
// campagnes et saisie quotidienne des dépenses / résultats. Les indicateurs
// (dépense, ROAS, CPA, CPM, CTR, CPC) sont recalculés côté serveur.
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware');

const router = express.Router();

const PLATFORMS = ['meta', 'tiktok', 'google', 'autre'];

// Renvoie la date de début (YYYY-MM-DD) pour une période donnée.
function sinceFor(period) {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (period === 'today') return d.toISOString().slice(0, 10);
  if (period === '7j') { d.setUTCDate(d.getUTCDate() - 6); return d.toISOString().slice(0, 10); }
  if (period === '12m') { d.setUTCDate(d.getUTCDate() - 364); return d.toISOString().slice(0, 10); }
  if (period === 'year') return `${now.getUTCFullYear()}-01-01`;
  // 30j par défaut
  d.setUTCDate(d.getUTCDate() - 29);
  return d.toISOString().slice(0, 10);
}

const num = (v) => Number(v) || 0;
const clean = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

function aggregate(rows) {
  const a = { spend: 0, impressions: 0, clicks: 0, orders: 0, revenue: 0 };
  for (const r of rows) {
    a.spend += num(r.spend); a.impressions += num(r.impressions);
    a.clicks += num(r.clicks); a.orders += num(r.orders); a.revenue += num(r.revenue);
  }
  return a;
}
function kpisFrom(a) {
  return {
    spend: a.spend, impressions: a.impressions, clicks: a.clicks, orders: a.orders, revenue: a.revenue,
    roas: a.spend > 0 ? Number((a.revenue / a.spend).toFixed(2)) : null,
    cpa: a.orders > 0 ? Math.round(a.spend / a.orders) : null,
    cpm: a.impressions > 0 ? Math.round((a.spend / a.impressions) * 1000) : null,
    ctr: a.impressions > 0 ? Number(((a.clicks / a.impressions) * 100).toFixed(2)) : null,
    cpc: a.clicks > 0 ? Math.round(a.spend / a.clicks) : null,
  };
}

// GET /api/marketing?period=30j
router.get('/', requireAuth, async (req, res) => {
  const period = ['today', '7j', '30j', '12m', 'year'].includes(req.query.period) ? req.query.period : '30j';
  const since = sinceFor(period);
  const uid = req.user.id;

  const entries = await db.prepare(
    'SELECT campaign_id, spend, impressions, clicks, orders, revenue, day FROM ad_entries WHERE user_id = ? AND day >= ?'
  ).all(uid, since);
  const campaignsRaw = await db.prepare('SELECT id, name, platform, created_at FROM ad_campaigns WHERE user_id = ? ORDER BY id DESC').all(uid);
  const accounts = await db.prepare('SELECT id, name, platform, account_ref, currency, last_sync_at, created_at FROM ad_accounts WHERE user_id = ? ORDER BY id DESC').all(uid);
  const settings = await db.prepare('SELECT meta_pixel_id, meta_pixel_active FROM store_settings WHERE user_id = ?').get(uid);

  const byCamp = {};
  entries.forEach((e) => { (byCamp[e.campaign_id] = byCamp[e.campaign_id] || []).push(e); });

  const campaigns = campaignsRaw.map((c) => {
    const a = aggregate(byCamp[c.id] || []);
    const days = (byCamp[c.id] || []).map((e) => e.day).sort();
    return {
      id: c.id, name: c.name, platform: c.platform,
      spend: a.spend, revenue: a.revenue, orders: a.orders, impressions: a.impressions, clicks: a.clicks,
      roas: a.spend > 0 ? Number((a.revenue / a.spend).toFixed(2)) : null,
      days: days.length, lastDay: days.length ? days[days.length - 1] : null,
    };
  });

  res.json({
    period,
    currency: req.user.currency || 'MRU',
    kpis: Object.assign(kpisFrom(aggregate(entries)), { campaigns: campaignsRaw.length }),
    campaigns,
    accounts: accounts.map((x) => ({
      id: x.id, name: x.name, platform: x.platform, accountRef: x.account_ref,
      currency: x.currency, lastSyncAt: x.last_sync_at, createdAt: x.created_at,
    })),
    pixel: { id: (settings && settings.meta_pixel_id) || '', active: !!(settings && Number(settings.meta_pixel_active)) },
  });
});

// ---- Comptes publicitaires ----
router.post('/account', requireAuth, async (req, res) => {
  const b = req.body || {};
  const name = clean(b.name, 80);
  if (!name) return res.status(400).json({ error: 'Nom du compte requis.' });
  const platform = PLATFORMS.includes(b.platform) ? b.platform : 'meta';
  await db.prepare('INSERT INTO ad_accounts (user_id, name, platform, account_ref, currency) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.id, name, platform, clean(b.accountRef, 60), clean(b.currency, 8));
  res.status(201).json({ ok: true });
});
router.delete('/account/:id', requireAuth, async (req, res) => {
  await db.prepare('DELETE FROM ad_accounts WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});
// « Synchroniser » : sans API Meta, on horodate seulement la dernière synchro
// (les données proviennent de la saisie manuelle des campagnes).
router.post('/account/:id/sync', requireAuth, async (req, res) => {
  const info = await db.prepare("UPDATE ad_accounts SET last_sync_at = datetime('now') WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
  if (!info.changes) return res.status(404).json({ error: 'Compte introuvable.' });
  res.json({ ok: true });
});

// ---- Campagnes ----
router.post('/campaign', requireAuth, async (req, res) => {
  const name = clean(req.body && req.body.name, 100);
  if (!name) return res.status(400).json({ error: 'Nom de la campagne requis.' });
  const platform = PLATFORMS.includes(req.body && req.body.platform) ? req.body.platform : 'meta';
  await db.prepare('INSERT INTO ad_campaigns (user_id, name, platform) VALUES (?, ?, ?)').run(req.user.id, name, platform);
  res.status(201).json({ ok: true });
});
router.delete('/campaign/:id', requireAuth, async (req, res) => {
  await db.prepare('DELETE FROM ad_campaigns WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// ---- Saisie d'une journée pour une campagne (création ou mise à jour) ----
router.post('/entry', requireAuth, async (req, res) => {
  const b = req.body || {};
  const campaignId = Number(b.campaignId);
  const owns = await db.prepare('SELECT id FROM ad_campaigns WHERE id = ? AND user_id = ?').get(campaignId, req.user.id);
  if (!owns) return res.status(404).json({ error: 'Campagne introuvable.' });
  const day = /^\d{4}-\d{2}-\d{2}$/.test(String(b.day || '')) ? b.day : new Date().toISOString().slice(0, 10);
  const nz = (v) => Math.max(0, Math.round(num(v)));
  await db.prepare(
    `INSERT INTO ad_entries (user_id, campaign_id, day, spend, impressions, clicks, orders, revenue)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (campaign_id, day) DO UPDATE SET
       spend = excluded.spend, impressions = excluded.impressions, clicks = excluded.clicks,
       orders = excluded.orders, revenue = excluded.revenue`
  ).run(req.user.id, campaignId, day, nz(b.spend), nz(b.impressions), nz(b.clicks), nz(b.orders), nz(b.revenue));
  res.status(201).json({ ok: true });
});

module.exports = router;
