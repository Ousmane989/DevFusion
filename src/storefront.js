'use strict';

// ------------------------------------------------------------------
// Rendu de la vitrine cote serveur : recherche d'une boutique par slug
// et injection des balises Open Graph / Twitter dans boutique.html pour
// un apercu riche lors du partage sur Facebook / Instagram / WhatsApp.
// ------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const db = require('./db');
const { slugify } = require('./catalog');

const BOUTIQUE_HTML = path.join(__dirname, '..', 'public', 'boutique.html');

// Resout une boutique par slug personnalise, puis par nom slugifie.
async function findStore(slug) {
  const custom = await db.prepare("SELECT user_id FROM store_settings WHERE slug = ? AND slug != ''").get(slug);
  let user = null;
  if (custom) user = await db.prepare('SELECT * FROM users WHERE id = ? AND email_verified = 1').get(custom.user_id);
  if (!user) {
    const users = await db.prepare('SELECT * FROM users WHERE email_verified = 1').all();
    user = users.find((u) => slugify(u.shop_name) === slug) || null;
  }
  if (!user) return null;
  const settings = await db.prepare('SELECT * FROM store_settings WHERE user_id = ?').get(user.id);
  return { user, settings };
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Renvoie le HTML de la vitrine avec les balises meta sociales injectees.
async function renderStorefrontHtml(slug, base) {
  let html = fs.readFileSync(BOUTIQUE_HTML, 'utf8');
  const store = await findStore(slug);
  if (!store) return html; // la page cliente affichera « boutique introuvable »

  const { user, settings } = store;
  const name = user.shop_name;
  const title = (settings && settings.hero_title) || name;
  const desc = (settings && (settings.description || settings.tagline)) || 'Boutique en ligne — paiement à la livraison.';
  const url = base + '/boutique/' + (settings && settings.slug ? settings.slug : slugify(name));
  // og:image : banniere/logo si URL http(s), sinon premiere photo produit
  // (Meta refuse les data URL, on ne garde donc que les URL http).
  const httpOnly = (v) => (/^https?:\/\//i.test(v || '') ? v : '');
  const prod = await db.prepare("SELECT image FROM products WHERE user_id = ? AND active = 1 AND image LIKE 'http%' ORDER BY id DESC LIMIT 1").get(user.id);
  const image = httpOnly(settings && settings.banner) || httpOnly(settings && settings.logo) || (prod ? prod.image : '');

  const tags = [
    '<meta property="og:type" content="website" />',
    `<meta property="og:site_name" content="${esc(name)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    image ? `<meta property="og:image" content="${esc(image)}" />` : '',
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(desc)}" />`,
    image ? `<meta name="twitter:image" content="${esc(image)}" />` : '',
    `<meta name="description" content="${esc(desc)}" />`,
  ].filter(Boolean).join('\n  ');

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(name)} — Boutique</title>`);
  html = html.replace('</head>', '  ' + tags + '\n</head>');
  return html;
}

module.exports = { findStore, renderStorefrontHtml };
