'use strict';

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware');
const { THEMES, themeById, defaultShipping, slugify } = require('../catalog');
const { config } = require('../config');

const router = express.Router();

// Slug effectif d'une boutique : personnalise ou derive du nom.
function effectiveSlug(user, row) {
  return (row && row.slug) ? row.slug : slugify(user.shop_name);
}

// Un slug est-il deja pris par une autre boutique ?
async function slugTaken(candidate, userId) {
  const custom = await db.prepare('SELECT user_id FROM store_settings WHERE slug = ? AND slug != \'\' AND user_id != ?').get(candidate, userId);
  if (custom) return true;
  // Boutiques sans slug personnalise : on compare au nom slugifie.
  const others = await db.prepare(
    `SELECT u.shop_name FROM users u LEFT JOIN store_settings s ON s.user_id = u.id
     WHERE u.id != ? AND (s.slug IS NULL OR s.slug = '')`
  ).all(userId);
  return others.some((o) => slugify(o.shop_name) === candidate);
}

// Recupere (ou cree a la volee) les reglages de boutique d'un utilisateur.
async function getSettings(user) {
  let row = await db.prepare('SELECT * FROM store_settings WHERE user_id = ?').get(user.id);
  if (!row) {
    await db.prepare('INSERT INTO store_settings (user_id, tagline, shipping_json) VALUES (?, ?, ?)').run(
      user.id,
      'Des produits de qualité, livrés près de chez vous.',
      JSON.stringify(defaultShipping(user.country))
    );
    row = await db.prepare('SELECT * FROM store_settings WHERE user_id = ?').get(user.id);
  }
  return row;
}

// Nettoie un identifiant de Pixel Meta (chiffres uniquement, 8 à 20 caractères).
function cleanPixelId(v) {
  const s = String(v || '').replace(/\D/g, '').slice(0, 20);
  return s.length >= 8 ? s : '';
}
// Nettoie une URL http(s) (page Facebook, etc.).
function cleanUrl(v) {
  const s = String(v || '').trim().slice(0, 200);
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return 'https://' + s.replace(/^\/+/, '');
}
// Jeton de vérification de domaine Meta : chaîne alphanumérique fournie par
// le Business Manager (on retire tout balisage <meta ...> collé par erreur).
function cleanDomainToken(v) {
  let s = String(v || '').trim();
  const m = s.match(/content=["']([^"']+)["']/i);
  if (m) s = m[1];
  return s.replace(/[^A-Za-z0-9]/g, '').slice(0, 100);
}
// Normalise un identifiant Instagram (sans @, sans URL).
function cleanHandle(v) {
  return String(v || '').trim().replace(/^@+/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[/?#].*$/, '').slice(0, 40);
}
// Accepte une URL http(s) ou une data URL image (logo / banniere).
function cleanImage(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  if (s.length > 1500000) return ''; // ~1,5 Mo max
  if (/^https?:\/\//i.test(s) || /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(s)) return s;
  return '';
}

function publicStore(user, row) {
  let shipping;
  try { shipping = JSON.parse(row.shipping_json); } catch { shipping = defaultShipping(); }
  const t = themeById(row.theme);
  const slug = effectiveSlug(user, row);
  return {
    marketing: {
      metaPixelId: row.meta_pixel_id || '',
      metaPixelActive: !!Number(row.meta_pixel_active),
      fbPage: row.fb_page || '',
      instagram: row.instagram || '',
      metaDomainVerification: row.meta_domain_verification || '',
      catalogUrl: `${config.publicBaseUrl || ''}/api/public/store/${slug}/catalog.csv`,
    },
    payment: {
      wave: row.wave_number || '',
      om: row.om_number || '',
    },
    logo: row.logo || '',
    banner: row.banner || '',
    returnsPolicy: row.returns_policy || '',
    shopName: user.shop_name,
    theme: t.id,
    themeData: t,
    tagline: row.tagline,
    heroTitle: row.hero_title || '',
    about: row.about || '',
    description: row.description,
    phone: row.phone || '',
    whatsapp: row.whatsapp || '',
    email: row.email || '',
    address: row.address || '',
    currency: user.currency || 'MRU',
    slug,
    baseDomain: config.baseDomain,
    domain: `${slug}.${config.baseDomain}`,
    storeUrl: `/boutique/${slug}`,
    shipping,
  };
}

// GET /api/store  — reglages + liste des themes disponibles
router.get('/', requireAuth, async (req, res) => {
  const row = await getSettings(req.user);
  res.json({ store: publicStore(req.user, row), themes: THEMES });
});

// PUT /api/store  — theme, slogan, domaine, description
router.put('/', requireAuth, async (req, res) => {
  const row = await getSettings(req.user);
  const b = req.body || {};
  const theme = THEMES.some((t) => t.id === b.theme) ? b.theme : row.theme;
  const keep = (v, old, max) => (v !== undefined ? String(v).slice(0, max) : old);

  // Slug personnalise (nom de domaine de la boutique).
  let slug = row.slug;
  if (b.slug !== undefined) {
    const candidate = slugify(b.slug).slice(0, 40);
    if (!candidate) return res.status(400).json({ errors: { slug: 'Adresse invalide.' } });
    if (candidate !== effectiveSlug(req.user, row) && (await slugTaken(candidate, req.user.id))) {
      return res.status(409).json({ errors: { slug: 'Cette adresse est déjà prise.' } });
    }
    slug = candidate;
  }

  const metaPixelId = b.metaPixelId !== undefined ? cleanPixelId(b.metaPixelId) : row.meta_pixel_id;
  const fbPage = b.fbPage !== undefined ? cleanUrl(b.fbPage) : row.fb_page;
  const instagram = b.instagram !== undefined ? cleanHandle(b.instagram) : row.instagram;
  const metaDomainVerification = b.metaDomainVerification !== undefined
    ? cleanDomainToken(b.metaDomainVerification) : row.meta_domain_verification;
  const waveNumber = b.wave !== undefined ? String(b.wave).trim().slice(0, 40) : row.wave_number;
  const omNumber = b.om !== undefined ? String(b.om).trim().slice(0, 40) : row.om_number;
  const logo = b.logo !== undefined ? cleanImage(b.logo) : row.logo;
  const banner = b.banner !== undefined ? cleanImage(b.banner) : row.banner;
  // Pixel actif / désactivé : par défaut actif dès qu'un identifiant existe.
  const metaPixelActive = b.metaPixelActive !== undefined
    ? (b.metaPixelActive ? 1 : 0) : Number(row.meta_pixel_active);

  await db.prepare(
    `UPDATE store_settings SET theme = ?, tagline = ?, hero_title = ?, about = ?, slug = ?, description = ?, phone = ?, whatsapp = ?, email = ?, address = ?, meta_pixel_id = ?, fb_page = ?, instagram = ?, meta_domain_verification = ?, meta_pixel_active = ?, wave_number = ?, om_number = ?, logo = ?, banner = ?, returns_policy = ?, updated_at = datetime('now') WHERE user_id = ?`
  ).run(
    theme,
    keep(b.tagline, row.tagline, 140),
    keep(b.heroTitle, row.hero_title, 120),
    keep(b.about, row.about, 600),
    slug,
    keep(b.description, row.description, 400),
    keep(b.phone, row.phone, 40),
    keep(b.whatsapp, row.whatsapp, 40),
    keep(b.email, row.email, 120),
    keep(b.address, row.address, 160),
    metaPixelId, fbPage, instagram, metaDomainVerification, metaPixelActive, waveNumber, omNumber, logo, banner,
    keep(b.returnsPolicy, row.returns_policy, 600),
    req.user.id
  );
  res.json({ ok: true, store: publicStore(req.user, await getSettings(req.user)) });
});

// PUT /api/store/shipping  — zones et frais de livraison
router.put('/shipping', requireAuth, async (req, res) => {
  await getSettings(req.user);
  const b = req.body || {};
  let zones = Array.isArray(b.zones) ? b.zones : [];
  zones = zones
    .filter((z) => z && String(z.zone).trim())
    .slice(0, 12)
    .map((z) => ({ zone: String(z.zone).trim().slice(0, 60), fee: Math.max(0, Math.round(Number(z.fee) || 0)) }));
  const shipping = { freeOver: Math.max(0, Math.round(Number(b.freeOver) || 0)), zones };
  await db.prepare(`UPDATE store_settings SET shipping_json = ?, updated_at = datetime('now') WHERE user_id = ?`).run(
    JSON.stringify(shipping),
    req.user.id
  );
  res.json({ ok: true, shipping });
});

module.exports = router;
