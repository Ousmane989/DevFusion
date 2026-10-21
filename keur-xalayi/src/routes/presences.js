'use strict';

// Présences : appel quotidien, notification des absences, statistiques.
const express = require('express');
const { query, one, tx } = require('../db');
const { ah, HttpError, exiger, aujourdhui, dateFr, remplir } = require('../utils');
const { autoriser, verifierClasse } = require('../auth');
const { envoyerMessages } = require('../services/whatsapp');

const router = express.Router();
const STATUTS = { present: 'présent(e)', absent: 'absent(e)', retard: 'en retard' };

// ---- Feuille d'appel d'une classe pour un jour ----
router.get('/appel', ah(async (req, res) => {
  exiger(req.query, ['classe_id']);
  verifierClasse(req, req.query.classe_id);
  const date = req.query.date || aujourdhui();
  const eleves = await query(
    `SELECT i.id AS inscription_id, e.id AS eleve_id, e.nom, e.prenom, e.sexe, (e.photo IS NOT NULL) AS a_photo, e.remarques,
            pr.statut, pr.remarque, pr.notifie
       FROM inscriptions i JOIN eleves e ON e.id = i.eleve_id
       LEFT JOIN presences pr ON pr.inscription_id = i.id AND pr.date = $2
      WHERE i.classe_id = $1 AND e.statut = 'actif' AND i.decision <> 'parti'
      ORDER BY e.nom, e.prenom`, [req.query.classe_id, date]);
  res.json({ date, deja_fait: eleves.some((e) => e.statut), eleves });
}));

// ---- Enregistrement de l'appel ----
router.post('/appel', autoriser('directeur', 'enseignant'), ah(async (req, res) => {
  exiger(req.body, ['classe_id', 'presences']);
  if (!Array.isArray(req.body.presences)) throw new HttpError(400, 'Liste des présences attendue.');
  verifierClasse(req, req.body.classe_id);
  const date = req.body.date || aujourdhui();
  if (date > aujourdhui()) throw new HttpError(400, 'Impossible de faire l\'appel pour une date future.');
  const valides = new Set((await query('SELECT id FROM inscriptions WHERE classe_id = $1', [req.body.classe_id])).map((r) => r.id));
  await tx(async (c) => {
    for (const p of req.body.presences) {
      if (!STATUTS[p.statut] || !valides.has(Number(p.inscription_id))) continue;
      await c.query(
        `INSERT INTO presences (inscription_id, date, statut, remarque, saisi_par) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (inscription_id, date) DO UPDATE SET statut = EXCLUDED.statut, remarque = EXCLUDED.remarque,
           saisi_par = EXCLUDED.saisi_par, notifie = CASE WHEN presences.statut = EXCLUDED.statut THEN presences.notifie ELSE FALSE END`,
        [p.inscription_id, date, p.statut, p.remarque || null, req.user.id]);
    }
  });

  // Notification WhatsApp des absences et retards (sur demande ou automatique).
  const prm = await one('SELECT * FROM parametres WHERE id = 1');
  let messages = [];
  if (req.body.notifier || prm.notif_absence_auto) {
    const aNotifier = await query(
      `SELECT pr.id, pr.statut, e.id AS eleve_id, e.prenom, e.nom, e.whatsapp, c.nom AS classe,
              COALESCE(NULLIF(e.tuteur_nom,''), NULLIF(e.pere_nom,''), NULLIF(e.mere_nom,''), 'Parent') AS parent
         FROM presences pr JOIN inscriptions i ON i.id = pr.inscription_id JOIN eleves e ON e.id = i.eleve_id
         JOIN classes c ON c.id = i.classe_id
        WHERE i.classe_id = $1 AND pr.date = $2 AND pr.statut <> 'present' AND NOT pr.notifie`, [req.body.classe_id, date]);
    if (aNotifier.length) {
      messages = await envoyerMessages(aNotifier.map((a) => ({
        telephone: a.whatsapp, destinataire: a.parent, eleve_id: a.eleve_id,
        texte: remplir(prm.modele_absence, {
          nom_parent: a.parent, nom_eleve: `${a.prenom} ${a.nom}`, classe: a.classe, statut: STATUTS[a.statut], date: dateFr(date), ecole: prm.nom_ecole,
        }),
      })), { type: 'absence', userId: req.user.id });
      await query('UPDATE presences SET notifie = TRUE WHERE id = ANY($1)', [aNotifier.map((a) => a.id)]);
    }
  }
  res.json({ ok: true, messages });
}));

// ---- Vue du jour pour toute l'école ----
router.get('/jour', ah(async (req, res) => {
  const date = req.query.date || aujourdhui();
  const params = [date];
  let filtre = '';
  if (req.user.classes) { params.push(req.user.classes); filtre = `AND c.id = ANY($2)`; }
  const classes = await query(
    `SELECT c.id, c.nom, COUNT(i.id) FILTER (WHERE e.statut = 'actif' AND i.decision <> 'parti') AS effectif,
            COUNT(pr.id) AS saisis,
            COUNT(pr.id) FILTER (WHERE pr.statut = 'absent') AS absents,
            COUNT(pr.id) FILTER (WHERE pr.statut = 'retard') AS retards
       FROM classes c JOIN annees_scolaires a ON a.id = c.annee_id AND a.active
       JOIN niveaux n ON n.id = c.niveau_id
       LEFT JOIN inscriptions i ON i.classe_id = c.id LEFT JOIN eleves e ON e.id = i.eleve_id
       LEFT JOIN presences pr ON pr.inscription_id = i.id AND pr.date = $1
      WHERE TRUE ${filtre} GROUP BY c.id, n.ordre ORDER BY n.ordre, c.nom`, params);
  const absents = await query(
    `SELECT e.id AS eleve_id, e.prenom, e.nom, e.whatsapp, c.nom AS classe, pr.statut, pr.remarque, pr.notifie
       FROM presences pr JOIN inscriptions i ON i.id = pr.inscription_id JOIN eleves e ON e.id = i.eleve_id
       JOIN classes c ON c.id = i.classe_id
      WHERE pr.date = $1 AND pr.statut <> 'present' ${filtre} ORDER BY c.nom, e.nom`, params);
  res.json({ date, classes, absents });
}));

// ---- Statistiques d'assiduité ----
router.get('/stats', ah(async (req, res) => {
  const active = await one('SELECT date_debut FROM annees_scolaires WHERE active');
  const du = req.query.du || (active ? active.date_debut : aujourdhui());
  const au = req.query.au || aujourdhui();
  const params = [du, au];
  let filtre = '';
  if (req.query.classe_id) { verifierClasse(req, req.query.classe_id); params.push(req.query.classe_id); filtre = `AND c.id = $${params.length}`; }
  if (req.user.classes) { params.push(req.user.classes); filtre += ` AND c.id = ANY($${params.length})`; }
  const parEleve = await query(
    `SELECT e.id AS eleve_id, e.prenom, e.nom, c.nom AS classe,
            COUNT(pr.id) AS jours, COUNT(pr.id) FILTER (WHERE pr.statut = 'present') AS presents,
            COUNT(pr.id) FILTER (WHERE pr.statut = 'absent') AS absents, COUNT(pr.id) FILTER (WHERE pr.statut = 'retard') AS retards
       FROM inscriptions i JOIN eleves e ON e.id = i.eleve_id JOIN classes c ON c.id = i.classe_id
       JOIN annees_scolaires a ON a.id = i.annee_id AND a.active JOIN niveaux n ON n.id = c.niveau_id
       LEFT JOIN presences pr ON pr.inscription_id = i.id AND pr.date BETWEEN $1 AND $2
      WHERE e.statut = 'actif' ${filtre} GROUP BY e.id, c.id, n.ordre ORDER BY n.ordre, c.nom, e.nom`, params);
  parEleve.forEach((x) => { x.taux = x.jours ? Math.round(((x.presents + x.retards) / x.jours) * 1000) / 10 : null; });
  const parClasse = {};
  for (const x of parEleve) {
    const k = parClasse[x.classe] || (parClasse[x.classe] = { classe: x.classe, jours: 0, presents: 0, absents: 0, retards: 0 });
    k.jours += x.jours; k.presents += x.presents; k.absents += x.absents; k.retards += x.retards;
  }
  const classes = Object.values(parClasse).map((k) => ({ ...k, taux: k.jours ? Math.round(((k.presents + k.retards) / k.jours) * 1000) / 10 : null }));
  res.json({ du, au, eleves: parEleve, classes });
}));

module.exports = router;
