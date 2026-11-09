'use strict';

// ------------------------------------------------------------------
// API côté commerçant Karat : collaboration avec une agence de livraison.
// Le commerçant envoie une demande ; une fois acceptée par l'agence, ses
// commandes boutique sont transmises automatiquement à l'agence (temps réel).
// ------------------------------------------------------------------
const express = require('express');
const { requireAuth } = require('../middleware');
const S = require('../livreur/store');
const { hashPassword } = require('../auth');
const { normPhone } = require('../livreur/auth');
const { config } = require('../config');

const router = express.Router();
router.get('/__ping', async (_req, res) => {
  let who = null, canWrite = null;
  try { const r = await S.db.prepare('SELECT current_user AS u').get(); who = r && r.u; } catch (e) { who = 'ERR:' + (e && e.message); }
  try { const r = await S.db.prepare("SELECT has_table_privilege(current_user,'public.lv_orders','INSERT') AS w").get(); canWrite = r && r.w; } catch (_) {}
  res.json({ v: 'diag6', dbUser: who, canWriteLvOrders: canWrite });
});
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
    collabs.forEach((c) => { byAgency[c.agency_id] = c; });
    // Compte partenaire Karat Logistique relié (identifiant + mot de passe créé ou non).
    const partners = {};
    for (const c of collabs) {
      if (c.status === 'accepted' && c.partner_id) {
        const p = await S.db.prepare('SELECT phone, password_hash FROM lv_users WHERE id = ?').get(c.partner_id);
        if (p) partners[c.agency_id] = { phone: p.phone, has_password: Boolean(p.password_hash) };
      }
    }
    res.json({
      ok: true,
      site_url: config.livreur.siteUrl,
      agencies: agencies.map((a) => ({
        id: a.id,
        name: a.business_name || a.name,
        city: a.city || '',
        status: byAgency[a.id] ? byAgency[a.id].status : null, // pending | accepted | rejected | null
        partner: partners[a.id] || null,
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
  } catch (err) { res.status(500).json({ error: 'debug-req', detail: String((err && (err.stack || err.message)) || err).slice(0, 600) }); }
});

// POST /api/delivery/partner-password { agencyId, password } — le commerçant
// choisit lui-même le mot de passe de son espace partenaire Karat Logistique.
// Autorisé pour le compte relié à SA collaboration acceptée, s'il n'a pas encore
// de mot de passe ou s'il porte le numéro du commerçant.
router.post('/partner-password', async (req, res, next) => {
  try {
    const id = merchantId(req);
    const agencyId = Math.round(Number(req.body && req.body.agencyId));
    const password = String((req.body && req.body.password) || '');
    if (password.length < 6) return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
    const c = await S.db.prepare("SELECT * FROM lv_collabs WHERE merchant_id = ? AND agency_id = ? AND status = 'accepted'").get(id, agencyId);
    if (!c || !c.partner_id) return res.status(404).json({ error: 'Aucun espace partenaire relié à cette agence pour le moment.' });
    const p = await S.db.prepare("SELECT id, phone, password_hash FROM lv_users WHERE id = ? AND role = 'partenaire'").get(c.partner_id);
    if (!p) return res.status(404).json({ error: 'Espace partenaire introuvable.' });
    const u = req.account || req.user;
    if (p.password_hash && normPhone(p.phone) !== normPhone(u.phone)) {
      return res.status(403).json({ error: 'Ce compte partenaire a déjà un mot de passe. Utilisez « Mot de passe oublié » ou contactez l\'agence.' });
    }
    await S.db.prepare('UPDATE lv_users SET password_hash = ? WHERE id = ?').run(await hashPassword(password), p.id);
    res.json({ ok: true });
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
