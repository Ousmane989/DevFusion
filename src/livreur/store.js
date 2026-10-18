'use strict';

// ------------------------------------------------------------------
// Karat Livreur — schéma et données de référence.
// Tables préfixées « lv_ » (indépendantes des boutiques Karat). Le schéma est
// créé au premier appel, pour SQLite comme pour PostgreSQL. Les horodatages
// sont fournis par l'application (now()) pour rester identiques sur les deux
// moteurs.
// ------------------------------------------------------------------

const crypto = require('crypto');
const db = require('../db');
const { hashPassword } = require('../auth');
const { config } = require('../config');

const isPg = db._driver === 'postgres';
const ID = isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';

function now() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}
function today() {
  return now().slice(0, 10);
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS lv_users (
    id ${ID},
    role TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    business_name TEXT NOT NULL DEFAULT '',
    activity TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT 'Nouakchott',
    address TEXT NOT NULL DEFAULT '',
    vehicle TEXT NOT NULL DEFAULT '',
    payout_method TEXT NOT NULL DEFAULT '',
    payout_number TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS lv_zones (
    id ${ID},
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'commune',
    price INTEGER NOT NULL DEFAULT 0,
    delay TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    sort INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS lv_stock (
    id ${ID},
    partner_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    sku TEXT NOT NULL DEFAULT '',
    qty INTEGER NOT NULL DEFAULT 0,
    location TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS lv_orders (
    id ${ID},
    code TEXT NOT NULL UNIQUE,
    source TEXT NOT NULL DEFAULT 'partenaire',
    partner_id INTEGER,
    service TEXT NOT NULL DEFAULT 'ecommerce',
    sender_name TEXT NOT NULL DEFAULT '',
    sender_phone TEXT NOT NULL DEFAULT '',
    pickup_address TEXT NOT NULL DEFAULT '',
    recipient_name TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    zone_id INTEGER,
    zone_name TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    stock_id INTEGER,
    stock_qty INTEGER NOT NULL DEFAULT 0,
    items_count INTEGER NOT NULL DEFAULT 1,
    cod_amount INTEGER NOT NULL DEFAULT 0,
    fee INTEGER NOT NULL DEFAULT 0,
    fee_payer TEXT NOT NULL DEFAULT 'destinataire',
    status TEXT NOT NULL DEFAULT 'nouvelle',
    courier_id INTEGER,
    scheduled_for TEXT NOT NULL DEFAULT '',
    received_by TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    attempts INTEGER NOT NULL DEFAULT 0,
    cash_remit_id INTEGER,
    payout_id INTEGER,
    stock_applied INTEGER NOT NULL DEFAULT 0,
    delivered_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_lv_orders_partner ON lv_orders(partner_id);
  CREATE INDEX IF NOT EXISTS idx_lv_orders_courier ON lv_orders(courier_id, status);
  CREATE INDEX IF NOT EXISTS idx_lv_orders_status ON lv_orders(status);
  CREATE TABLE IF NOT EXISTS lv_events (
    id ${ID},
    order_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    actor TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_lv_events_order ON lv_events(order_id);
  CREATE TABLE IF NOT EXISTS lv_cash (
    id ${ID},
    courier_id INTEGER NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    orders_count INTEGER NOT NULL DEFAULT 0,
    received_by TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS lv_payouts (
    id ${ID},
    partner_id INTEGER NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    collected INTEGER NOT NULL DEFAULT 0,
    fees INTEGER NOT NULL DEFAULT 0,
    orders_count INTEGER NOT NULL DEFAULT 0,
    method TEXT NOT NULL DEFAULT '',
    reference TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS lv_messages (
    id ${ID},
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT '',
    handled INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS lv_collabs (
    id ${ID},
    merchant_id INTEGER NOT NULL,
    agency_id INTEGER NOT NULL,
    shop_name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    responded_at TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX IF NOT EXISTS idx_lv_collabs_merchant ON lv_collabs(merchant_id);
  CREATE INDEX IF NOT EXISTS idx_lv_collabs_agency ON lv_collabs(agency_id, status);
`;

// Villes desservies et délais : public/livreur/defaults.json, fichier partagé
// avec la page d'accueil (qui s'en sert si l'API est injoignable). Les zones
// restent modifiables ensuite depuis l'espace agence.
const DEFAULTS = require('../../public/livreur/defaults.json');

const STATUSES = {
  nouvelle: 'Nouvelle',
  confirmee: 'Confirmée',
  assignee: 'Livreur assigné',
  recuperee: 'Colis récupéré',
  en_cours: 'En cours de livraison',
  livree: 'Livrée',
  echec: 'Échec de livraison',
  reportee: 'Reportée',
  annulee: 'Annulée',
  retournee: 'Retournée à l\'expéditeur',
};

let ready = null;

async function seed() {
  const z = await db.prepare('SELECT COUNT(*) AS n FROM lv_zones').get();
  if (!Number(z && z.n)) {
    let i = 0;
    for (const { name, region, kind, delay } of DEFAULTS.zones) {
      await db.prepare('INSERT INTO lv_zones (name, region, kind, delay, active, sort) VALUES (?, ?, ?, ?, 1, ?)')
        .run(name, region, kind, delay, i++);
    }
  }

  // Compte agence d'amorçage via l'environnement (LIVREUR_ADMIN_PHONE / _PASSWORD).
  const { adminPhone, adminPassword } = config.livreur;
  if (adminPhone && adminPassword) {
    const ex = await db.prepare('SELECT id FROM lv_users WHERE phone = ?').get(adminPhone);
    if (!ex) {
      await db.prepare('INSERT INTO lv_users (role, name, phone, password_hash, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run('agence', 'Agence Karat Livreur', adminPhone, await hashPassword(adminPassword), 'active', now());
    }
  }

  // Comptes de démonstration — uniquement hors production.
  if (!config.isProd) {
    const demo = [
      ['agence', 'Agence (démo)', '22200000001', 'Karat Livreur'],
      ['partenaire', 'Boutique Démo', '22200000002', 'Boutique Démo'],
      ['coursier', 'Sidi (démo)', '22200000003', ''],
    ];
    for (const [role, name, phone, biz] of demo) {
      const ex = await db.prepare('SELECT id FROM lv_users WHERE phone = ?').get(phone);
      if (!ex) {
        await db.prepare('INSERT INTO lv_users (role, name, phone, password_hash, status, business_name, vehicle, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(role, name, phone, await hashPassword('demo1234'), 'active', biz, role === 'coursier' ? 'Moto' : '', now());
      }
    }
  }
}

function ensureReady() {
  if (!ready) {
    ready = (async () => {
      await db.exec(SCHEMA);
      // Bases créées avant le tarif par produit : ajout de la colonne.
      try { await db.exec('ALTER TABLE lv_orders ADD COLUMN items_count INTEGER NOT NULL DEFAULT 1'); } catch (_) { /* déjà présente */ }
      await seed();
    })().catch((e) => { ready = null; throw e; });
  }
  return ready;
}

// Code de suivi lisible : KL-XXXXXX (sans caractères ambigus).
function newTrackingCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += alphabet[crypto.randomInt(0, alphabet.length)];
  return 'KL-' + s;
}

function findZone(zoneId) {
  return zoneId ? db.prepare('SELECT * FROM lv_zones WHERE id = ? AND active = 1').get(zoneId) : null;
}

// Tarif unique : un prix fixe par produit livré.
function deliveryFee(itemsCount) {
  return config.livreur.feePerItem * Math.max(1, itemsCount || 1);
}

// Montant que le livreur encaisse auprès du destinataire.
function collectedAmount(o) {
  return Number(o.cod_amount || 0) + (o.fee_payer === 'destinataire' ? Number(o.fee || 0) : 0);
}
// Montant net reversé au partenaire pour une commande livrée.
function partnerNet(o) {
  return Number(o.cod_amount || 0) - (o.fee_payer === 'partenaire' ? Number(o.fee || 0) : 0);
}

async function addEvent(orderId, status, note, actor) {
  await db.prepare('INSERT INTO lv_events (order_id, status, note, actor, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(orderId, status, note || '', actor || '', now());
}

// ------------------------------------------------------------------
// Collaboration boutique Karat ↔ agence de livraison.
// Un commerçant Karat demande ; l'agence accepte ; ses commandes boutique
// sont alors transmises automatiquement à l'agence (temps réel).
// ------------------------------------------------------------------

// Agences actives disponibles (pour que le commerçant choisisse).
async function listActiveAgencies() {
  await ensureReady();
  return db.prepare("SELECT id, name, business_name, city, phone FROM lv_users WHERE role = 'agence' AND status = 'active' ORDER BY id").all();
}

// Collaboration ACCEPTÉE d'un commerçant (ou null).
async function acceptedCollabFor(merchantId) {
  if (!merchantId) return null;
  await ensureReady();
  return db.prepare("SELECT * FROM lv_collabs WHERE merchant_id = ? AND status = 'accepted' ORDER BY id DESC").get(merchantId);
}

// Toutes les collaborations d'un commerçant (pour afficher l'état côté boutique).
async function collabsForMerchant(merchantId) {
  await ensureReady();
  return db.prepare('SELECT * FROM lv_collabs WHERE merchant_id = ? ORDER BY id DESC').all(merchantId);
}

// Crée une commande de livraison à partir d'une commande boutique Karat.
// Non bloquant pour la boutique : l'appelant protège toujours par try/catch.
async function createBoutiqueOrder({ merchant, order }) {
  await ensureReady();
  const itemsCount = Math.min(999, Math.max(1, Math.round(Number(order.items_count) || 1)));
  const t = now();
  const o = {
    code: newTrackingCode(),
    source: 'boutique',
    partner_id: null,
    service: 'ecommerce',
    sender_name: String(merchant.shop_name || 'Boutique').slice(0, 120),
    sender_phone: String(merchant.pickup_phone || merchant.phone || '').replace(/[^0-9]/g, ''),
    pickup_address: String(merchant.pickup_address || '').slice(0, 300),
    recipient_name: String(order.customer || '').slice(0, 120),
    recipient_phone: String(order.phone || '').replace(/[^0-9]/g, ''),
    address: String(order.address || order.city || '').slice(0, 300),
    zone_id: null,
    zone_name: String(order.city || '').slice(0, 120),
    description: String(order.description || '').slice(0, 500),
    stock_id: null,
    stock_qty: 0,
    items_count: itemsCount,
    cod_amount: Math.max(0, Math.round(Number(order.total) || 0)),
    fee: deliveryFee(itemsCount),
    fee_payer: 'destinataire',
    scheduled_for: '',
    received_by: '',
    note: 'Commande boutique Karat' + (order.ref ? ' · Réf ' + order.ref : ''),
  };
  const cols = Object.keys(o);
  const r = await db.prepare(`INSERT INTO lv_orders (${cols.join(', ')}, status, created_at, updated_at) VALUES (${cols.map(() => '?').join(', ')}, 'nouvelle', ?, ?)`)
    .run(...cols.map((k) => o[k]), t, t);
  await addEvent(r.lastInsertRowid, 'nouvelle', 'Commande reçue depuis la boutique Karat', o.sender_name);
  return r.lastInsertRowid;
}

module.exports = {
  db, now, today, ensureReady, newTrackingCode, findZone, deliveryFee, collectedAmount, partnerNet, addEvent,
  STATUSES, listActiveAgencies, acceptedCollabFor, collabsForMerchant, createBoutiqueOrder,
};
