'use strict';

// Petits outils partagés par les routes et services.

/** Erreur HTTP avec message lisible par l'utilisateur. */
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Enveloppe une route async pour transmettre les erreurs à Express. */
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
  'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** « 2026-10-01 » -> « octobre 2026 » */
function nomMois(iso) {
  const [a, m] = String(iso).split('-').map(Number);
  return `${MOIS[m - 1]} ${a}`;
}

/** Date du jour (fuseau du serveur, TZ) au format AAAA-MM-JJ. */
function aujourdhui(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Premier jour du mois d'une date ISO. */
function debutMois(iso) {
  return String(iso).slice(0, 7) + '-01';
}

/** Ajoute n mois à une date « AAAA-MM-01 ». */
function ajouterMois(iso, n) {
  const [a, m] = String(iso).split('-').map(Number);
  const t = a * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}-01`;
}

/** Liste des mois (AAAA-MM-01) entre deux dates incluses. */
function moisEntre(debut, fin) {
  const res = [];
  let cur = debutMois(debut);
  const last = debutMois(fin);
  while (cur <= last && res.length < 24) {
    res.push(cur);
    cur = ajouterMois(cur, 1);
  }
  return res;
}

/** « 2026-10-25 » -> « 25/10/2026 » */
function dateFr(iso) {
  if (!iso) return '';
  const [a, m, j] = String(iso).slice(0, 10).split('-');
  return `${j}/${m}/${a}`;
}

/** Formate un montant : 12 500 MRU */
function montant(n, devise = 'MRU') {
  const v = Math.round(Number(n || 0) * 100) / 100;
  const s = v.toLocaleString('fr-FR', { maximumFractionDigits: 2 }).replace(/ | /g, ' ');
  return `${s} ${devise}`;
}

/**
 * Normalise un numéro WhatsApp : retire espaces/tirets, ajoute l'indicatif
 * par défaut si absent. Renvoie null si invalide.
 * Mauritanie (+222) : 8 chiffres ; Sénégal (+221) : 9 chiffres.
 */
function normaliserTel(tel, indicatifDefaut = '+222') {
  if (!tel) return null;
  let t = String(tel).replace(/[\s.\-()]/g, '');
  if (t.startsWith('00')) t = '+' + t.slice(2);
  if (!t.startsWith('+')) t = indicatifDefaut + t;
  if (/^\+222\d{8}$/.test(t) || /^\+221\d{9}$/.test(t)) return t;
  return null;
}

/** Remplace les {variables} d'un modèle de message. */
function remplir(modele, vars) {
  return String(modele).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : m));
}

/** Vérifie la présence de champs obligatoires dans un objet. */
function exiger(obj, champs) {
  const manquants = champs.filter((c) => obj[c] === undefined || obj[c] === null || String(obj[c]).trim() === '');
  if (manquants.length) throw new HttpError(400, `Champs obligatoires manquants : ${manquants.join(', ')}`);
}

/** Convertit '' en null (formulaires). */
const vide = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : v);

const MODES_PAIEMENT = {
  especes: 'Espèces', bankily: 'Bankily', masrvi: 'Masrvi', sedad: 'Sedad',
  wave: 'Wave', orange_money: 'Orange Money',
};

module.exports = {
  HttpError, ah, MOIS, nomMois, aujourdhui, debutMois, ajouterMois, moisEntre,
  dateFr, montant, normaliserTel, remplir, exiger, vide, MODES_PAIEMENT,
};
