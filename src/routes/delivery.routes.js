'use strict';

// ------------------------------------------------------------------
// API côté commerçant Karat : collaboration avec une agence de livraison.
// Le commerçant envoie une demande ; une fois acceptée par l'agence, ses
// commandes boutique sont transmises automatiquement à l'agence (temps réel).
// ------------------------------------------------------------------
const express = require('express');
const { requireAuth } = require('../middleware');
const S = require('../livreur/store');

const router = express.Router();
router.get('/__ping', (_req, res) => res.json({ v: 'diag3', hasFns: typeof S.listActiveAgencies === 'function' && typeof S.collabsForMerchant === 'function' && typeof S.createBoutiqueOrder === 'function' }));
router.use(requireAuth);
router.use(async (_req, res, next) => { try { await S.ensureReady(); next(); } catch (e) { res.status(500).json({ error: 'debug-mw', detail: String((e && (e.stack || e.message)) || e).slice(0, 600) }); } });

const merchantId = (req) => (req.account && req.account.id) || req.user.id;

// GET /api/delivery/agencies — agences disponibles + état de ma collaboration.
router.get('/agencies', async (req, res, next) => {
  try {
    const id = merchantId(req);
    const agencies = await S.listActiveAgencies();
    const collabs = await S.collabsForMerchant(id);
    const byAgency = {};
    collabs.forEach((c) => { byAgency[c.agency_id] = c.status; });
    res.json({
      ok: true,
      agencies: agencies.map((a) => ({
        id: a.id,
        name: a.business_name || a.name,
        city: a.city || '',
        status: byAgency[a.id] || null, // pending | accepted | rejected | null
      })),
    });
  } catch (err) { res.status(500).json({ error: 'debug', detail: String((err && (err.stack || err.message)) || err).slice(0, 600) }); }
});

// POST /api/delivery/request { agencyId } — demander une collaboration.
router.post('/request', async (req, res, next) => {
  try {
    const id = merchantId(req);
    const agencyId = Math.round(Number(req.body && req.body.agencyId));
    if (!agencyId) return res.status(400).json({ error: 'Agence invalide.' });
    const ag = await S.db.prepare("SELECT id FROM lv_users WHERE id = ? AND role = 'agence' AND status = 'active'").get(agencyId);
    if (!ag) return res.status(404).json({ error: 'Agence introuvable.' });
    const u = req.account || req.user;
    const existing = await S.db.prepare('SELECT * FROM lv_collabs WHERE merchant_id = ? AND agency_id = ?').get(id, agencyId);
    if (existing) {
      if (existing.status === 'rejected') {
        await S.db.prepare("UPDATE lv_collabs SET status = 'pending', created_at = ?, responded_at = '' WHERE id = ?").run(S.now(), existing.id);
        return res.json({ ok: true, status: 'pending' });
      }
      return res.json({ ok: true, status: existing.status });
    }
    await S.db.prepare('INSERT INTO lv_collabs (merchant_id, agency_id, shop_name, phone, city, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, agencyId, u.shop_name || '', u.phone || '', u.country || '', 'pending', S.now());
    res.status(201).json({ ok: true, status: 'pending' });
  } catch (err) { next(err); }
});

// POST /api/delivery/cancel { agencyId } — retirer la demande / arrêter la collaboration.
router.post('/cancel', async (req, res, next) => {
  try {
    const id = merchantId(req);
    const agencyId = Math.round(Number(req.body && req.body.agencyId));
    if (!agencyId) return res.status(400).json({ error: 'Agence invalide.' });
    await S.db.prepare('DELETE FROM lv_collabs WHERE merchant_id = ? AND agency_id = ?').run(id, agencyId);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
