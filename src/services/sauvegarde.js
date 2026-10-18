'use strict';

// Sauvegarde complète des données en JSON compressé (gzip).
// Les 30 dernières sauvegardes sont conservées dans le dossier « sauvegardes/ ».
// Pour une sauvegarde au niveau serveur, utilisez aussi pg_dump ou les
// sauvegardes automatiques de Supabase.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const config = require('../config');
const { query } = require('../db');

const TABLES = ['parametres', 'annees_scolaires', 'niveaux', 'personnel', 'utilisateurs', 'classes', 'eleves', 'inscriptions',
  'paiements', 'messages', 'rappels_executions', 'presences', 'matieres', 'notes', 'competences', 'appreciations',
  'observations', 'salaires', 'depenses', 'emploi_du_temps', 'evenements'];

async function sauvegarder({ auto = true } = {}) {
  fs.mkdirSync(config.dossierSauvegardes, { recursive: true });
  const donnees = { version: 1, date: new Date().toISOString(), tables: {} };
  for (const t of TABLES) donnees.tables[t] = await query(`SELECT * FROM ${t}`);
  const horodatage = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  const fichier = `keur-xalayi-${horodatage}.json.gz`;
  const buf = zlib.gzipSync(JSON.stringify(donnees));
  fs.writeFileSync(path.join(config.dossierSauvegardes, fichier), buf);
  const [row] = await query('INSERT INTO sauvegardes (fichier, taille, auto) VALUES ($1,$2,$3) RETURNING *', [fichier, buf.length, auto]);

  // Rotation : on garde les 30 plus récentes.
  const anciennes = await query('SELECT * FROM sauvegardes ORDER BY created_at DESC OFFSET 30');
  for (const a of anciennes) {
    fs.rmSync(path.join(config.dossierSauvegardes, path.basename(a.fichier)), { force: true });
    await query('DELETE FROM sauvegardes WHERE id = $1', [a.id]);
  }
  return row;
}

module.exports = { sauvegarder, TABLES };
