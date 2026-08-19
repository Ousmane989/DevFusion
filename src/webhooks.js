'use strict';

// ------------------------------------------------------------------
// Webhooks : notifie les URL enregistrees lors des evenements de commande.
// Livraison « best-effort » (non bloquante) avec signature HMAC facultative.
// ------------------------------------------------------------------
const crypto = require('crypto');
const db = require('./db');

function listWebhooks(userId) {
  return db.prepare('SELECT * FROM webhooks WHERE user_id = ? ORDER BY id DESC').all(userId);
}

async function deliver(hook, event, payload) {
  if (typeof fetch !== 'function') return { ok: false, error: 'fetch indisponible' };
  const body = JSON.stringify({ event, data: payload, at: new Date().toISOString() });
  const headers = { 'Content-Type': 'application/json', 'X-Karat-Event': event };
  if (hook.secret) {
    headers['X-Karat-Signature'] = crypto.createHmac('sha256', hook.secret).update(body).digest('hex');
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(hook.url, { method: 'POST', headers, body, signal: ctrl.signal });
    clearTimeout(timer);
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : String(err) };
  }
}

// Diffuse un evenement a tous les webhooks actifs abonnes (non bloquant).
function fireWebhooks(userId, event, payload) {
  let hooks;
  try { hooks = db.prepare('SELECT * FROM webhooks WHERE user_id = ? AND active = 1').all(userId); }
  catch { return; }
  for (const h of hooks) {
    const events = String(h.events || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (events.length && !events.includes(event) && !events.includes('*')) continue;
    deliver(h, event, payload); // pas de await : on ne bloque pas la requete
  }
}

module.exports = { listWebhooks, fireWebhooks, deliver };
