'use strict';

// Comptabilite : chiffre d'affaires (commandes livrees), depenses, benefice.
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware');

const router = express.Router();

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const EXPENSE_CATEGORIES = ['Achat de stock', 'Livraison', 'Publicité', 'Salaires', 'Loyer', 'Autre'];

function monthKey(d) { return d.toISOString().slice(0, 7); }

function buildFinance(userId, currency) {
  const orders = db.prepare("SELECT total_mru, created_at FROM orders WHERE user_id = ? AND status = 'livree'").all(userId)
    .map((o) => ({ total: o.total_mru, d: new Date(String(o.created_at).replace(' ', 'T') + 'Z') }));
  const expenses = db.prepare('SELECT id, label, category, amount_mru, spent_on FROM expenses WHERE user_id = ? ORDER BY spent_on DESC, id DESC').all(userId);

  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const expenseTotal = expenses.reduce((s, e) => s + e.amount_mru, 0);
  const profit = revenue - expenseTotal;
  const margin = revenue ? Number(((profit / revenue) * 100).toFixed(1)) : 0;

  // 12 derniers mois : CA vs depenses.
  const now = new Date();
  const buckets = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    buckets.push({ key: monthKey(d), label: MONTHS[d.getUTCMonth()], revenue: 0, expense: 0 });
  }
  const idx = {}; buckets.forEach((b) => (idx[b.key] = b));
  orders.forEach((o) => { const b = idx[monthKey(o.d)]; if (b) b.revenue += o.total; });
  expenses.forEach((e) => { const k = String(e.spent_on).slice(0, 7); if (idx[k]) idx[k].expense += e.amount_mru; });

  return {
    currency,
    summary: { revenue, expenses: expenseTotal, profit, margin, ordersCount: orders.length },
    monthly: buckets.map((b) => ({ label: b.label, revenue: b.revenue, expense: b.expense, profit: b.revenue - b.expense })),
    expenses,
    categories: EXPENSE_CATEGORIES,
  };
}

// GET /api/finance — synthese + depenses
router.get('/', requireAuth, (req, res) => {
  res.json(buildFinance(req.user.id, req.user.currency || 'MRU'));
});

// POST /api/finance/expense  { label, category, amount, date }
router.post('/expense', requireAuth, (req, res) => {
  const b = req.body || {};
  const label = String(b.label || '').trim().slice(0, 120);
  const amount = Math.max(0, Math.round(Number(b.amount) || 0));
  const category = EXPENSE_CATEGORIES.includes(b.category) ? b.category : 'Autre';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : new Date().toISOString().slice(0, 10);
  const errors = {};
  if (label.length < 2) errors.label = 'Libellé requis.';
  if (!(amount > 0)) errors.amount = 'Montant invalide.';
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  db.prepare('INSERT INTO expenses (user_id, label, category, amount_mru, spent_on) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.id, label, category, amount, date);
  res.status(201).json(buildFinance(req.user.id, req.user.currency || 'MRU'));
});

// DELETE /api/finance/expense/:id
router.delete('/expense/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json(buildFinance(req.user.id, req.user.currency || 'MRU'));
});

// GET /api/finance/export.csv — export comptable (commandes livrees + depenses)
router.get('/export.csv', requireAuth, (req, res) => {
  const currency = req.user.currency || 'MRU';
  const cell = (v) => { const s = String(v == null ? '' : v).replace(/"/g, '""').replace(/[\r\n]+/g, ' '); return /[",]/.test(s) ? `"${s}"` : s; };
  const rows = [['type', 'date', 'libelle', 'categorie', 'entree_' + currency, 'sortie_' + currency]];
  db.prepare("SELECT ref, total_mru, created_at FROM orders WHERE user_id = ? AND status = 'livree' ORDER BY created_at").all(req.user.id)
    .forEach((o) => rows.push(['vente', String(o.created_at).slice(0, 10), o.ref, 'Commande livrée', o.total_mru, '']));
  db.prepare('SELECT label, category, amount_mru, spent_on FROM expenses WHERE user_id = ? ORDER BY spent_on').all(req.user.id)
    .forEach((e) => rows.push(['depense', e.spent_on, e.label, e.category, '', e.amount_mru]));
  const csv = rows.map((r) => r.map(cell).join(',')).join('\n');
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', 'attachment; filename="comptabilite-karat.csv"');
  res.send(csv);
});

module.exports = router;
