'use strict';

// ------------------------------------------------------------------
// Formation Karat — URLs des vidéos (une introduction + 5 chapitres).
// Les métadonnées (titres, descriptions) vivent côté interface ; ici on
// ne stocke que le lien vidéo de chaque module, défini par l'administrateur
// et partagé par tous les commerçants. Stockage : app_config.formation_videos
// (JSON { intro, ch1, ch2, ch3, ch4, ch5 }).
// ------------------------------------------------------------------
const db = require('./db');

const MODULE_IDS = ['intro', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5'];
const KEY = 'formation_videos';

// Lien vide ou http(s) uniquement.
function validUrl(u) {
  const s = String(u == null ? '' : u).trim();
  return s === '' || /^https?:\/\//i.test(s);
}

// Renvoie toujours un objet complet { intro:'', ch1:'', … } (chaînes).
async function readFormation() {
  const row = await db.prepare('SELECT value FROM app_config WHERE key = ?').get(KEY);
  let obj = {};
  if (row && row.value) {
    try { obj = JSON.parse(row.value) || {}; } catch (_) { obj = {}; }
  }
  const out = {};
  MODULE_IDS.forEach((id) => { out[id] = typeof obj[id] === 'string' ? obj[id].trim() : ''; });
  return out;
}

// Fusionne les liens fournis dans la configuration existante (mise à jour
// partielle : seuls les champs présents sont modifiés).
async function writeFormation(input) {
  const cur = await readFormation();
  MODULE_IDS.forEach((id) => {
    if (input && Object.prototype.hasOwnProperty.call(input, id)) {
      cur[id] = String(input[id] == null ? '' : input[id]).trim();
    }
  });
  await db.prepare(
    'INSERT INTO app_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(KEY, JSON.stringify(cur));
  return cur;
}

module.exports = { MODULE_IDS, readFormation, writeFormation, validUrl };
