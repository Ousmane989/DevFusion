'use strict';

// Accès à PostgreSQL via un pool de connexions.
// Usage : const { query, one, tx } = require('./db');
//   await query('SELECT … WHERE id = $1', [id])  -> tableau de lignes
//   await one('SELECT …', [..])                   -> première ligne ou undefined
//   await tx(async (c) => { await c.query(...) }) -> transaction
const fs = require('fs');
const path = require('path');
const { Pool, types } = require('pg');
const config = require('./config');

// NUMERIC -> nombre JavaScript ; DATE -> chaîne « AAAA-MM-JJ » (pas de décalage horaire).
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
types.setTypeParser(1082, (v) => v);
types.setTypeParser(20, (v) => parseInt(v, 10)); // COUNT(*) (bigint)

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
  max: Number(process.env.PG_POOL_MAX || 10),
});

async function query(text, params = []) {
  const r = await pool.query(text, params);
  return r.rows;
}

async function one(text, params = []) {
  const r = await pool.query(text, params);
  return r.rows[0];
}

async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const helper = {
      query: async (t, p = []) => (await client.query(t, p)).rows,
      one: async (t, p = []) => (await client.query(t, p)).rows[0],
    };
    const res = await fn(helper);
    await client.query('COMMIT');
    return res;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Crée / met à jour les tables (script idempotent).
async function migrer() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  await pool.query(sql);
}

module.exports = { pool, query, one, tx, migrer };
