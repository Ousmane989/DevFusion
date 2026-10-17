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
    service TEXT NOT NULL DEFAULT 'standard',
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
`;

// Villes, tarifs de départ et services : public/livreur/defaults.json, fichier
// partagé avec la page d'accueil (qui s'en sert si l'API est injoignable).
// Les tarifs restent modifiables ensuite depuis l'espace agence.
const DEFAULTS = require('../../public/livreur/defaults.json');
const SERVICES = DEFAULTS.services;

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
    for (const { name, region, kind, price, delay } of DEFAULTS.zones) {
      await db.prepare('INSERT INTO lv_zones (name, region, kind, price, delay, active, sort) VALUES (?, ?, ?, ?, ?, 1, ?)')
        .run(name, region, kind, price, delay, i++);
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

async function computeFee(zoneId, service) {
  const zone = zoneId ? await db.prepare('SELECT * FROM lv_zones WHERE id = ? AND active = 1').get(zoneId) : null;
  if (!zone) return null;
  const svc = SERVICES[service] || SERVICES.standard;
  return { zone, fee: Number(zone.price) + svc.extra };
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

module.exports = {
  db, now, today, ensureReady, newTrackingCode, computeFee, collectedAmount, partnerNet, addEvent,
  SERVICES, STATUSES,
};
