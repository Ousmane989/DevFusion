'use strict';

// Calcul des moyennes, classements et appréciations.
// Toutes les notes sont ramenées sur 10 avant pondération par le coefficient.
const { query, one } = require('../db');

function appreciation(moy) {
  if (moy === null || moy === undefined) return '';
  if (moy >= 9) return 'Excellent';
  if (moy >= 8) return 'Très bien';
  if (moy >= 7) return 'Bien';
  if (moy >= 6) return 'Assez bien';
  if (moy >= 5) return 'Passable';
  return 'Insuffisant';
}

const arrondi = (x) => (x === null ? null : Math.round(x * 100) / 100);

/** Attribue un rang (ex æquo gérés) sur la propriété « moyenne ». */
function classer(liste) {
  const tri = liste.filter((x) => x.moyenne !== null).sort((a, b) => b.moyenne - a.moyenne);
  tri.forEach((x, i) => { x.rang = i > 0 && tri[i - 1].moyenne === x.moyenne ? tri[i - 1].rang : i + 1; });
  liste.filter((x) => x.moyenne === null).forEach((x) => { x.rang = null; });
}

async function infosClasse(classeId) {
  return one(
    `SELECT c.*, n.code AS niveau_code, n.cycle, a.libelle AS annee, p.nom || ' ' || p.prenom AS enseignant
       FROM classes c JOIN niveaux n ON n.id = c.niveau_id JOIN annees_scolaires a ON a.id = c.annee_id
       LEFT JOIN personnel p ON p.id = c.enseignant_id WHERE c.id = $1`, [classeId]);
}

async function elevesClasse(classeId) {
  return query(
    `SELECT i.id AS inscription_id, e.id AS eleve_id, e.matricule, e.nom, e.prenom, e.sexe, e.date_naissance, e.whatsapp,
            COALESCE(NULLIF(e.tuteur_nom,''), NULLIF(e.pere_nom,''), NULLIF(e.mere_nom,''), 'Parent') AS parent
       FROM inscriptions i JOIN eleves e ON e.id = i.eleve_id
      WHERE i.classe_id = $1 AND e.statut = 'actif' AND i.decision <> 'parti' ORDER BY e.nom, e.prenom`, [classeId]);
}

/** Résultats d'une période pour une classe du primaire. */
async function resultatsPeriode(classe, eleves, periode) {
  const matieres = await query('SELECT * FROM matieres WHERE $1 = ANY(niveaux) ORDER BY ordre, nom', [classe.niveau_code]);
  const notes = await query(
    'SELECT inscription_id, matiere_id, note FROM notes WHERE periode = $1 AND inscription_id = ANY($2)',
    [periode, eleves.map((e) => e.inscription_id)]);
  const idx = {};
  for (const n of notes) idx[`${n.inscription_id}:${n.matiere_id}`] = n.note;
  const lignes = eleves.map((e) => {
    let somme = 0; let coefs = 0;
    const detail = matieres.map((m) => {
      const note = idx[`${e.inscription_id}:${m.id}`];
      const has = note !== undefined && note !== null;
      if (has) { somme += (note / m.bareme) * 10 * m.coefficient; coefs += m.coefficient; }
      return { matiere_id: m.id, matiere: m.nom, coefficient: m.coefficient, bareme: m.bareme, note: has ? note : null };
    });
    return { ...e, notes: detail, total_coef: coefs, moyenne: coefs ? arrondi(somme / coefs) : null };
  });
  classer(lignes);
  lignes.forEach((l) => { l.appreciation = appreciation(l.moyenne); });
  return { matieres, lignes };
}

/**
 * Résultats d'une classe : periode = 1..n, ou 0 pour la moyenne annuelle
 * (moyenne des périodes disponibles).
 */
async function resultatsClasse(classeId, periode) {
  const classe = await infosClasse(classeId);
  if (!classe) return null;
  const eleves = await elevesClasse(classeId);
  const p = await one('SELECT nb_periodes, libelle_periode FROM parametres WHERE id = 1');

  if (classe.cycle === 'maternelle') {
    const competences = await query('SELECT * FROM competences ORDER BY ordre, domaine, libelle');
    const app = await query(
      'SELECT inscription_id, competence_id, periode, niveau FROM appreciations WHERE inscription_id = ANY($1) AND ($2 = 0 OR periode = $2)',
      [eleves.map((e) => e.inscription_id), periode]);
    const idx = {};
    for (const a of app) idx[`${a.inscription_id}:${a.competence_id}`] = a.niveau; // la dernière période l'emporte (tri non garanti en annuel)
    return {
      classe, periode, cycle: 'maternelle', competences,
      lignes: eleves.map((e) => ({ ...e, appreciations: competences.map((c) => ({ competence_id: c.id, niveau: idx[`${e.inscription_id}:${c.id}`] || null })) })),
    };
  }

  let res;
  if (periode > 0) {
    res = await resultatsPeriode(classe, eleves, periode);
  } else {
    // Moyenne annuelle = moyenne des moyennes de périodes renseignées.
    const parPeriode = [];
    for (let k = 1; k <= p.nb_periodes; k++) parPeriode.push(await resultatsPeriode(classe, eleves, k));
    const lignes = eleves.map((e, i) => {
      const moys = parPeriode.map((r) => r.lignes[i].moyenne);
      const dispo = moys.filter((m) => m !== null);
      return { ...e, moyennes_periodes: moys, notes: [], moyenne: dispo.length ? arrondi(dispo.reduce((a, b) => a + b, 0) / dispo.length) : null };
    });
    classer(lignes);
    lignes.forEach((l) => { l.appreciation = appreciation(l.moyenne); });
    res = { matieres: parPeriode[0] ? parPeriode[0].matieres : [], lignes };
  }
  const moys = res.lignes.map((l) => l.moyenne).filter((m) => m !== null);
  const stats = {
    effectif: res.lignes.length,
    evalues: moys.length,
    moyenne_classe: moys.length ? arrondi(moys.reduce((a, b) => a + b, 0) / moys.length) : null,
    plus_forte: moys.length ? Math.max(...moys) : null,
    plus_faible: moys.length ? Math.min(...moys) : null,
    admis: moys.filter((m) => m >= 5).length,
  };
  return { classe, periode, cycle: 'primaire', ...res, stats };
}

module.exports = { resultatsClasse, appreciation, infosClasse, elevesClasse };
