'use strict';

// ------------------------------------------------------------------
// Thèmes de boutique proposés aux commerçants (crées pour Karat).
// Chaque thème definit une palette utilisee pour l'apercu et la
// future vitrine publique de la boutique.
// ------------------------------------------------------------------
const THEMES = [
  { id: 'or-noir', name: 'Or Noir', desc: 'Luxe sombre et doré — le style signature de Karat.', bg: '#0D0D0D', surface: '#171717', accent: '#D4AF37', accent2: '#F5D77E', text: '#F4F1EA' },
  { id: 'sahel', name: 'Sahel', desc: 'Tons chauds de sable et de terre, chaleureux et accueillant.', bg: '#17120C', surface: '#211a12', accent: '#E0A458', accent2: '#F2C879', text: '#F6EEE3' },
  { id: 'emeraude', name: 'Émeraude', desc: 'Vert profond et raffiné, image naturelle et premium.', bg: '#0B1512', surface: '#12201b', accent: '#2FBF71', accent2: '#7EE0A8', text: '#EAF5EF' },
  { id: 'ocean', name: 'Océan', desc: 'Bleu profond, moderne et rassurant.', bg: '#0A1016', surface: '#111a22', accent: '#3B9EDB', accent2: '#7ECBF0', text: '#E8F1F8' },
  { id: 'rubis', name: 'Rubis', desc: 'Rouge intense et élégant, pour se démarquer.', bg: '#150B0E', surface: '#20141a', accent: '#E0526A', accent2: '#F58AA0', text: '#F8EAEE' },
  { id: 'ivoire', name: 'Ivoire', desc: 'Clair et épuré, une vitrine lumineuse et minimaliste.', bg: '#F7F4EE', surface: '#FFFFFF', accent: '#C99A2E', accent2: '#E0BD63', text: '#2A2620' },
];

function themeById(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

// Zones et frais de livraison par defaut (MRU).
function defaultShipping() {
  return {
    freeOver: 0, // livraison offerte au-dela de ce montant (0 = desactive)
    zones: [
      { zone: 'Nouakchott', fee: 100 },
      { zone: 'Intérieur Mauritanie', fee: 350 },
      { zone: 'Dakar', fee: 1500 },
      { zone: 'Autres villes Sénégal', fee: 2500 },
    ],
  };
}

function publicProduct(p) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    priceMru: p.price_mru,
    priceFcfa: p.price_mru * 6,
    stock: p.stock,
    category: p.category,
    active: Boolean(p.active),
    createdAt: p.created_at,
  };
}

const CATEGORIES = ['Mode', 'Électronique', 'Alimentation', 'Cosmétique', 'Artisanat', 'Accessoires', 'Autre'];

module.exports = { THEMES, themeById, defaultShipping, publicProduct, CATEGORIES };
