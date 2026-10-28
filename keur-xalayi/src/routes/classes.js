'use strict';

// Classes de l'année active (groupes par niveau, titulaire, effectif, tarifs)
// et emploi du temps.
const express = require('express');
const { query, one } = require('../db');
const { ah, HttpError, exiger, vide } = require('../utils');
const { autoriser, verifierClasse } = require('../auth');

const router = express.Router();

/** Liste des classes d'une année (active par défaut) avec effectifs. */
async function listeClasses(anneeId, classesAutorisees) {
  const params = [];
  let filtreAnnee = 'a.active';
  if (anneeId) { params.push(anneeId); filtreAnnee = `a.id = $${params.length}`; }
  let filtre = '';
  if (classesAutorisees) { params.push(classesAutorisees); filtre = ` AND c.id = ANY($${params.length})`; }
  return query(
    `SELECT c.*, n.code AS niveau_code, n.nom AS niveau_nom, n.ordre, n.cycle,
            COALESCE(c.frais_inscription, n.frais_inscription) AS frais_effectif,
            COALESCE(c.mensualite, n.mensualite) AS mensualite_effective,
            n.fournitures AS fournitures_effectif, n.uniforme AS uniforme_effectif, n.blouson AS blouson_effectif,
            p.nom || ' ' || p.prenom AS enseignant, p.telephone AS enseignant_tel,
            COUNT(i.id) FILTER (WHERE e.statut = 'actif' AND i.decision <> 'parti') AS effectif,
            COUNT(i.id) FILTER (WHERE e.statut = 'actif' AND i.decision <> 'parti' AND e.sexe = 'M') AS garcons,
            COUNT(i.id) FILTER (WHERE e.statut = 'actif' AND i.decision <> 'parti' AND e.sexe = 'F') AS filles
       FROM classes c
       JOIN annees_scolaires a ON a.id = c.annee_id
       JOIN niveaux n ON n.id = c.niveau_id
       LEFT JOIN personnel p ON p.id = c.enseignant_id
       LEFT JOIN inscriptions i ON i.classe_id = c.id
       LEFT JOIN eleves e ON e.id = i.eleve_id
      WHERE ${filtreAnnee} ${filtre}
      GROUP BY c.id, n.id, p.id
      ORDER BY n.ordre, c.groupe, c.nom`, params);
}

router.get('/', ah(async (req, res) => {
  res.json(await listeClasses(req.query.annee_id, req.user.classes));
}));

router.get('/:id', ah(async (req, res) => {
  verifierClasse(req, req.params.id);
  const [classe] = (await listeClasses(null, [Number(req.params.id)]));
  if (!classe) throw new HttpError(404, 'Classe introuvable.');
  const eleves = await query(
    `SELECT e.id, e.matricule, e.nom, e.prenom, e.sexe, e.date_naissance, e.photo IS NOT NULL AS a_photo,
            e.lieu_naissance, i.id AS inscription_id, i.numero, i.decision
       FROM inscriptions i JOIN eleves e ON e.id = i.eleve_id
      WHERE i.classe_id = $1 AND e.statut = 'actif' AND i.decision <> 'parti'
      ORDER BY i.numero, e.nom, e.prenom`, [req.params.id]);
  res.json({ ...classe, eleves });
}));

/** Crée un groupe : niveau + lettre (ex. CE1 + B -> « CE1 B »). */
router.post('/', autoriser('directeur'), ah(async (req, res) => {
  exiger(req.body, ['niveau_id']);
  const annee = await one('SELECT id FROM annees_scolaires WHERE active');
  if (!annee) throw new HttpError(400, 'Aucune année scolaire active.');
  const niveau = await one('SELECT * FROM niveaux WHERE id = $1', [req.body.niveau_id]);
  if (!niveau) throw new HttpError(404, 'Niveau introuvable.');
  const groupe = String(req.body.groupe || '').trim().toUpperCase();
  const nom = groupe ? `${niveau.nom} ${groupe}` : niveau.nom;
  const c = await one(
    `INSERT INTO classes (annee_id, niveau_id, groupe, nom, enseignant_id, salle) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [annee.id, niveau.id, groupe, nom, vide(req.body.enseignant_id), vide(req.body.salle)]);
  res.status(201).json(c);
}));

router.put('/:id', autoriser('directeur'), ah(async (req, res) => {
  const { enseignant_id, salle, frais_inscription, mensualite, groupe } = req.body;
  const c = await one('SELECT c.*, n.nom AS niveau_nom FROM classes c JOIN niveaux n ON n.id = c.niveau_id WHERE c.id = $1', [req.params.id]);
  if (!c) throw new HttpError(404, 'Classe introuvable.');
  const g = groupe !== undefined ? String(groupe).trim().toUpperCase() : c.groupe;
  // Seuls les champs envoyés sont modifiés ; montants vides = tarif du niveau.
  const garder = (cle, valeur) => (cle in req.body ? valeur : c[cle]);
  const tarif = (cle, v) => {
    if (vide(v) === null) return null;
    const x = Number(v);
    if (!Number.isFinite(x) || x < 0) throw new HttpError(400, 'Montant invalide.');
    return x;
  };
  await query(
    `UPDATE classes SET enseignant_id = $1, salle = $2, frais_inscription = $3, mensualite = $4, groupe = $5, nom = $6 WHERE id = $7`,
    [garder('enseignant_id', vide(enseignant_id)), garder('salle', vide(salle)),
      garder('frais_inscription', tarif('frais_inscription', frais_inscription)), garder('mensualite', tarif('mensualite', mensualite)),
      g, g ? `${c.niveau_nom} ${g}` : c.niveau_nom, c.id]);
  // Option : appliquer la nouvelle mensualité aux élèves déjà inscrits.
  if (req.body.appliquer_inscriptions && vide(mensualite) !== null) {
    await query('UPDATE inscriptions SET mensualite = $1, reduction = LEAST(reduction, $1) WHERE classe_id = $2', [tarif('mensualite', mensualite), c.id]);
  }
  res.json({ ok: true });
}));

router.delete('/:id', autoriser('directeur'), ah(async (req, res) => {
  const n = await one('SELECT COUNT(*) AS n FROM inscriptions WHERE classe_id = $1', [req.params.id]);
  if (n.n > 0) throw new HttpError(409, 'Impossible : des élèves sont inscrits dans cette classe.');
  await query('DELETE FROM classes WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
}));

// ---- Emploi du temps ----
router.get('/:id/emploi', ah(async (req, res) => {
  verifierClasse(req, req.params.id);
  res.json(await query('SELECT * FROM emploi_du_temps WHERE classe_id = $1 ORDER BY jour, heure_debut', [req.params.id]));
}));

router.post('/:id/emploi', autoriser('directeur'), ah(async (req, res) => {
  exiger(req.body, ['jour', 'heure_debut', 'heure_fin', 'matiere']);
  const { jour, heure_debut, heure_fin, matiere, intervenant } = req.body;
  res.status(201).json(await one(
    `INSERT INTO emploi_du_temps (classe_id, jour, heure_debut, heure_fin, matiere, intervenant)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.params.id, jour, heure_debut, heure_fin, matiere, vide(intervenant)]));
}));

router.delete('/:id/emploi/:creneau', autoriser('directeur'), ah(async (req, res) => {
  await query('DELETE FROM emploi_du_temps WHERE id = $1 AND classe_id = $2', [req.params.creneau, req.params.id]);
  res.json({ ok: true });
}));

module.exports = router;
module.exports.listeClasses = listeClasses;
