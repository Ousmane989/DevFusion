'use strict';

// ------------------------------------------------------------------
// API Karat Logistique — /api/livreur
//   public      : infos, suivi de colis, contact, inscription partenaire
//   partenaire  : commandes, stock, reversements, relevés
//   coursier    : tournée du jour, statuts, caisse
//   agence      : back-office complet (centre d'appel, dispatch, caisse…)
// ------------------------------------------------------------------

const express = require('express');
const rateLimit = require('express-rate-limit');
const { config } = require('../config');
const { hashPassword, verifyPassword } = require('../auth');
const S = require('./store');
const { setLvSession, clearLvSession, normPhone, publicUser, loadLv, requireRole } = require('./auth');

const { db } = S;
const router = express.Router();

const limiter = (max, msg) => rateLimit({ windowMs: 60 * 1000, max, standardHeaders: true, legacyHeaders: false, message: { error: msg } });
const formLimiter = limiter(10, 'Trop de demandes. Réessayez dans une minute.');
const loginLimiter = limiter(15, 'Trop de tentatives. Réessayez dans une minute.');
const trackLimiter = limiter(60, 'Trop de requêtes.');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const str = (v, max = 200) => String(v == null ? '' : v).trim().slice(0, max);
const int = (v) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n > 0 ? n : 0; };
const bad = (res, error, code = 400) => res.status(code).json({ error });

router.use(wrap(async (_req, _res, next) => { await S.ensureReady(); next(); }));
router.use(loadLv);

const ORDER_SELECT = `SELECT o.*, p.business_name AS partner_name, p.name AS partner_contact,
  c.name AS courier_name, c.phone AS courier_phone
  FROM lv_orders o
  LEFT JOIN lv_users p ON p.id = o.partner_id
  LEFT JOIN lv_users c ON c.id = o.courier_id`;

function decorate(o) {
  return o && { ...o, status_label: S.STATUSES[o.status] || o.status, collected: S.collectedAmount(o), net: S.partnerNet(o) };
}

// Données communes à la création d'une commande (partenaire, agence).
// Frais = tarif unique × nombre de produits (l'agence peut les ajuster).
async function buildOrder(b, { source, partnerId }) {
  const recipient_name = str(b.recipient_name, 120);
  const recipient_phone = normPhone(b.recipient_phone);
  if (!recipient_name) return { error: 'Le nom du destinataire est obligatoire.' };
  if (recipient_phone.length < 8) return { error: 'Le téléphone du destinataire est invalide.' };
  const zone = await S.findZone(int(b.zone_id));
  if (!zone) return { error: 'Choisissez une zone de livraison.' };
  const address = str(b.address, 300);
  if (!address) return { error: 'L\'adresse de livraison est obligatoire.' };
  const stockQty = int(b.stock_id) ? Math.max(1, int(b.stock_qty)) : 0;
  const items_count = Math.min(999, int(b.items_count) || stockQty || 1);
  const fee = b.fee != null && b.fee !== '' && source === 'agence' ? Math.max(0, Math.round(Number(b.fee) || 0)) : S.deliveryFee(items_count);
  return {
    code: S.newTrackingCode(),
    source,
    partner_id: partnerId || null,
    sender_name: str(b.sender_name, 120),
    sender_phone: normPhone(b.sender_phone),
    pickup_address: str(b.pickup_address, 300),
    recipient_name,
    recipient_phone,
    address,
    zone_id: zone.id,
    zone_name: zone.name,
    description: str(b.description, 500),
    stock_id: int(b.stock_id) || null,
    stock_qty: stockQty,
    items_count,
    cod_amount: Math.max(0, Math.round(Number(b.cod_amount) || 0)),
    fee,
    fee_payer: b.fee_payer === 'partenaire' || b.fee_payer === 'expediteur' ? 'partenaire' : 'destinataire',
    scheduled_for: str(b.scheduled_for, 10),
    note: str(b.note, 500),
  };
}

async function insertOrder(o, actor) {
  const t = S.now();
  const cols = Object.keys(o);
  const r = await db.prepare(`INSERT INTO lv_orders (${cols.join(', ')}, status, created_at, updated_at) VALUES (${cols.map(() => '?').join(', ')}, 'nouvelle', ?, ?)`)
    .run(...cols.map((k) => o[k]), t, t);
  await S.addEvent(r.lastInsertRowid, 'nouvelle', 'Commande enregistrée', actor);
  return db.prepare(ORDER_SELECT + ' WHERE o.id = ?').get(r.lastInsertRowid);
}

// Changement de statut + effets (tentatives, date de livraison). Le stock
// n'est jamais décompté automatiquement : il est saisi à la main.
async function setStatus(order, status, { actor, note, received_by } = {}) {
  if (!S.STATUSES[status]) throw Object.assign(new Error('Statut inconnu.'), { status: 400 });
  const t = S.now();
  const sets = ['status = ?', 'updated_at = ?'];
  const args = [status, t];
  if (status === 'livree') {
    sets.push('delivered_at = ?'); args.push(t);
    if (received_by != null) { sets.push('received_by = ?'); args.push(str(received_by, 120)); }
  }
  if (status === 'echec') sets.push('attempts = attempts + 1');
  args.push(order.id);
  await db.prepare(`UPDATE lv_orders SET ${sets.join(', ')} WHERE id = ?`).run(...args);
  await S.addEvent(order.id, status, note, actor);
}

function toCsv(rows) {
  const head = ['Code', 'Date', 'Destinataire', 'Téléphone', 'Zone', 'Adresse', 'Statut', 'Produits', 'Montant à encaisser', 'Frais', 'Payé par', 'Net partenaire'];
  const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const lines = rows.map((o) => [o.code, o.created_at, o.recipient_name, o.recipient_phone, o.zone_name, o.address, S.STATUSES[o.status], o.items_count, o.cod_amount, o.fee, o.fee_payer, o.status === 'livree' ? S.partnerNet(o) : 0].map(esc).join(';'));
  return '﻿' + [head.map(esc).join(';'), ...lines].join('\n');
}

// ================================================================
// PUBLIC
// ================================================================
router.get('/info', wrap(async (_req, res) => {
  const zones = await db.prepare('SELECT id, name, region, kind, delay FROM lv_zones WHERE active = 1 ORDER BY sort, id').all();
  const { phone, whatsapp, email, address, lat, lng } = config.livreur;
  res.json({ contact: { phone, whatsapp, email, address, lat, lng }, zones, fee_per_item: config.livreur.feePerItem, statuses: S.STATUSES });
}));

router.get('/track/:code', trackLimiter, wrap(async (req, res) => {
  const c = str(req.params.code, 20).toUpperCase().replace(/[-\s]/g, '');
  const code = 'KL-' + (c.length === 8 && c.startsWith('KL') ? c.slice(2) : c);
  const o = await db.prepare(ORDER_SELECT + ' WHERE o.code = ?').get(code);
  if (!o) return bad(res, 'Aucun colis trouvé avec ce code.', 404);
  const events = await db.prepare('SELECT status, note, created_at FROM lv_events WHERE order_id = ? ORDER BY id').all(o.id);
  // Données publiques uniquement : pas d'adresse ni de numéro complet.
  res.json({
    code: o.code,
    status: o.status,
    status_label: S.STATUSES[o.status],
    zone: o.zone_name,
    items: o.items_count,
    recipient: (o.recipient_name || '').split(' ')[0],
    sender: o.partner_name || (o.sender_name || '').split(' ')[0],
    courier: o.courier_name ? o.courier_name.split(' ')[0] : null,
    amount: S.collectedAmount(o),
    created_at: o.created_at,
    delivered_at: o.delivered_at,
    events: events.map((e) => ({ ...e, label: S.STATUSES[e.status] })),
  });
}));

router.post('/contact', formLimiter, wrap(async (req, res) => {
  const name = str(req.body.name, 120);
  const phone = normPhone(req.body.phone);
  const message = str(req.body.message, 2000);
  if (!name || phone.length < 8 || !message) return bad(res, 'Nom, téléphone et message sont obligatoires.');
  await db.prepare('INSERT INTO lv_messages (name, phone, subject, message, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(name, phone, str(req.body.subject, 120), message, S.now());
  res.status(201).json({ ok: true });
}));

// Inscription d'un e-commerçant partenaire (compte validé ensuite par l'agence).
router.post('/inscription', formLimiter, wrap(async (req, res) => {
  const b = req.body || {};
  const name = str(b.name, 120);
  const phone = normPhone(b.phone);
  const password = String(b.password || '');
  if (!name) return bad(res, 'Le nom est obligatoire.');
  if (phone.length < 8) return bad(res, 'Numéro de téléphone invalide.');
  if (password.length < 6) return bad(res, 'Le mot de passe doit contenir au moins 6 caractères.');
  if (!str(b.business_name)) return bad(res, 'Le nom de votre activité est obligatoire.');
  const ex = await db.prepare('SELECT id FROM lv_users WHERE phone = ?').get(phone);
  if (ex) return bad(res, 'Un compte existe déjà avec ce numéro.', 409);
  await db.prepare(`INSERT INTO lv_users (role, name, phone, email, password_hash, status, business_name, activity, city, address, created_at)
    VALUES ('partenaire', ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`)
    .run(name, phone, str(b.email, 160), await hashPassword(password), str(b.business_name, 120), str(b.activity, 120),
      str(b.city, 80) || 'Nouakchott', str(b.address, 300), S.now());
  res.status(201).json({ ok: true });
}));

const HOME = { agence: '/livreur/agence', partenaire: '/livreur/partenaire', coursier: '/livreur/coursier' };
// Page de connexion de chaque espace.
const LOGIN = { partenaire: '/livreur/connexion', agence: '/livreur/agence/connexion', coursier: '/livreur/agence/connexion' };

router.post('/login', loginLimiter, wrap(async (req, res) => {
  const phone = normPhone(req.body.phone);
  const u = await db.prepare('SELECT * FROM lv_users WHERE phone = ?').get(phone);
  if (!u || !(await verifyPassword(String(req.body.password || ''), u.password_hash))) {
    return bad(res, 'Téléphone ou mot de passe incorrect.', 401);
  }
  // Deux espaces séparés : partenaires d'un côté, agence (agents + livreurs) de l'autre.
  const space = req.body.space;
  if (space === 'partenaire' && u.role !== 'partenaire') return bad(res, 'Ce compte appartient à l\'équipe : connectez-vous depuis l\'espace agence.', 403);
  if (space === 'agence' && u.role === 'partenaire') return bad(res, 'Ce compte est un compte partenaire : connectez-vous depuis l\'espace partenaire.', 403);
  if (u.status === 'pending') return bad(res, 'Votre compte est en cours de validation par l\'agence (24 h ouvrées).', 403);
  if (u.status !== 'active') return bad(res, 'Ce compte est suspendu. Contactez l\'agence.', 403);
  setLvSession(res, u);
  res.json({ user: publicUser(u), redirect: HOME[u.role] });
}));

router.post('/logout', (_req, res) => { clearLvSession(res); res.json({ ok: true }); });

// Première utilisation : tant qu'aucun compte agence n'existe, la page de
// connexion agence permet de créer le premier (une seule fois).
async function agencyExists() {
  const r = await db.prepare("SELECT COUNT(*) AS n FROM lv_users WHERE role = 'agence'").get();
  return Number(r && r.n) > 0;
}
router.get('/setup', wrap(async (_req, res) => {
  res.json({ needed: !(await agencyExists()) });
}));
router.post('/setup', loginLimiter, wrap(async (req, res) => {
  if (await agencyExists()) return bad(res, 'Le compte agence existe déjà : connectez-vous.', 409);
  const b = req.body || {};
  const name = str(b.name, 120);
  const phone = normPhone(b.phone);
  const password = String(b.password || '');
  if (!name) return bad(res, 'Le nom est obligatoire.');
  if (phone.length < 8) return bad(res, 'Numéro de téléphone invalide.');
  if (password.length < 8) return bad(res, 'Le mot de passe doit contenir au moins 8 caractères.');
  if (password !== String(b.password2 || '')) return bad(res, 'Les deux mots de passe ne correspondent pas.');
  if (await db.prepare('SELECT id FROM lv_users WHERE phone = ?').get(phone)) return bad(res, 'Ce numéro est déjà utilisé par un autre compte.', 409);
  await db.prepare(`INSERT INTO lv_users (role, name, phone, password_hash, status, business_name, created_at)
    VALUES ('agence', ?, ?, ?, 'active', 'Karat Logistique', ?)`).run(name, phone, await hashPassword(password), S.now());
  const u = await db.prepare('SELECT * FROM lv_users WHERE phone = ?').get(phone);
  setLvSession(res, u);
  res.status(201).json({ user: publicUser(u), redirect: HOME.agence });
}));

router.get('/me', (req, res) => {
  if (!req.lv) return bad(res, 'Non connecté.', 401);
  res.json({ user: req.lv, home: HOME[req.lv.role] });
});

// ================================================================
// PARTENAIRE (e-commerçant)
// ================================================================
const partner = express.Router();
partner.use(requireRole('partenaire'));

partner.get('/summary', wrap(async (req, res) => {
  const id = req.lv.id;
  const rows = await db.prepare('SELECT status, cod_amount, fee, fee_payer, cash_remit_id, payout_id, created_at FROM lv_orders WHERE partner_id = ?').all(id);
  const by = {};
  let pending = 0;
  let sales = 0;
  let todayCount = 0;
  const d = S.today();
  for (const o of rows) {
    by[o.status] = (by[o.status] || 0) + 1;
    if (o.status === 'livree') {
      sales += Number(o.cod_amount);
      if (!o.payout_id) pending += S.partnerNet(o);
    }
    if (String(o.created_at).startsWith(d)) todayCount++;
  }
  const paid = await db.prepare('SELECT COALESCE(SUM(amount), 0) AS s FROM lv_payouts WHERE partner_id = ?').get(id);
  const delivered = by.livree || 0;
  const closed = delivered + (by.echec || 0) + (by.retournee || 0) + (by.annulee || 0);
  res.json({
    total: rows.length, today: todayCount, by, sales, pending_payout: pending, paid: Number(paid.s),
    rate: closed ? Math.round((delivered / closed) * 100) : null,
    in_progress: rows.length - closed - (by.reportee || 0),
  });
}));

partner.get('/orders', wrap(async (req, res) => {
  const args = [req.lv.id];
  let where = ' WHERE o.partner_id = ?';
  if (S.STATUSES[req.query.status]) { where += ' AND o.status = ?'; args.push(req.query.status); }
  if (req.query.q) {
    where += ' AND (LOWER(o.code) LIKE ? OR LOWER(o.recipient_name) LIKE ? OR o.recipient_phone LIKE ?)';
    const q = '%' + str(req.query.q, 60).toLowerCase() + '%';
    args.push(q, q, q);
  }
  const rows = await db.prepare(ORDER_SELECT + where + ' ORDER BY o.id DESC LIMIT 500').all(...args);
  res.json({ orders: rows.map(decorate) });
}));

partner.get('/orders/:id', wrap(async (req, res) => {
  const o = await db.prepare(ORDER_SELECT + ' WHERE o.id = ? AND o.partner_id = ?').get(int(req.params.id), req.lv.id);
  if (!o) return bad(res, 'Commande introuvable.', 404);
  const events = await db.prepare('SELECT * FROM lv_events WHERE order_id = ? ORDER BY id').all(o.id);
  res.json({ order: decorate(o), events: events.map((e) => ({ ...e, label: S.STATUSES[e.status] })) });
}));

partner.post('/orders', wrap(async (req, res) => {
  const b = req.body || {};
  if (int(b.stock_id)) {
    const st = await db.prepare('SELECT id FROM lv_stock WHERE id = ? AND partner_id = ?').get(int(b.stock_id), req.lv.id);
    if (!st) return bad(res, 'Article de stock introuvable.');
  }
  const o = await buildOrder({
    ...b,
    sender_name: req.lv.business_name || req.lv.name,
    sender_phone: req.lv.phone,
    pickup_address: str(b.pickup_address) || (int(b.stock_id) ? 'Entrepôt Karat Logistique' : req.lv.address),
  }, { source: 'partenaire', partnerId: req.lv.id });
  if (o.error) return bad(res, o.error);
  const saved = await insertOrder(o, req.lv.business_name || req.lv.name);
  res.status(201).json({ order: decorate(saved) });
}));

// Le partenaire (boutique) ne peut PAS annuler une commande : seule l'agence
// gère le cycle de vie des commandes (l'endpoint d'annulation a été retiré).

partner.get('/stock', wrap(async (req, res) => {
  res.json({ stock: await db.prepare('SELECT * FROM lv_stock WHERE partner_id = ? ORDER BY name').all(req.lv.id) });
}));

// Stock saisi manuellement par le partenaire (l'agence peut aussi le corriger).
partner.post('/stock', wrap(async (req, res) => {
  const b = req.body || {};
  if (!str(b.name)) return bad(res, 'Le nom de l\'article est obligatoire.');
  await db.prepare('INSERT INTO lv_stock (partner_id, name, sku, qty, location, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.lv.id, str(b.name, 120), str(b.sku, 60), Math.max(0, Math.round(Number(b.qty) || 0)), '', S.now());
  res.status(201).json({ ok: true });
}));
partner.put('/stock/:id', wrap(async (req, res) => {
  const s = await db.prepare('SELECT * FROM lv_stock WHERE id = ? AND partner_id = ?').get(int(req.params.id), req.lv.id);
  if (!s) return bad(res, 'Article introuvable.', 404);
  const qty = Math.max(0, Math.round(Number(req.body && req.body.qty)));
  if (!Number.isFinite(qty)) return bad(res, 'Quantité invalide.');
  await db.prepare('UPDATE lv_stock SET qty = ?, updated_at = ? WHERE id = ?').run(qty, S.now(), s.id);
  res.json({ ok: true });
}));

partner.get('/payouts', wrap(async (req, res) => {
  res.json({ payouts: await db.prepare('SELECT * FROM lv_payouts WHERE partner_id = ? ORDER BY id DESC').all(req.lv.id) });
}));

partner.get('/export.csv', wrap(async (req, res) => {
  const rows = await db.prepare('SELECT * FROM lv_orders WHERE partner_id = ? ORDER BY id DESC').all(req.lv.id);
  res.set('Content-Disposition', 'attachment; filename="releve-karat-logistique.csv"');
  res.type('text/csv; charset=utf-8').send(toCsv(rows));
}));

partner.put('/profile', wrap(async (req, res) => {
  const b = req.body || {};
  await db.prepare('UPDATE lv_users SET name = ?, email = ?, business_name = ?, address = ?, city = ?, payout_method = ?, payout_number = ? WHERE id = ?')
    .run(str(b.name, 120) || req.lv.name, str(b.email, 160), str(b.business_name, 120) || req.lv.business_name, str(b.address, 300),
      str(b.city, 80), str(b.payout_method, 40), str(b.payout_number, 40), req.lv.id);
  res.json({ ok: true });
}));

router.use('/partner', partner);

// ================================================================
// COURSIER (livreur)
// ================================================================
const courier = express.Router();
courier.use(requireRole('coursier'));

courier.get('/tour', wrap(async (req, res) => {
  const active = await db.prepare(ORDER_SELECT + " WHERE o.courier_id = ? AND o.status IN ('assignee', 'recuperee', 'en_cours', 'reportee') ORDER BY o.id").all(req.lv.id);
  const done = await db.prepare(ORDER_SELECT + " WHERE o.courier_id = ? AND o.status IN ('livree', 'echec') AND o.updated_at >= ? ORDER BY o.updated_at DESC").all(req.lv.id, S.today());
  res.json({ active: active.map(decorate), done: done.map(decorate) });
}));

const COURIER_NEXT = { assignee: ['recuperee'], reportee: ['recuperee', 'en_cours'], recuperee: ['en_cours'], en_cours: ['livree', 'echec', 'reportee'] };

courier.post('/orders/:id/status', wrap(async (req, res) => {
  const o = await db.prepare('SELECT * FROM lv_orders WHERE id = ? AND courier_id = ?').get(int(req.params.id), req.lv.id);
  if (!o) return bad(res, 'Course introuvable.', 404);
  const status = req.body.status;
  if (!(COURIER_NEXT[o.status] || []).includes(status)) return bad(res, 'Action impossible à ce stade.');
  const note = str(req.body.note, 300);
  if (status === 'livree' && !str(req.body.received_by)) return bad(res, 'Indiquez le nom de la personne qui a reçu le colis.');
  if ((status === 'echec' || status === 'reportee') && !note) return bad(res, 'Indiquez le motif.');
  await setStatus(o, status, { actor: req.lv.name, note: status === 'livree' ? ('Remis à ' + str(req.body.received_by, 120) + (note ? ' — ' + note : '')) : note, received_by: req.body.received_by });
  res.json({ ok: true });
}));

courier.get('/cash', wrap(async (req, res) => {
  const rows = await db.prepare("SELECT * FROM lv_orders WHERE courier_id = ? AND status = 'livree' AND cash_remit_id IS NULL ORDER BY delivered_at DESC").all(req.lv.id);
  const remits = await db.prepare('SELECT * FROM lv_cash WHERE courier_id = ? ORDER BY id DESC LIMIT 50').all(req.lv.id);
  res.json({ held: rows.reduce((s, o) => s + S.collectedAmount(o), 0), orders: rows.map(decorate), remits });
}));

router.use('/courier', courier);

// ================================================================
// AGENCE (back-office)
// ================================================================
const agency = express.Router();
agency.use(requireRole('agence'));

agency.get('/summary', wrap(async (req, res) => {
  const d = S.today();
  const all = await db.prepare('SELECT status, cod_amount, fee, fee_payer, courier_id, cash_remit_id, payout_id, partner_id, created_at, delivered_at FROM lv_orders').all();
  const by = {};
  let todayNew = 0, todayDelivered = 0, cashOut = 0, payoutDue = 0, feesMonth = 0, unassigned = 0;
  const month = d.slice(0, 7);
  for (const o of all) {
    by[o.status] = (by[o.status] || 0) + 1;
    if (String(o.created_at).startsWith(d)) todayNew++;
    if (o.status === 'livree') {
      if (String(o.delivered_at).startsWith(d)) todayDelivered++;
      if (String(o.delivered_at).startsWith(month)) feesMonth += Number(o.fee);
      if (!o.cash_remit_id && o.courier_id) cashOut += S.collectedAmount(o);
      if (o.partner_id && o.cash_remit_id && !o.payout_id) payoutDue += S.partnerNet(o);
    }
    if (o.status === 'confirmee' && !o.courier_id) unassigned++;
  }
  const pend = await db.prepare("SELECT role, COUNT(*) AS n FROM lv_users WHERE status = 'pending' GROUP BY role").all();
  const couriers = await db.prepare("SELECT COUNT(*) AS n FROM lv_users WHERE role = 'coursier' AND status = 'active'").get();
  const partners = await db.prepare("SELECT COUNT(*) AS n FROM lv_users WHERE role = 'partenaire' AND status = 'active'").get();
  const msgs = await db.prepare('SELECT COUNT(*) AS n FROM lv_messages WHERE handled = 0').get();
  const collabReq = await db.prepare("SELECT COUNT(*) AS n FROM lv_collabs WHERE agency_id = ? AND status = 'pending'").get(req.lv.id);
  res.json({
    total: all.length, by, today_new: todayNew, today_delivered: todayDelivered, cash_out: cashOut, payout_due: payoutDue,
    fees_month: feesMonth, unassigned, to_confirm: by.nouvelle || 0,
    pending_users: Object.fromEntries(pend.map((p) => [p.role, Number(p.n)])),
    couriers: Number(couriers.n), partners: Number(partners.n), messages: Number(msgs.n),
    boutique_requests: Number(collabReq.n),
  });
}));

agency.get('/orders', wrap(async (req, res) => {
  const args = [];
  const cond = [];
  const st = String(req.query.status || '');
  if (st === 'actives') cond.push("o.status IN ('nouvelle', 'confirmee', 'assignee', 'recuperee', 'en_cours', 'reportee')");
  else if (S.STATUSES[st]) { cond.push('o.status = ?'); args.push(st); }
  if (int(req.query.partner)) { cond.push('o.partner_id = ?'); args.push(int(req.query.partner)); }
  if (int(req.query.courier)) { cond.push('o.courier_id = ?'); args.push(int(req.query.courier)); }
  if (req.query.q) {
    const q = '%' + str(req.query.q, 60).toLowerCase() + '%';
    cond.push('(LOWER(o.code) LIKE ? OR LOWER(o.recipient_name) LIKE ? OR o.recipient_phone LIKE ? OR LOWER(o.address) LIKE ?)');
    args.push(q, q, q, q);
  }
  const rows = await db.prepare(ORDER_SELECT + (cond.length ? ' WHERE ' + cond.join(' AND ') : '') + ' ORDER BY o.id DESC LIMIT 500').all(...args);
  res.json({ orders: rows.map(decorate) });
}));

agency.get('/orders/:id', wrap(async (req, res) => {
  const o = await db.prepare(ORDER_SELECT + ' WHERE o.id = ?').get(int(req.params.id));
  if (!o) return bad(res, 'Commande introuvable.', 404);
  const events = await db.prepare('SELECT * FROM lv_events WHERE order_id = ? ORDER BY id').all(o.id);
  res.json({ order: decorate(o), events: events.map((e) => ({ ...e, label: S.STATUSES[e.status] })) });
}));

agency.post('/orders', wrap(async (req, res) => {
  const b = req.body || {};
  const pid = int(b.partner_id) || null;
  let extra = {};
  if (pid) {
    const p = await db.prepare("SELECT * FROM lv_users WHERE id = ? AND role = 'partenaire'").get(pid);
    if (!p) return bad(res, 'Partenaire introuvable.');
    extra = { sender_name: p.business_name || p.name, sender_phone: p.phone, pickup_address: str(b.pickup_address) || p.address };
  }
  const o = await buildOrder({ ...b, ...extra }, { source: 'agence', partnerId: pid });
  if (o.error) return bad(res, o.error);
  const saved = await insertOrder(o, 'Agence');
  res.status(201).json({ order: decorate(saved) });
}));

const EDITABLE = ['recipient_name', 'recipient_phone', 'address', 'description', 'note', 'scheduled_for', 'pickup_address', 'sender_name', 'sender_phone'];

agency.put('/orders/:id', wrap(async (req, res) => {
  const o = await db.prepare('SELECT * FROM lv_orders WHERE id = ?').get(int(req.params.id));
  if (!o) return bad(res, 'Commande introuvable.', 404);
  const b = req.body || {};
  const actor = req.lv.name || 'Agence';
  const sets = [];
  const args = [];
  for (const k of EDITABLE) {
    if (b[k] !== undefined) { sets.push(k + ' = ?'); args.push(k.endsWith('phone') ? normPhone(b[k]) : str(b[k], k === 'scheduled_for' ? 10 : 500)); }
  }
  for (const k of ['cod_amount', 'fee']) {
    if (b[k] !== undefined) { sets.push(k + ' = ?'); args.push(Math.max(0, Math.round(Number(b[k]) || 0))); }
  }
  if (b.items_count !== undefined) { sets.push('items_count = ?'); args.push(Math.min(999, Math.max(1, int(b.items_count)))); }
  if (b.fee_payer !== undefined) { sets.push('fee_payer = ?'); args.push(b.fee_payer === 'partenaire' ? 'partenaire' : 'destinataire'); }
  if (b.zone_id !== undefined) {
    const z = await db.prepare('SELECT * FROM lv_zones WHERE id = ?').get(int(b.zone_id));
    if (!z) return bad(res, 'Zone inconnue.');
    sets.push('zone_id = ?', 'zone_name = ?'); args.push(z.id, z.name);
  }
  let assigned = false;
  if (b.courier_id !== undefined) {
    const cid = int(b.courier_id) || null;
    if (cid) {
      const c = await db.prepare("SELECT * FROM lv_users WHERE id = ? AND role = 'coursier' AND status = 'active'").get(cid);
      if (!c) return bad(res, 'Livreur introuvable.');
    }
    if (cid !== (o.courier_id || null)) { sets.push('courier_id = ?'); args.push(cid); assigned = !!cid; }
  }
  if (sets.length) {
    sets.push('updated_at = ?'); args.push(S.now(), o.id);
    await db.prepare(`UPDATE lv_orders SET ${sets.join(', ')} WHERE id = ?`).run(...args);
  }
  const fresh = await db.prepare('SELECT * FROM lv_orders WHERE id = ?').get(o.id);
  if (b.status && b.status !== fresh.status) {
    await setStatus(fresh, b.status, { actor, note: str(b.status_note, 300), received_by: b.received_by });
  } else if (assigned && ['nouvelle', 'confirmee', 'assignee', 'reportee', 'echec'].includes(fresh.status)) {
    const c = await db.prepare('SELECT name FROM lv_users WHERE id = ?').get(fresh.courier_id);
    await setStatus(fresh, 'assignee', { actor, note: 'Livreur : ' + c.name });
  } else if (b.status_note) {
    await S.addEvent(o.id, fresh.status, str(b.status_note, 300), actor);
  }
  res.json({ order: decorate(await db.prepare(ORDER_SELECT + ' WHERE o.id = ?').get(o.id)) });
}));

// --- Comptes (partenaires, livreurs, agents) ---
agency.get('/users', wrap(async (req, res) => {
  const args = [];
  const cond = [];
  if (['agence', 'partenaire', 'coursier'].includes(req.query.role)) { cond.push('role = ?'); args.push(req.query.role); }
  if (['pending', 'active', 'suspended'].includes(req.query.status)) { cond.push('status = ?'); args.push(req.query.status); }
  const rows = await db.prepare('SELECT * FROM lv_users' + (cond.length ? ' WHERE ' + cond.join(' AND ') : '') + ' ORDER BY id DESC').all(...args);
  res.json({ users: rows.map(publicUser) });
}));

agency.post('/users', wrap(async (req, res) => {
  const b = req.body || {};
  const role = ['agence', 'partenaire', 'coursier'].includes(b.role) ? b.role : null;
  const phone = normPhone(b.phone);
  if (!role || !str(b.name) || phone.length < 8) return bad(res, 'Rôle, nom et téléphone sont obligatoires.');
  if (String(b.password || '').length < 6) return bad(res, 'Mot de passe : 6 caractères minimum.');
  if (await db.prepare('SELECT id FROM lv_users WHERE phone = ?').get(phone)) return bad(res, 'Ce numéro est déjà utilisé.', 409);
  await db.prepare(`INSERT INTO lv_users (role, name, phone, email, password_hash, status, business_name, activity, city, address, vehicle, created_at)
    VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)`)
    .run(role, str(b.name, 120), phone, str(b.email, 160), await hashPassword(String(b.password)), str(b.business_name, 120),
      str(b.activity, 120), str(b.city, 80) || 'Nouakchott', str(b.address, 300), str(b.vehicle, 60), S.now());
  res.status(201).json({ ok: true });
}));

agency.put('/users/:id', wrap(async (req, res) => {
  const u = await db.prepare('SELECT * FROM lv_users WHERE id = ?').get(int(req.params.id));
  if (!u) return bad(res, 'Compte introuvable.', 404);
  const b = req.body || {};
  if (u.id === req.lv.id && b.status && b.status !== 'active') return bad(res, 'Vous ne pouvez pas suspendre votre propre compte.');
  const sets = [];
  const args = [];
  if (['pending', 'active', 'suspended'].includes(b.status)) { sets.push('status = ?'); args.push(b.status); }
  for (const k of ['name', 'email', 'business_name', 'activity', 'city', 'address', 'vehicle', 'note', 'payout_method', 'payout_number']) {
    if (b[k] !== undefined) { sets.push(k + ' = ?'); args.push(str(b[k], 300)); }
  }
  if (b.password) {
    if (String(b.password).length < 6) return bad(res, 'Mot de passe : 6 caractères minimum.');
    sets.push('password_hash = ?'); args.push(await hashPassword(String(b.password)));
  }
  if (sets.length) { args.push(u.id); await db.prepare(`UPDATE lv_users SET ${sets.join(', ')} WHERE id = ?`).run(...args); }
  res.json({ ok: true });
}));

// --- Stock déposé par les partenaires ---
agency.get('/stock', wrap(async (_req, res) => {
  res.json({ stock: await db.prepare('SELECT s.*, u.business_name AS partner_name FROM lv_stock s LEFT JOIN lv_users u ON u.id = s.partner_id ORDER BY u.business_name, s.name').all() });
}));
agency.post('/stock', wrap(async (req, res) => {
  const b = req.body || {};
  const p = await db.prepare("SELECT id FROM lv_users WHERE id = ? AND role = 'partenaire'").get(int(b.partner_id));
  if (!p || !str(b.name)) return bad(res, 'Partenaire et article sont obligatoires.');
  await db.prepare('INSERT INTO lv_stock (partner_id, name, sku, qty, location, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(p.id, str(b.name, 120), str(b.sku, 60), Math.round(Number(b.qty) || 0), str(b.location, 60), S.now());
  res.status(201).json({ ok: true });
}));
agency.put('/stock/:id', wrap(async (req, res) => {
  const s = await db.prepare('SELECT * FROM lv_stock WHERE id = ?').get(int(req.params.id));
  if (!s) return bad(res, 'Article introuvable.', 404);
  const b = req.body || {};
  const qty = b.add !== undefined ? Number(s.qty) + Math.round(Number(b.add) || 0) : (b.qty !== undefined ? Math.round(Number(b.qty) || 0) : s.qty);
  await db.prepare('UPDATE lv_stock SET name = ?, sku = ?, qty = ?, location = ?, updated_at = ? WHERE id = ?')
    .run(str(b.name ?? s.name, 120), str(b.sku ?? s.sku, 60), qty, str(b.location ?? s.location, 60), S.now(), s.id);
  res.json({ ok: true });
}));
agency.delete('/stock/:id', wrap(async (req, res) => {
  await db.prepare('DELETE FROM lv_stock WHERE id = ?').run(int(req.params.id));
  res.json({ ok: true });
}));

// --- Caisse : argent encaissé par les livreurs ---
agency.get('/cash', wrap(async (_req, res) => {
  const couriers = await db.prepare("SELECT id, name, phone FROM lv_users WHERE role = 'coursier' ORDER BY name").all();
  const rows = await db.prepare("SELECT * FROM lv_orders WHERE status = 'livree' AND cash_remit_id IS NULL AND courier_id IS NOT NULL").all();
  const held = {};
  for (const o of rows) {
    const h = held[o.courier_id] || (held[o.courier_id] = { amount: 0, count: 0 });
    h.amount += S.collectedAmount(o);
    h.count++;
  }
  const remits = await db.prepare('SELECT r.*, u.name AS courier_name FROM lv_cash r LEFT JOIN lv_users u ON u.id = r.courier_id ORDER BY r.id DESC LIMIT 100').all();
  res.json({ couriers: couriers.map((c) => ({ ...c, ...(held[c.id] || { amount: 0, count: 0 }) })), remits });
}));
agency.post('/cash/:courierId', wrap(async (req, res) => {
  const cid = int(req.params.courierId);
  const rows = await db.prepare("SELECT * FROM lv_orders WHERE status = 'livree' AND cash_remit_id IS NULL AND courier_id = ?").all(cid);
  if (!rows.length) return bad(res, 'Aucun encaissement à remettre pour ce livreur.');
  const amount = rows.reduce((s, o) => s + S.collectedAmount(o), 0);
  const r = await db.prepare('INSERT INTO lv_cash (courier_id, amount, orders_count, received_by, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(cid, amount, rows.length, req.lv.name || 'Agence', S.now());
  for (const o of rows) await db.prepare('UPDATE lv_orders SET cash_remit_id = ? WHERE id = ?').run(r.lastInsertRowid, o.id);
  res.json({ ok: true, amount, count: rows.length });
}));

// --- Reversements aux partenaires ---
agency.get('/payouts', wrap(async (_req, res) => {
  const partners = await db.prepare("SELECT id, name, business_name, phone, payout_method, payout_number FROM lv_users WHERE role = 'partenaire' ORDER BY business_name").all();
  const rows = await db.prepare("SELECT * FROM lv_orders WHERE status = 'livree' AND cash_remit_id IS NOT NULL AND payout_id IS NULL AND partner_id IS NOT NULL").all();
  const due = {};
  for (const o of rows) {
    const d = due[o.partner_id] || (due[o.partner_id] = { amount: 0, count: 0, fees: 0, collected: 0 });
    d.amount += S.partnerNet(o);
    d.collected += Number(o.cod_amount);
    d.fees += o.fee_payer === 'partenaire' ? Number(o.fee) : 0;
    d.count++;
  }
  const history = await db.prepare('SELECT p.*, u.business_name AS partner_name FROM lv_payouts p LEFT JOIN lv_users u ON u.id = p.partner_id ORDER BY p.id DESC LIMIT 100').all();
  res.json({ partners: partners.map((p) => ({ ...p, ...(due[p.id] || { amount: 0, count: 0, fees: 0, collected: 0 }) })), history });
}));
agency.post('/payouts/:partnerId', wrap(async (req, res) => {
  const pid = int(req.params.partnerId);
  const rows = await db.prepare("SELECT * FROM lv_orders WHERE status = 'livree' AND cash_remit_id IS NOT NULL AND payout_id IS NULL AND partner_id = ?").all(pid);
  if (!rows.length) return bad(res, 'Aucun montant à reverser pour ce partenaire.');
  const amount = rows.reduce((s, o) => s + S.partnerNet(o), 0);
  const fees = rows.reduce((s, o) => s + (o.fee_payer === 'partenaire' ? Number(o.fee) : 0), 0);
  const collected = rows.reduce((s, o) => s + Number(o.cod_amount), 0);
  const r = await db.prepare('INSERT INTO lv_payouts (partner_id, amount, collected, fees, orders_count, method, reference, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(pid, amount, collected, fees, rows.length, str(req.body.method, 40), str(req.body.reference, 80), S.now());
  for (const o of rows) await db.prepare('UPDATE lv_orders SET payout_id = ? WHERE id = ?').run(r.lastInsertRowid, o.id);
  res.json({ ok: true, amount, count: rows.length });
}));

// --- Zones desservies et délais ---
agency.get('/zones', wrap(async (_req, res) => {
  res.json({ zones: await db.prepare('SELECT * FROM lv_zones ORDER BY sort, id').all() });
}));
agency.post('/zones', wrap(async (req, res) => {
  const b = req.body || {};
  if (!str(b.name)) return bad(res, 'Nom de zone obligatoire.');
  await db.prepare('INSERT INTO lv_zones (name, region, kind, delay, active, sort) VALUES (?, ?, ?, ?, 1, ?)')
    .run(str(b.name, 80), str(b.region, 80), b.kind === 'commune' ? 'commune' : 'ville', str(b.delay, 40), 999);
  res.status(201).json({ ok: true });
}));
agency.put('/zones/:id', wrap(async (req, res) => {
  const z = await db.prepare('SELECT * FROM lv_zones WHERE id = ?').get(int(req.params.id));
  if (!z) return bad(res, 'Zone introuvable.', 404);
  const b = req.body || {};
  await db.prepare('UPDATE lv_zones SET name = ?, region = ?, delay = ?, active = ? WHERE id = ?')
    .run(str(b.name ?? z.name, 80), str(b.region ?? z.region, 80), str(b.delay ?? z.delay, 40), b.active !== undefined ? (b.active ? 1 : 0) : z.active, z.id);
  res.json({ ok: true });
}));

// --- Messages du formulaire de contact ---
agency.get('/messages', wrap(async (_req, res) => {
  res.json({ messages: await db.prepare('SELECT * FROM lv_messages ORDER BY handled, id DESC LIMIT 200').all() });
}));
agency.put('/messages/:id', wrap(async (req, res) => {
  await db.prepare('UPDATE lv_messages SET handled = ? WHERE id = ?').run(req.body.handled ? 1 : 0, int(req.params.id));
  res.json({ ok: true });
}));

agency.get('/export.csv', wrap(async (_req, res) => {
  const rows = await db.prepare('SELECT * FROM lv_orders ORDER BY id DESC').all();
  res.set('Content-Disposition', 'attachment; filename="commandes-karat-logistique.csv"');
  res.type('text/csv; charset=utf-8').send(toCsv(rows));
}));

// --- Collaborations avec les boutiques Karat (demande / acceptation) ---
agency.get('/collabs', wrap(async (req, res) => {
  const rows = await db.prepare(
    "SELECT c.*, p.business_name AS partner_name, p.phone AS partner_phone FROM lv_collabs c LEFT JOIN lv_users p ON p.id = c.partner_id " +
    "WHERE c.agency_id = ? ORDER BY CASE WHEN c.status = 'pending' THEN 0 ELSE 1 END, c.id DESC"
  ).all(req.lv.id);
  res.json({ collabs: rows });
}));

// Accepter une boutique Karat en la liant à un compte partenaire (existant ou
// créé ici) : ses commandes arrivent alors chez l'agence ET chez le partenaire.
// Rappelé sur une collaboration déjà acceptée, change simplement le compte lié.
agency.post('/collabs/:id/accept', wrap(async (req, res) => {
  const c = await db.prepare('SELECT * FROM lv_collabs WHERE id = ? AND agency_id = ?').get(int(req.params.id), req.lv.id);
  if (!c) return bad(res, 'Demande introuvable.', 404);
  const b = req.body || {};
  let partnerId = null;
  if (b.partner_id === 'new') {
    const phone = normPhone(b.phone || c.phone);
    const password = String(b.password || '');
    if (phone.length < 8) return bad(res, 'Numéro de téléphone invalide.');
    if (password.length < 6) return bad(res, 'Le mot de passe doit contenir au moins 6 caractères.');
    if (await db.prepare('SELECT id FROM lv_users WHERE phone = ?').get(phone)) return bad(res, 'Un compte existe déjà avec ce numéro : choisissez-le dans la liste.', 409);
    const shop = str(b.business_name, 120) || c.shop_name || 'Boutique';
    const r = await db.prepare(`INSERT INTO lv_users (role, name, phone, password_hash, status, business_name, activity, city, created_at)
      VALUES ('partenaire', ?, ?, ?, 'active', ?, 'Boutique Karat', ?, ?)`)
      .run(shop, phone, await hashPassword(password), shop, c.city || 'Nouakchott', S.now());
    partnerId = r.lastInsertRowid;
  } else {
    const p = await db.prepare("SELECT id, status FROM lv_users WHERE id = ? AND role = 'partenaire'").get(int(b.partner_id));
    if (!p) return bad(res, 'Choisissez le compte partenaire de cette boutique (ou créez-en un).');
    if (p.status !== 'active') await db.prepare("UPDATE lv_users SET status = 'active' WHERE id = ?").run(p.id);
    partnerId = p.id;
  }
  await db.prepare("UPDATE lv_collabs SET status = 'accepted', responded_at = ? WHERE id = ?").run(S.now(), c.id);
  await S.linkCollabPartner(c, partnerId);
  res.json({ ok: true });
}));

agency.post('/collabs/:id/reject', wrap(async (req, res) => {
  const c = await db.prepare('SELECT * FROM lv_collabs WHERE id = ? AND agency_id = ?').get(int(req.params.id), req.lv.id);
  if (!c) return bad(res, 'Demande introuvable.', 404);
  await db.prepare("UPDATE lv_collabs SET status = 'rejected', responded_at = ? WHERE id = ?").run(S.now(), c.id);
  res.json({ ok: true });
}));

router.use('/agency', agency);

// Erreurs « métier » (statut inconnu, etc.) renvoyées proprement.
// eslint-disable-next-line no-unused-vars
router.use((err, _req, res, next) => {
  if (err && err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
  next(err);
});

module.exports = { router, HOME, LOGIN };
