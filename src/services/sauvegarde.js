'use strict';

// Sauvegarde complète des données en JSON compressé (gzip), conservée dans la
// base elle-même (table « sauvegardes ») : elle survit aux redémarrages de
// l'hébergement serverless et se télécharge depuis Paramètres → Sauvegardes.
// Les 10 plus récentes sont gardées (sans les photos ni le logo). Pour une sauvegarde au niveau serveur,
// utilisez aussi pg_dump ou les sauvegardes de Supabase.
const zlib = require('zlib');
const { query } = require('../db');

const CONSERVEES = 10;
const TABLES = ['parametres', 'annees_scolaires', 'niveaux', 'personnel', 'utilisateurs', 'classes', 'eleves', 'inscriptions',
  'paiements', 'messages', 'rappels_executions', 'presences', 'matieres', 'notes', 'competences', 'appreciations',
  'observations', 'salaires', 'depenses', 'emploi_du_temps', 'evenements'];

async function sauvegarder({ auto = true } = {}) {
  const donnees = { version: 1, date: new Date().toISOString(), tables: {} };
  // Photos des élèves et logo exclus : ils alourdiraient chaque copie de plusieurs Mo
  // (base gratuite limitée) ; ce sont les seules données non sauvegardées.
  const SANS = { eleves: 'photo', parametres: 'logo' };
  for (const t of TABLES) {
    const lignes = await query(`SELECT * FROM ${t}`);
    if (SANS[t]) lignes.forEach((l) => { delete l[SANS[t]]; });
    donnees.tables[t] = lignes;
  }
  const horodatage = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  const fichier = `keur-xaleyi-${horodatage}.json.gz`;
  const buf = zlib.gzipSync(JSON.stringify(donnees));
  const [row] = await query(
    'INSERT INTO sauvegardes (fichier, taille, auto, donnees) VALUES ($1,$2,$3,$4) RETURNING id, fichier, taille, auto, created_at',
    [fichier, buf.length, auto, buf]);
  // Rotation : on garde les plus récentes.
  await query('DELETE FROM sauvegardes WHERE id NOT IN (SELECT id FROM sauvegardes ORDER BY created_at DESC LIMIT $1)', [CONSERVEES]);
  return row;
}

module.exports = { sauvegarder, TABLES, CONSERVEES };
