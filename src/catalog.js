'use strict';

// ------------------------------------------------------------------
// Thèmes de boutique proposés aux commerçants (crées pour Karat).
// Chaque thème definit une palette utilisee pour l'apercu et la
// future vitrine publique de la boutique.
// ------------------------------------------------------------------
// Chaque thème combine une palette ET une mise en page distincte
// (layout) + une ambiance typographique (font). La vitrine publique
// change réellement de structure selon le layout choisi.
const THEMES = [
  { id: 'or-noir', name: 'Or Noir', desc: 'Luxe sombre et doré — le style signature, élégant et intemporel.', layout: 'luxe', font: 'serif', bg: '#0D0D0D', surface: '#171717', accent: '#D4AF37', accent2: '#F5D77E', text: '#F4F1EA' },
  { id: 'sahel', name: 'Sahel', desc: 'Chaleureux et terreux, aux tons ambrés — une ambiance conviviale.', layout: 'warm', font: 'mixed', bg: '#17120C', surface: '#211a12', accent: '#E0A458', accent2: '#F2C879', text: '#F6EEE3' },
  { id: 'emeraude', name: 'Émeraude', desc: 'Frais et naturel, dans des verts vifs — idéal alimentation et bio.', layout: 'fresh', font: 'sans', bg: '#0B1512', surface: '#12201b', accent: '#2FBF71', accent2: '#7EE0A8', text: '#EAF5EF' },
  { id: 'ocean', name: 'Océan', desc: 'Moderne et technologique, en bleus profonds — parfait high-tech.', layout: 'tech', font: 'sans', bg: '#0A1016', surface: '#111a22', accent: '#3B9EDB', accent2: '#7ECBF0', text: '#E8F1F8' },
  { id: 'rubis', name: 'Rubis', desc: 'Audacieux et passionné, aux rouges éclatants — mode et beauté.', layout: 'magazine', font: 'serif', bg: '#150B0E', surface: '#20141a', accent: '#E0526A', accent2: '#F58AA0', text: '#F8EAEE' },
  { id: 'ivoire', name: 'Ivoire', desc: 'Clair et minimaliste, sur fond ivoire — épuré et raffiné.', layout: 'minimal', font: 'sans', bg: '#F7F4EE', surface: '#FFFFFF', accent: '#C99A2E', accent2: '#E0BD63', text: '#2A2620' },
];

function themeById(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

// Zones et frais de livraison par defaut (MRU).
// Zones de livraison par defaut, adaptees au pays du commerçant : un vendeur
// senegalais ne propose que des villes du Senegal, et inversement.
function defaultShipping(country) {
  if (country === 'SN') {
    return { freeOver: 0, zones: [
      { zone: 'Dakar', fee: 1000 },
      { zone: 'Autres villes Sénégal', fee: 2000 },
    ] };
  }
  if (country === 'MR') {
    return { freeOver: 0, zones: [
      { zone: 'Nouakchott', fee: 100 },
      { zone: 'Intérieur Mauritanie', fee: 350 },
    ] };
  }
  // Pays inconnu : on garde une liste generique (retrocompatibilite).
  return { freeOver: 0, zones: [
    { zone: 'Nouakchott', fee: 100 },
    { zone: 'Intérieur Mauritanie', fee: 350 },
    { zone: 'Dakar', fee: 1500 },
    { zone: 'Autres villes Sénégal', fee: 2500 },
  ] };
}

function publicProduct(p) {
  const variants = String(p.variants || '').split(',').map((s) => s.trim()).filter(Boolean);
  return {
    id: p.id,
    name: p.name,
    subtitle: p.subtitle || '',
    description: p.description,
    price: p.price_mru, // montant dans la devise de la boutique
    compareAt: p.compare_at_mru || 0, // prix barre (promo), 0 = aucun
    rating: p.rating || 0, // note sur 5 (0 = masquee)
    reviewsCount: p.reviews_count || 0,
    variants, // liste d'options (ex. couleurs)
    stock: p.stock,
    category: p.category,
    image: p.image || '',
    active: Boolean(p.active),
    createdAt: p.created_at,
  };
}

const CATEGORIES = ['Mode', 'Électronique', 'Alimentation', 'Cosmétique', 'Artisanat', 'Accessoires', 'Autre'];

// Cycle de vie d'une commande — paiement a la livraison.
const ORDER_STATUSES = [
  { key: 'nouvelle', label: 'Nouvelle', tone: 'warning' },
  { key: 'confirmee', label: 'Confirmée', tone: 'info' },
  { key: 'expediee', label: 'Expédiée', tone: 'info' },
  { key: 'livree', label: 'Livrée', tone: 'good' },
  { key: 'annulee', label: 'Annulée', tone: 'critical' },
];
function statusMeta(key) {
  return ORDER_STATUSES.find((s) => s.key === key) || ORDER_STATUSES[0];
}

// Pays pris en charge et devise associee.
const COUNTRIES = {
  MR: { code: 'MR', name: 'Mauritanie', flag: '🇲🇷', currency: 'MRU', dial: '+222' },
  SN: { code: 'SN', name: 'Sénégal', flag: '🇸🇳', currency: 'FCFA', dial: '+221' },
};
// Taux indicatif : 1 MRU ≈ 6 FCFA.
const MRU_TO_FCFA = 6;
function currencyOf(country) { return (COUNTRIES[country] || COUNTRIES.MR).currency; }
// Code ISO 4217 attendu par Meta (catalogue, publicités) : « FCFA » n'est pas
// un code ISO, il faut renvoyer « XOF » (franc CFA BCEAO). « MRU » est déjà ISO.
function isoCurrency(currency) { return currency === 'FCFA' ? 'XOF' : (currency || 'MRU'); }
// Renvoie la conversion approximative vers l'autre devise.
function altAmount(amount, currency) {
  if (currency === 'FCFA') return { value: Math.round(amount / MRU_TO_FCFA), currency: 'MRU' };
  return { value: Math.round(amount * MRU_TO_FCFA), currency: 'FCFA' };
}

function slugify(s) {
  return String(s || 'ma-boutique')
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ma-boutique';
}

module.exports = { THEMES, themeById, defaultShipping, publicProduct, CATEGORIES, slugify, ORDER_STATUSES, statusMeta, COUNTRIES, currencyOf, isoCurrency, altAmount, MRU_TO_FCFA };
