'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// Le dossier `data/` contient la base SQLite. Il est cree au besoin.
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'karat.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ------------------------------------------------------------------
// Schema
// ------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    name                 TEXT    NOT NULL,
    email                TEXT    NOT NULL UNIQUE,
    phone                TEXT    NOT NULL,
    shop_name            TEXT    NOT NULL,
    password_hash        TEXT    NOT NULL,
    plan                 TEXT    NOT NULL DEFAULT 'pro',
    -- statut du compte : pending | trial | active | locked
    status               TEXT    NOT NULL DEFAULT 'pending',
    email_verified       INTEGER NOT NULL DEFAULT 0,
    trial_ends_at        TEXT,
    subscription_ends_at TEXT,
    created_at           TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS verification_codes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    code_hash   TEXT    NOT NULL,
    purpose     TEXT    NOT NULL,          -- 'email' | 'reset'
    expires_at  TEXT    NOT NULL,
    attempts    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_codes_user ON verification_codes(user_id, purpose);

  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    name        TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    price_mru   INTEGER NOT NULL DEFAULT 0,
    stock       INTEGER NOT NULL DEFAULT 0,
    category    TEXT    NOT NULL DEFAULT 'Autre',
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);

  -- Commandes passees par les clients (paiement a la livraison).
  CREATE TABLE IF NOT EXISTS orders (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL,          -- le commercant proprietaire
    ref            TEXT    NOT NULL,
    customer_name  TEXT    NOT NULL,
    customer_phone TEXT    NOT NULL DEFAULT '',
    city           TEXT    NOT NULL DEFAULT '',
    address        TEXT    NOT NULL DEFAULT '',
    note           TEXT    NOT NULL DEFAULT '',
    items_json     TEXT    NOT NULL DEFAULT '[]',
    subtotal_mru   INTEGER NOT NULL DEFAULT 0,
    shipping_mru   INTEGER NOT NULL DEFAULT 0,
    total_mru      INTEGER NOT NULL DEFAULT 0,
    payment        TEXT    NOT NULL DEFAULT 'cod',   -- cod = paiement a la livraison
    status         TEXT    NOT NULL DEFAULT 'nouvelle',
    created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);

  -- Une ligne de reglages de boutique par utilisateur (theme, livraison, contact...).
  CREATE TABLE IF NOT EXISTS store_settings (
    user_id       INTEGER PRIMARY KEY,
    theme         TEXT NOT NULL DEFAULT 'or-noir',
    tagline       TEXT NOT NULL DEFAULT '',
    domain        TEXT NOT NULL DEFAULT '',
    description   TEXT NOT NULL DEFAULT '',
    phone         TEXT NOT NULL DEFAULT '',
    whatsapp      TEXT NOT NULL DEFAULT '',
    email         TEXT NOT NULL DEFAULT '',
    address       TEXT NOT NULL DEFAULT '',
    shipping_json TEXT NOT NULL DEFAULT '',
    updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Evenements de la vitrine (analytics reels : visites, ajouts au panier).
  CREATE TABLE IF NOT EXISTS store_events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    type       TEXT    NOT NULL,          -- 'visit' | 'add_cart'
    source     TEXT    NOT NULL DEFAULT 'direct',
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_events_user ON store_events(user_id, type);
`);

// Migrations douces pour les bases existantes (colonnes de contact).
for (const col of ['phone', 'whatsapp', 'email', 'address']) {
  try { db.exec(`ALTER TABLE store_settings ADD COLUMN ${col} TEXT NOT NULL DEFAULT ''`); } catch (_) { /* deja presente */ }
}
// Pays + devise du commercant (MR -> MRU, SN -> FCFA).
try { db.exec("ALTER TABLE users ADD COLUMN country TEXT NOT NULL DEFAULT 'MR'"); } catch (_) { /* deja presente */ }
try { db.exec("ALTER TABLE users ADD COLUMN currency TEXT NOT NULL DEFAULT 'MRU'"); } catch (_) { /* deja presente */ }
// Contenu editable de la vitrine (au-dela du theme) + slug personnalise.
for (const col of ['hero_title', 'about', 'slug']) {
  try { db.exec(`ALTER TABLE store_settings ADD COLUMN ${col} TEXT NOT NULL DEFAULT ''`); } catch (_) { /* deja presente */ }
}
// Photo du produit (URL ou data URL).
try { db.exec("ALTER TABLE products ADD COLUMN image TEXT NOT NULL DEFAULT ''"); } catch (_) { /* deja presente */ }
// Fiche produit enrichie : accroche courte, prix barre (promo), note, avis, variantes.
try { db.exec("ALTER TABLE products ADD COLUMN subtitle TEXT NOT NULL DEFAULT ''"); } catch (_) { /* deja presente */ }
try { db.exec("ALTER TABLE products ADD COLUMN compare_at_mru INTEGER NOT NULL DEFAULT 0"); } catch (_) { /* deja presente */ }
try { db.exec("ALTER TABLE products ADD COLUMN rating REAL NOT NULL DEFAULT 0"); } catch (_) { /* deja presente */ }
try { db.exec("ALTER TABLE products ADD COLUMN reviews_count INTEGER NOT NULL DEFAULT 0"); } catch (_) { /* deja presente */ }
try { db.exec("ALTER TABLE products ADD COLUMN variants TEXT NOT NULL DEFAULT ''"); } catch (_) { /* deja presente */ }
// Politique de retours affichee sur la fiche produit.
try { db.exec("ALTER TABLE store_settings ADD COLUMN returns_policy TEXT NOT NULL DEFAULT ''"); } catch (_) { /* deja presente */ }
// Marketing : Pixel Meta (Facebook/Instagram) + liens sociaux pour les campagnes.
for (const col of ['meta_pixel_id', 'fb_page', 'instagram']) {
  try { db.exec(`ALTER TABLE store_settings ADD COLUMN ${col} TEXT NOT NULL DEFAULT ''`); } catch (_) { /* deja presente */ }
}
// Paiement mobile (Wave / Orange Money) affiche sur la boutique.
for (const col of ['wave_number', 'om_number']) {
  try { db.exec(`ALTER TABLE store_settings ADD COLUMN ${col} TEXT NOT NULL DEFAULT ''`); } catch (_) { /* deja presente */ }
}
// Personnalisation visuelle : logo et image de banniere (URL ou data URL).
for (const col of ['logo', 'banner']) {
  try { db.exec(`ALTER TABLE store_settings ADD COLUMN ${col} TEXT NOT NULL DEFAULT ''`); } catch (_) { /* deja presente */ }
}

// ------------------------------------------------------------------
// Comptabilite : depenses saisies par le commercant.
// ------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    label      TEXT    NOT NULL DEFAULT '',
    category   TEXT    NOT NULL DEFAULT 'Autre',
    amount_mru INTEGER NOT NULL DEFAULT 0,
    spent_on   TEXT    NOT NULL DEFAULT (date('now')),
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);

  -- Cles API (acces programmatique) : on ne stocke que le hash.
  CREATE TABLE IF NOT EXISTS api_keys (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL,
    label        TEXT    NOT NULL DEFAULT '',
    prefix       TEXT    NOT NULL,
    key_hash     TEXT    NOT NULL,
    last_used_at TEXT,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_apikeys_user ON api_keys(user_id);

  -- Webhooks : URL notifiees lors des evenements de commande.
  CREATE TABLE IF NOT EXISTS webhooks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    url        TEXT    NOT NULL,
    events     TEXT    NOT NULL DEFAULT 'order.created,order.updated',
    secret     TEXT    NOT NULL DEFAULT '',
    active     INTEGER NOT NULL DEFAULT 1,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks(user_id);
`);

module.exports = db;
