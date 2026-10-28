'use strict';

// Calculs financiers partagés : situation des paiements par mois, impayés,
// soldes. Une mensualité est due pour chaque mois de l'année scolaire à
// partir du mois d'inscription. Dû = mensualité − réduction.
const { query, one } = require('../db');
const { moisEntre, debutMois, aujourdhui, HttpError, FRAIS_ANNEXES } = require('../utils');

async function anneeActive() {
  return one('SELECT * FROM annees_scolaires WHERE active');
}

/** Année active, ou erreur 400 claire s'il n'y en a pas (au lieu d'une erreur 500). */
async function anneeActiveRequise() {
  const a = await anneeActive();
  if (!a) throw new HttpError(400, 'Aucune année scolaire active : activez-en une dans « Année scolaire ».');
  return a;
}

/** Mois de l'année scolaire (AAAA-MM-01). */
function moisAnnee(annee) {
  return moisEntre(annee.date_debut, annee.date_fin);
}

/** Mois exigibles à ce jour (de début d'année jusqu'au mois courant inclus). */
function moisEchus(annee, jour = aujourdhui()) {
  const cur = debutMois(jour);
  return moisAnnee(annee).filter((m) => m <= cur);
}

function statutDe(du, verse) {
  if (du <= 0 || verse >= du) return 'paye';
  if (verse > 0) return 'partiel';
  return 'impaye';
}

/**
 * Situation de chaque élève actif pour un mois donné.
 * @param {string} mois  AAAA-MM-01
 * @param {object} opts  { classeId, classes (liste autorisée), anneeId }
 */
async function situationMois(mois, opts = {}) {
  const annee = opts.anneeId ? await one('SELECT * FROM annees_scolaires WHERE id = $1', [opts.anneeId]) : await anneeActive();
  if (!annee) return [];
  const params = [mois, annee.id];
  let filtre = '';
  if (opts.classeId) { params.push(opts.classeId); filtre += ` AND c.id = $${params.length}`; }
  if (opts.classes) { params.push(opts.classes); filtre += ` AND c.id = ANY($${params.length})`; }
  const rows = await query(
    `SELECT i.id AS inscription_id, e.id AS eleve_id, e.matricule, e.nom, e.prenom, e.sexe, e.whatsapp,
            COALESCE(NULLIF(e.tuteur_nom,''), NULLIF(e.pere_nom,''), NULLIF(e.mere_nom,''), 'Parent') AS parent,
            c.id AS classe_id, c.nom AS classe, n.ordre,
            (i.mensualite - i.reduction) AS du, i.reduction, i.reduction_motif,
            COALESCE(SUM(p.montant), 0) AS verse
       FROM inscriptions i
       JOIN eleves e ON e.id = i.eleve_id
       JOIN classes c ON c.id = i.classe_id
       JOIN niveaux n ON n.id = c.niveau_id
       LEFT JOIN paiements p ON p.inscription_id = i.id AND p.type = 'mensualite' AND p.mois = $1 AND NOT p.annule
      WHERE i.annee_id = $2 AND e.statut = 'actif' AND i.decision <> 'parti'
        AND date_trunc('month', i.date_inscription)::date <= $1 ${filtre}
      GROUP BY i.id, e.id, c.id, n.ordre
      ORDER BY n.ordre, c.nom, i.numero, e.nom, e.prenom`,
    params,
  );
  return rows.map((r) => {
    const reste = Math.max(0, r.du - r.verse);
    return { ...r, mois, reste, statut: statutDe(r.du, r.verse) };
  });
}

/**
 * Reliquat, fournitures et uniforme : dû, versé et reste par inscription.
 * @returns {Promise<Map<number, Object<string, {libelle, du, verse, reste}>>>}
 */
async function fraisAnnexes(inscriptionIds) {
  const res = new Map();
  if (!inscriptionIds.length) return res;
  const types = Object.keys(FRAIS_ANNEXES);
  const rows = await query(
    `SELECT i.id, ${types.map((t) => `i.${t}`).join(', ')},
            ${types.map((t) => `COALESCE(SUM(p.montant) FILTER (WHERE p.type = '${t}'), 0) AS verse_${t}`).join(', ')}
       FROM inscriptions i LEFT JOIN paiements p ON p.inscription_id = i.id AND NOT p.annule
      WHERE i.id = ANY($1) GROUP BY i.id`, [inscriptionIds]);
  for (const r of rows) {
    const o = {};
    for (const t of types) o[t] = { libelle: FRAIS_ANNEXES[t], du: r[t], verse: r[`verse_${t}`], reste: Math.max(0, r[t] - r[`verse_${t}`]) };
    res.set(r.id, o);
  }
  return res;
}

/**
 * Données des factures de mensualité d'un mois : pour chaque élève, le dû du mois,
 * ce qui est déjà versé, et les mois précédents de l'année restés impayés (arriérés).
 * @param {string} mois AAAA-MM-01
 * @param {{classeId?, eleveId?, impayesSeulement?}} opts
 */
async function facturesMois(mois, { classeId, eleveId, impayesSeulement } = {}) {
  const annee = await anneeActiveRequise();
  if (!moisAnnee(annee).includes(mois)) throw new HttpError(400, 'Ce mois ne fait pas partie de l\'année scolaire.');
  let liste = await situationMois(mois, { classeId });
  if (eleveId) liste = liste.filter((x) => x.eleve_id === Number(eleveId));
  // Arriérés : mois précédents de l'année (depuis l'inscription) non soldés.
  const arrieres = new Map();
  for (const m of moisAnnee(annee).filter((x) => x < mois)) {
    for (const s of await situationMois(m, { classeId })) {
      if (s.reste <= 0) continue;
      const a = arrieres.get(s.inscription_id) || [];
      a.push({ mois: m, du: s.du, verse: s.verse, reste: s.reste });
      arrieres.set(s.inscription_id, a);
    }
  }
  const annexes = await fraisAnnexes(liste.map((x) => x.inscription_id));
  liste = liste.map((x) => {
    const arr = arrieres.get(x.inscription_id) || [];
    const totalArrieres = arr.reduce((t, a) => t + a.reste, 0);
    // Reliquat, fournitures, uniforme encore dus
    const autres = Object.entries(annexes.get(x.inscription_id) || {}).filter(([, a]) => a.reste > 0)
      .map(([type, a]) => ({ type, libelle: a.libelle, du: a.du, verse: a.verse, reste: a.reste }));
    const totalAutres = autres.reduce((t, a) => t + a.reste, 0);
    return { ...x, arrieres: arr, total_arrieres: totalArrieres, autres, total_autres: totalAutres, total: x.reste + totalArrieres + totalAutres };
  });
  return impayesSeulement ? liste.filter((x) => x.total > 0) : liste;
}

/** Impayés (reste > 0) pour un mois, ou pour tous les mois échus si mois est vide. */
async function impayes({ mois, classeId, classes } = {}) {
  const annee = await anneeActive();
  if (!annee) return [];
  const liste = mois ? [mois] : moisEchus(annee);
  const res = [];
  for (const m of liste) {
    const s = await situationMois(m, { classeId, classes });
    res.push(...s.filter((x) => x.reste > 0));
  }
  return res;
}

/** Détail mois par mois pour une inscription (fiche élève). */
async function soldeInscription(inscriptionId) {
  const insc = await one(
    `SELECT i.*, a.date_debut, a.date_fin, e.date_sortie FROM inscriptions i JOIN annees_scolaires a ON a.id = i.annee_id
       JOIN eleves e ON e.id = i.eleve_id WHERE i.id = $1`,
    [inscriptionId],
  );
  if (!insc) return null;
  const pay = await query(
    `SELECT mois, SUM(montant) AS verse FROM paiements
      WHERE inscription_id = $1 AND type = 'mensualite' AND NOT annule GROUP BY mois`, [inscriptionId]);
  const parMois = Object.fromEntries(pay.map((p) => [p.mois, p.verse]));
  const insFrais = await one(
    `SELECT COALESCE(SUM(montant),0) AS verse FROM paiements WHERE inscription_id = $1 AND type = 'inscription' AND NOT annule`,
    [inscriptionId]);
  const du = insc.mensualite - insc.reduction;
  const debut = debutMois(insc.date_inscription);
  // Élève parti : plus rien n'est dû après le mois de son départ.
  const fin = insc.date_sortie && insc.decision === 'parti' ? debutMois(insc.date_sortie) : null;
  const courant = debutMois(aujourdhui());
  const mois = moisEntre(insc.date_debut, insc.date_fin).map((m) => {
    const verse = parMois[m] || 0;
    const exigible = m >= debut && (!fin || m <= fin);
    return {
      mois: m, du: exigible ? du : 0, verse, exigible, echu: exigible && m <= courant,
      reste: exigible ? Math.max(0, du - verse) : 0,
      statut: exigible ? statutDe(du, verse) : 'non_concerne',
    };
  });
  const totalReste = mois.filter((m) => m.echu).reduce((s, m) => s + m.reste, 0);
  const annexes = await fraisAnnexes([insc.id]);
  return {
    inscription: insc, mois, totalReste,
    inscriptionFrais: { du: insc.frais_inscription, verse: insFrais.verse, reste: Math.max(0, insc.frais_inscription - insFrais.verse) },
    annexes: annexes.get(insc.id) || {}, // { reliquat: { du, verse, reste }, fournitures: …, uniforme: … }
  };
}

/** Résumé d'un mois : attendu, encaissé (pour ce mois), taux de recouvrement. */
async function resumeMois(mois, opts = {}) {
  const s = await situationMois(mois, opts);
  const attendu = s.reduce((t, x) => t + x.du, 0);
  const encaisse = s.reduce((t, x) => t + Math.min(x.verse, x.du), 0);
  return {
    mois, attendu, encaisse, reste: attendu - encaisse,
    taux: attendu > 0 ? Math.round((encaisse / attendu) * 1000) / 10 : null, // null : rien d'attendu ce mois
    nbPayes: s.filter((x) => x.statut === 'paye').length,
    nbPartiels: s.filter((x) => x.statut === 'partiel').length,
    nbImpayes: s.filter((x) => x.statut === 'impaye').length,
  };
}

module.exports = { anneeActive, anneeActiveRequise, facturesMois, fraisAnnexes, moisAnnee, moisEchus, statutDe, situationMois, impayes, soldeInscription, resumeMois };
