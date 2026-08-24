'use strict';

// ------------------------------------------------------------------
// Couche base de données — interface ASYNCHRONE unifiée.
//   • Si DATABASE_URL est défini  -> PostgreSQL (Supabase, pour Vercel).
//   • Sinon                       -> SQLite local (développement/tests).
// Les deux exposent la même API : db.prepare(sql).get/all/run(...args)
// (toutes asynchrones) et db.exec(sql). Le SQL des routes reste identique
// (placeholders `?`, `datetime('now')`), le pilote Postgres le traduit.
// ------------------------------------------------------------------

const usePg = !!process.env.DATABASE_URL;

// Traduit le SQL « SQLite » vers Postgres : datetime('now') -> karat_now(),
// date('now') -> karat_today(), et placeholders ? -> $1, $2, …
function toPgText(text) {
  let t = String(text)
    .replace(/datetime\('now'\)/gi, 'karat_now()')
    .replace(/date\('now'\)/gi, 'karat_today()');
  let i = 0;
  t = t.replace(/\?/g, () => '$' + (++i));
  return t;
}

let db;

if (usePg) {
  const postgres = require('postgres');
  const sql = postgres(process.env.DATABASE_URL, {
    ssl: 'require',
    prepare: false, // compatible avec le pooler « transaction » de Supabase
    max: Number(process.env.PG_POOL_MAX || 3),
    idle_timeout: 20,
    connect_timeout: 15,
  });

  db = {
    prepare(text) {
      const pg = toPgText(text);
      const isInsert = /^\s*insert\s/i.test(pg);
      return {
        async get(...args) { const r = await sql.unsafe(pg, args); return r[0]; },
        async all(...args) { return Array.from(await sql.unsafe(pg, args)); },
        async run(...args) {
          try {
            const q = isInsert && !/returning/i.test(pg) ? pg + ' RETURNING id' : pg;
            const r = await sql.unsafe(q, args);
            return { changes: r.count != null ? r.count : r.length, lastInsertRowid: r[0] ? r[0].id : undefined };
          } catch (e) {
            // Certaines tables n'ont pas de colonne « id » (ex. store_settings,
            // clé primaire user_id) : on réessaie sans le RETURNING id ajouté.
            if (isInsert && /column "id" does not exist/i.test(String(e && e.message))) {
              const r = await sql.unsafe(pg, args);
              return { changes: r.count != null ? r.count : r.length, lastInsertRowid: undefined };
            }
            throw e;
          }
        },
      };
    },
    async exec(text) { await sql.unsafe(String(text)); },
    _driver: 'postgres',
    _sql: sql,
  };
} else {
  const path = require('path');
  const fs = require('fs');
  const Database = require('better-sqlite3');

  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const sdb = new Database(path.join(dataDir, 'karat.sqlite'));
  sdb.pragma('journal_mode = WAL');
  sdb.pragma('foreign_keys = ON');
  initSqliteSchema(sdb);

  db = {
    prepare(text) {
      const st = sdb.prepare(text);
      return {
        async get(...args) { return st.get(...args); },
        async all(...args) { return st.all(...args); },
        async run(...args) { return st.run(...args); },
      };
    },
    async exec(text) { sdb.exec(text); },
    _driver: 'sqlite',
    _sqlite: sdb,
  };
}

function initSqliteSchema(sdb) {
  sdb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, phone TEXT NOT NULL,
      shop_name TEXT NOT NULL, password_hash TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'pro', status TEXT NOT NULL DEFAULT 'pending',
      email_verified INTEGER NOT NULL DEFAULT 0,
      trial_ends_at TEXT, subscription_ends_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      country TEXT NOT NULL DEFAULT 'MR', currency TEXT NOT NULL DEFAULT 'MRU'
    );
    CREATE TABLE IF NOT EXISTS verification_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL, code_hash TEXT NOT NULL, purpose TEXT NOT NULL,
      expires_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_codes_user ON verification_codes(user_id, purpose);
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
      name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
      price_mru INTEGER NOT NULL DEFAULT 0, stock INTEGER NOT NULL DEFAULT 0,
      category TEXT NOT NULL DEFAULT 'Autre', active INTEGER NOT NULL DEFAULT 1,
      image TEXT NOT NULL DEFAULT '', subtitle TEXT NOT NULL DEFAULT '',
      compare_at_mru INTEGER NOT NULL DEFAULT 0, rating REAL NOT NULL DEFAULT 0,
      reviews_count INTEGER NOT NULL DEFAULT 0, variants TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
      ref TEXT NOT NULL, customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL DEFAULT '', city TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '',
      items_json TEXT NOT NULL DEFAULT '[]',
      subtotal_mru INTEGER NOT NULL DEFAULT 0, shipping_mru INTEGER NOT NULL DEFAULT 0,
      total_mru INTEGER NOT NULL DEFAULT 0, payment TEXT NOT NULL DEFAULT 'cod',
      status TEXT NOT NULL DEFAULT 'nouvelle',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE TABLE IF NOT EXISTS store_settings (
      user_id INTEGER PRIMARY KEY, theme TEXT NOT NULL DEFAULT 'or-noir',
      tagline TEXT NOT NULL DEFAULT '', domain TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
      whatsapp TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '', shipping_json TEXT NOT NULL DEFAULT '',
      hero_title TEXT NOT NULL DEFAULT '', about TEXT NOT NULL DEFAULT '',
      slug TEXT NOT NULL DEFAULT '', meta_pixel_id TEXT NOT NULL DEFAULT '',
      fb_page TEXT NOT NULL DEFAULT '', instagram TEXT NOT NULL DEFAULT '',
      wave_number TEXT NOT NULL DEFAULT '', om_number TEXT NOT NULL DEFAULT '',
      logo TEXT NOT NULL DEFAULT '', banner TEXT NOT NULL DEFAULT '',
      returns_policy TEXT NOT NULL DEFAULT '',
      meta_domain_verification TEXT NOT NULL DEFAULT '',
      meta_pixel_active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS store_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
      type TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'direct',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_events_user ON store_events(user_id, type);
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
      label TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT 'Autre',
      amount_mru INTEGER NOT NULL DEFAULT 0,
      spent_on TEXT NOT NULL DEFAULT (date('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
      label TEXT NOT NULL DEFAULT '', prefix TEXT NOT NULL, key_hash TEXT NOT NULL,
      last_used_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_apikeys_user ON api_keys(user_id);
    CREATE TABLE IF NOT EXISTS webhooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
      url TEXT NOT NULL, events TEXT NOT NULL DEFAULT 'order.created,order.updated',
      secret TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks(user_id);
    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
      endpoint TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (user_id, endpoint),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
  `);
}

module.exports = db;
