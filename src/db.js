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
`);

module.exports = db;
