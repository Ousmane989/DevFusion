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

/** « de novembre 2026 », « d'octobre 2026 » (élision devant une voyelle). */
function deMois(iso) {
  const n = nomMois(iso);
  return /^[aeiouy]/i.test(n) ? `d'${n}` : `de ${n}`;
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

/** Formate un montant : 12 500 FCFA */
function montant(n, devise = 'FCFA') {
  const v = Math.round(Number(n || 0) * 100) / 100;
  const s = v.toLocaleString('fr-FR', { maximumFractionDigits: 2 }).replace(/ | /g, ' ');
  return `${s} ${devise}`;
}

// Indicatifs de tous les pays : [code ISO, nom, indicatif, longueur min, longueur max]
// (longueur du numéro national sans l'indicatif ; à défaut, 4 à 13 chiffres).
const PAYS = require('../public/pays.json');
const INDICATIFS = [...new Set(PAYS.map((p) => p[2]))].sort((x, y) => y.length - x.length); // plus long d'abord (+1876 avant +1)

/** Pays d'un numéro international (+…) : indicatif le plus long qui correspond. */
function paysDuNumero(t) {
  const chiffres = String(t).replace(/^\+/, '');
  const ind = INDICATIFS.find((i) => chiffres.startsWith(i));
  return ind ? { indicatif: ind, national: chiffres.slice(ind.length), regles: PAYS.filter((p) => p[2] === ind) } : null;
}

/** Vrai si le numéro international a une longueur plausible pour son pays. */
function numeroValide(t) {
  if (!/^\+[1-9]\d{6,14}$/.test(t)) return false;
  const p = paysDuNumero(t);
  if (!p) return false;
  return p.regles.some(([, , , min = 4, max = 13]) => p.national.length >= min && p.national.length <= max);
}

/**
 * Normalise un numéro de téléphone (WhatsApp) au format international « +indicatif numéro ».
 * Accepte tous les pays : « +33 6 12 34 56 78 », « 0033… », « 221771234567 » (indicatif sans +),
 * ou un numéro local auquel on ajoute l'indicatif par défaut de l'école (avec ou sans 0 initial).
 * Renvoie null si le numéro n'est pas valable.
 */
function normaliserTel(tel, indicatifDefaut = '+221') {
  if (!tel) return null;
  let t = String(tel).replace(/[\s.\-()/]/g, '');
  if (t.startsWith('00')) t = '+' + t.slice(2);
  if (t.startsWith('+')) return numeroValide(t) ? t : null;
  if (!/^\d+$/.test(t)) return null;
  const defaut = '+' + String(indicatifDefaut || '+221').replace(/\D/g, '');
  // 1) numéro local du pays de l'école (avec ou sans le 0 du préfixe national)
  for (const n of [t, t.replace(/^0/, '')]) if (numeroValide(defaut + n)) return defaut + n;
  // 2) indicatif tapé sans « + » (ex. 221771234567)
  if (numeroValide('+' + t)) return '+' + t;
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

// Modes de paiement : ceux du Sénégal, puis ceux de la Mauritanie.
/** Frais en plus de la mensualité et de l'inscription (montant dû par inscription). */
const FRAIS_ANNEXES = { reliquat: 'Reliquat', fournitures: 'Fournitures', uniforme: 'Uniforme' };
/** Libellé d'un paiement (reçu, journal, message). */
function objetPaiement(type, mois, remarque) {
  if (type === 'mensualite') return `Mensualité ${deMois(mois)}`;
  if (type === 'inscription') return 'Frais d\'inscription';
  return FRAIS_ANNEXES[type] || remarque || 'Autre paiement';
}

const MODES_PAIEMENT = {
  especes: 'Espèces', wave: 'Wave', orange_money: 'Orange Money', free_money: 'Mixx by Yas (Free Money)',
  mobile_money: 'Mobile Money (MTN, Moov…)', carte: 'Carte bancaire',
  virement: 'Virement bancaire', cheque: 'Chèque',
  bankily: 'Bankily', masrvi: 'Masrvi', sedad: 'Sedad',
};

module.exports = {
  HttpError, ah, MOIS, nomMois, deMois, aujourdhui, debutMois, ajouterMois, moisEntre,
  dateFr, montant, normaliserTel, numeroValide, PAYS, FRAIS_ANNEXES, objetPaiement, remplir, exiger, vide, MODES_PAIEMENT,
};
