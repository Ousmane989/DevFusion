'use strict';

// Données de référence créées au premier démarrage : niveaux PS → CM2,
// matières, compétences de maternelle, année scolaire, compte directeur.
const bcrypt = require('bcryptjs');
const { query, one } = require('../db');
const config = require('../config');

const NIVEAUX = [
  ['PS', 'Petite Section', 1, 'maternelle'],
  ['MS', 'Moyenne Section', 2, 'maternelle'],
  ['GS', 'Grande Section', 3, 'maternelle'],
  ['CP', 'CP', 4, 'primaire'],
  ['CE1', 'CE1', 5, 'primaire'],
  ['CE2', 'CE2', 6, 'primaire'],
  ['CM1', 'CM1', 7, 'primaire'],
  ['CM2', 'CM2', 8, 'primaire'],
];

const MATIERES = [
  ['Français', 3, 10], ['Mathématiques', 3, 10], ['Arabe', 2, 10],
  ['Éducation islamique', 1, 10], ['Sciences', 1, 10],
  ['Histoire-Géographie', 1, 10], ['Éducation civique', 1, 10],
  ['Anglais', 1, 10], ['Dessin / Arts', 1, 10], ['Éducation physique', 1, 10],
];

const COMPETENCES = [
  ['Langage', 'S\'exprime clairement à l\'oral'],
  ['Langage', 'Écoute et comprend une histoire'],
  ['Langage', 'Reconnaît les lettres de son prénom'],
  ['Graphisme', 'Tient correctement son crayon'],
  ['Graphisme', 'Reproduit des formes simples'],
  ['Mathématiques', 'Compte jusqu\'à 10'],
  ['Mathématiques', 'Reconnaît les formes et les couleurs'],
  ['Découverte du monde', 'Se repère dans le temps (jours, saisons)'],
  ['Motricité', 'Court, saute, lance avec aisance'],
  ['Vivre ensemble', 'Respecte les règles de la classe'],
  ['Vivre ensemble', 'Partage et coopère avec les autres'],
  ['Arts', 'Chante et participe aux activités artistiques'],
];

/** Année scolaire contenant la date donnée (octobre → juillet). */
function anneeParDefaut(d = new Date()) {
  const a = d.getMonth() + 1 >= 9 ? d.getFullYear() : d.getFullYear() - 1;
  return { libelle: `${a}-${a + 1}`, debut: `${a}-10-01`, fin: `${a + 1}-07-31` };
}

async function amorcer() {
  for (const [code, nom, ordre, cycle] of NIVEAUX) {
    await query(
      `INSERT INTO niveaux (code, nom, ordre, cycle) VALUES ($1,$2,$3,$4) ON CONFLICT (code) DO NOTHING`,
      [code, nom, ordre, cycle],
    );
  }

  const nbMat = await one('SELECT COUNT(*) AS n FROM matieres');
  if (nbMat.n === 0) {
    let i = 0;
    for (const [nom, coef, bareme] of MATIERES) {
      await query('INSERT INTO matieres (nom, coefficient, bareme, ordre) VALUES ($1,$2,$3,$4)', [nom, coef, bareme, i++]);
    }
  }

  const nbComp = await one('SELECT COUNT(*) AS n FROM competences');
  if (nbComp.n === 0) {
    let i = 0;
    for (const [domaine, libelle] of COMPETENCES) {
      await query('INSERT INTO competences (domaine, libelle, ordre) VALUES ($1,$2,$3)', [domaine, libelle, i++]);
    }
  }

  // Année scolaire active + une classe par niveau.
  let annee = await one('SELECT * FROM annees_scolaires WHERE active');
  if (!annee) {
    const a = anneeParDefaut();
    annee = await one(
      `INSERT INTO annees_scolaires (libelle, date_debut, date_fin, active) VALUES ($1,$2,$3,TRUE)
       ON CONFLICT (libelle) DO UPDATE SET active = TRUE RETURNING *`,
      [a.libelle, a.debut, a.fin],
    );
    const niveaux = await query('SELECT * FROM niveaux ORDER BY ordre');
    for (const n of niveaux) {
      await query(
        `INSERT INTO classes (annee_id, niveau_id, groupe, nom) VALUES ($1,$2,'',$3) ON CONFLICT DO NOTHING`,
        [annee.id, n.id, n.nom],
      );
    }
  }

  // Compte directeur initial.
  const nbUsers = await one('SELECT COUNT(*) AS n FROM utilisateurs');
  if (nbUsers.n === 0) {
    const hash = await bcrypt.hash(config.admin.motDePasse, 10);
    await query(
      `INSERT INTO utilisateurs (identifiant, mot_de_passe, nom_complet, role) VALUES ($1,$2,'Direction','directeur')
       ON CONFLICT (identifiant) DO NOTHING`,
      [config.admin.identifiant, hash],
    );
    console.log(`  ✔ Compte directeur créé : « ${config.admin.identifiant} » (pensez à changer le mot de passe).`);
  }
}

module.exports = { amorcer, anneeParDefaut };
