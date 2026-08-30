'use strict';

// ------------------------------------------------------------------
// Espace administrateur du SaaS.
// Réservé aux comptes dont l'e-mail figure dans ADMIN_EMAILS (config).
// Permet de lister toutes les personnes inscrites, leurs coordonnées et
// de savoir si leur abonnement est à jour.
// ------------------------------------------------------------------
const express = require('express');
const db = require('../db');
const { PLANS, isoIn, getUserById, getUserByEmail } = require('../account');
const { requireAuth, requireAdmin } = require('../middleware');
const { verifyPassword, signSession, setSessionCookie } = require('../auth');
const { config, isAdminUser } = require('../config');

const router = express.Router();

// ------------------------------------------------------------------
// POST /api/admin/login — connexion DÉDIÉE à l'espace administrateur.
// Réussit uniquement pour un compte administrateur (sinon 403), même si
// les identifiants client sont valides. Définie AVANT le garde-fou admin.
// ------------------------------------------------------------------
router.post('/login', async (req, res) => {
  const email = String(req.body?.email || '');
  const password = String(req.body?.password || '');
  const user = await getUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return res.status(401).json({ error: 'E-mail ou mot de passe incorrect.' });
  }
  if (!isAdminUser(user)) {
    return res.status(403).json({ error: 'Ce compte n\'est pas administrateur.' });
  }
  setSessionCookie(res, signSession(user));
  res.json({ ok: true, email: user.email });
});

// À partir d'ici : accès réservé aux administrateurs authentifiés.
router.use(requireAuth, requireAdmin);

// GET /api/admin/settings — réglages de l'espace admin.
router.get('/settings', async (_req, res, next) => {
  try {
    const row = await db.prepare("SELECT value FROM app_config WHERE key = 'admin_whatsapp'").get();
    res.json({ ok: true, whatsapp: (row && row.value) || config.adminWhatsapp });
  } catch (err) { next(err); }
});

// PUT /api/admin/settings { whatsapp } — modifie le numéro WhatsApp d'activation.
router.put('/settings', async (req, res, next) => {
  try {
    const num = String(req.body?.whatsapp || '').replace(/[^0-9]/g, '');
    if (num.length < 8) return res.status(400).json({ errors: { whatsapp: 'Numéro WhatsApp invalide (format international).' } });
    await db.prepare(
      "INSERT INTO app_config (key, value) VALUES ('admin_whatsapp', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).run(num);
    res.json({ ok: true, whatsapp: num });
  } catch (err) { next(err); }
});

// État d'abonnement lisible pour un compte (« à jour » ou non).
function billingState(u) {
  const now = Date.now();
  const end = (v) => (v ? new Date(v).getTime() : null);
  if (u.status === 'active') {
    const e = end(u.subscription_ends_at);
    if (!e || e > now) return { upToDate: true, label: 'À jour', state: 'active' };
    return { upToDate: false, label: 'Abonnement expiré', state: 'expired' };
  }
  if (u.status === 'trial') {
    const e = end(u.trial_ends_at);
    if (e && e > now) return { upToDate: true, label: 'Essai en cours', state: 'trial' };
    return { upToDate: false, label: 'Essai expiré', state: 'trial_expired' };
  }
  if (u.status === 'locked') return { upToDate: false, label: 'Bloqué', state: 'locked' };
  return { upToDate: false, label: 'En attente', state: 'pending' };
}

// GET /api/admin/users — tous les comptes inscrits + coordonnées + à jour.
router.get('/users', async (_req, res, next) => {
  try {
    const users = await db.prepare('SELECT * FROM users ORDER BY created_at ASC').all();

    // Comptes par nombre de produits / commandes (par boutique = user_id).
    const prodRows = await db.prepare('SELECT user_id, COUNT(*) AS n FROM products GROUP BY user_id').all();
    const ordRows = await db.prepare('SELECT user_id, COUNT(*) AS n FROM orders GROUP BY user_id').all();
    const prodBy = new Map(prodRows.map((r) => [Number(r.user_id), Number(r.n)]));
    const ordBy = new Map(ordRows.map((r) => [Number(r.user_id), Number(r.n)]));

    // Regroupe les boutiques filles sous leur compte principal.
    const children = new Map(); // owner_id -> [users]
    for (const u of users) {
      if (u.owner_id) {
        const arr = children.get(Number(u.owner_id)) || [];
        arr.push(u);
        children.set(Number(u.owner_id), arr);
      }
    }

    const accounts = users
      // Comptes clients uniquement : on exclut les comptes administrateurs
      // (ce ne sont pas des boutiques) et les boutiques filles.
      .filter((u) => !u.owner_id && !isAdminUser(u))
      .map((u) => {
        const kids = children.get(Number(u.id)) || [];
        const shopIds = [u.id, ...kids.map((k) => k.id)];
        const products = shopIds.reduce((s, id) => s + (prodBy.get(Number(id)) || 0), 0);
        const orders = shopIds.reduce((s, id) => s + (ordBy.get(Number(id)) || 0), 0);
        const plan = PLANS[u.plan] || PLANS.pro;
        const b = billingState(u);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          shopName: u.shop_name,
          country: u.country || 'MR',
          currency: u.currency || 'MRU',
          plan: plan.id,
          planName: plan.name,
          status: u.status,
          emailVerified: Boolean(u.email_verified),
          upToDate: b.upToDate,
          billingLabel: b.label,
          billingState: b.state,
          trialEndsAt: u.trial_ends_at,
          subscriptionEndsAt: u.subscription_ends_at,
          createdAt: u.created_at,
          shopsCount: shopIds.length,
          shops: kids.map((k) => ({ id: k.id, shopName: k.shop_name, slugName: k.name })),
          products,
          orders,
        };
      });

    const summary = {
      accounts: accounts.length,
      // Total des boutiques clientes (comptes clients + leurs boutiques filles),
      // hors comptes administrateurs.
      shops: accounts.reduce((s, a) => s + a.shopsCount, 0),
      upToDate: accounts.filter((a) => a.upToDate).length,
      overdue: accounts.filter((a) => !a.upToDate).length,
      byCountry: accounts.reduce((m, a) => ((m[a.country] = (m[a.country] || 0) + 1), m), {}),
    };

    res.json({ ok: true, summary, users: accounts });
  } catch (err) {
    next(err);
  }
});

// Applique une action d'abonnement à un compte principal (owner_id NULL).
async function loadAccount(id) {
  const u = await getUserById(id);
  if (!u || u.owner_id) return null; // seulement les comptes de connexion
  return u;
}

// POST /api/admin/users/:id/activate { days } — réactive l'abonnement.
router.post('/users/:id/activate', async (req, res, next) => {
  try {
    const u = await loadAccount(Number(req.params.id));
    if (!u) return res.status(404).json({ error: 'Compte introuvable.' });
    const days = Math.min(3650, Math.max(1, Number(req.body?.days) || 30));
    await db.prepare(
      "UPDATE users SET status = 'active', subscription_ends_at = ? WHERE id = ?"
    ).run(isoIn(days), u.id);
    const fresh = await getUserById(u.id);
    res.json({ ok: true, days, status: fresh.status, subscriptionEndsAt: fresh.subscription_ends_at });
  } catch (err) { next(err); }
});

// POST /api/admin/users/:id/trial { days } — (re)met le compte en essai.
router.post('/users/:id/trial', async (req, res, next) => {
  try {
    const u = await loadAccount(Number(req.params.id));
    if (!u) return res.status(404).json({ error: 'Compte introuvable.' });
    const days = Math.min(365, Math.max(1, Number(req.body?.days) || 3));
    await db.prepare(
      "UPDATE users SET status = 'trial', trial_ends_at = ? WHERE id = ?"
    ).run(isoIn(days), u.id);
    const fresh = await getUserById(u.id);
    res.json({ ok: true, days, status: fresh.status, trialEndsAt: fresh.trial_ends_at });
  } catch (err) { next(err); }
});

// POST /api/admin/users/:id/lock — verrouille immédiatement le compte.
router.post('/users/:id/lock', async (req, res, next) => {
  try {
    const u = await loadAccount(Number(req.params.id));
    if (!u) return res.status(404).json({ error: 'Compte introuvable.' });
    await db.prepare("UPDATE users SET status = 'locked' WHERE id = ?").run(u.id);
    res.json({ ok: true, status: 'locked' });
  } catch (err) { next(err); }
});

// DELETE /api/admin/users/:id — supprime définitivement un compte et toutes
// ses boutiques/produits/commandes (cascade). Un compte administrateur ne
// peut pas être supprimé depuis ici (garde-fou anti-verrouillage).
router.delete('/users/:id', async (req, res, next) => {
  try {
    const u = await loadAccount(Number(req.params.id));
    if (!u) return res.status(404).json({ error: 'Compte introuvable.' });
    if (isAdminUser(u)) return res.status(403).json({ error: 'Un compte administrateur ne peut pas être supprimé ici.' });
    await db.prepare('DELETE FROM users WHERE id = ?').run(u.id); // cascade
    res.json({ ok: true, deleted: u.id });
  } catch (err) { next(err); }
});

// PUT /api/admin/products/:id/images { images:[...] } — définit la galerie
// (1 à 3 images) d'un produit. Réservé à l'administrateur.
router.put('/products/:id/images', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const row = await db.prepare('SELECT id FROM products WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'Produit introuvable.' });
    const raw = Array.isArray(req.body && req.body.images) ? req.body.images : [];
    const imgs = raw
      .map((s) => String(s || '').trim())
      .filter((s) => s && s.length <= 720000 && (/^https?:\/\//i.test(s) || /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(s)))
      .slice(0, 3);
    await db.prepare('UPDATE products SET image = ?, images = ? WHERE id = ?')
      .run(imgs[0] || '', JSON.stringify(imgs), id);
    res.json({ ok: true, count: imgs.length });
  } catch (err) { next(err); }
});

module.exports = router;
