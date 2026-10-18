'use strict';

// Rappels, annonces et historique des messages WhatsApp.
const express = require('express');
const { query, one } = require('../db');
const { ah, HttpError, exiger, vide, remplir, normaliserTel } = require('../utils');
const { autoriser } = require('../auth');
const rappels = require('../services/rappels');
const { envoyerMessages, lienWaMe } = require('../services/whatsapp');

const router = express.Router();
router.use(autoriser('directeur', 'secretaire'));

const canalDe = (body) => (body.manuel ? 'manuel' : undefined);

// ---- Rappels de paiement ----
router.get('/rappels/calendrier', ah(async (req, res) => {
  res.json(await rappels.calendrier());
}));

router.post('/rappels/apercu', ah(async (req, res) => {
  exiger(req.body, ['mois']);
  const liste = await rappels.preparer(req.body.mois, req.body.type || 'rappel', {
    impayesSeulement: req.body.impayes_seulement, classeId: vide(req.body.classe_id),
  });
  res.json(liste);
}));

router.post('/rappels/envoyer', ah(async (req, res) => {
  exiger(req.body, ['mois']);
  const messages = await rappels.envoyer(req.body.mois, req.body.type || 'rappel', {
    impayesSeulement: req.body.impayes_seulement, classeId: vide(req.body.classe_id),
    userId: req.user.id, canal: canalDe(req.body),
  });
  res.json(messages);
}));

// ---- Annonces groupées ----
/**
 * cible : 'ecole' (tous les parents), 'classe' (classe_id), 'parent' (eleve_id),
 * ou 'numero' (telephone libre). Un seul message par famille (même numéro).
 * Variables : {nom_parent} {nom_eleve} {classe} {ecole}
 */
router.post('/annonce', ah(async (req, res) => {
  exiger(req.body, ['cible', 'texte']);
  const { cible, texte } = req.body;
  const p = await one('SELECT nom_ecole, indicatif_defaut FROM parametres WHERE id = 1');
  let destinataires = [];
  if (cible === 'numero') {
    const tel = normaliserTel(req.body.telephone, p.indicatif_defaut);
    if (!tel) throw new HttpError(400, 'Numéro invalide.');
    destinataires = [{ telephone: tel, parent: req.body.nom || '', eleves: [], classes: [] }];
  } else {
    const params = [];
    let filtre = '';
    if (cible === 'classe') { exiger(req.body, ['classe_id']); params.push(req.body.classe_id); filtre = 'AND i.classe_id = $1'; }
    else if (cible === 'parent') { exiger(req.body, ['eleve_id']); params.push(req.body.eleve_id); filtre = 'AND e.id = $1'; }
    else if (cible !== 'ecole') throw new HttpError(400, 'Cible invalide.');
    const rows = await query(
      `SELECT e.id, e.prenom, e.nom, e.whatsapp, c.nom AS classe,
              COALESCE(NULLIF(e.tuteur_nom,''), NULLIF(e.pere_nom,''), NULLIF(e.mere_nom,''), 'Parent') AS parent
         FROM eleves e JOIN inscriptions i ON i.eleve_id = e.id JOIN annees_scolaires a ON a.id = i.annee_id AND a.active
         JOIN classes c ON c.id = i.classe_id
        WHERE e.statut = 'actif' AND i.decision <> 'parti' ${filtre} ORDER BY e.whatsapp, e.prenom`, params);
    const familles = new Map();
    for (const r of rows) {
      const f = familles.get(r.whatsapp) || { telephone: r.whatsapp, parent: r.parent, eleve_id: r.id, eleves: [], classes: [] };
      f.eleves.push(r.prenom + ' ' + r.nom);
      if (!f.classes.includes(r.classe)) f.classes.push(r.classe);
      familles.set(r.whatsapp, f);
    }
    destinataires = [...familles.values()];
  }
  if (!destinataires.length) throw new HttpError(400, 'Aucun destinataire trouvé.');
  const liste = destinataires.map((d) => ({
    telephone: d.telephone, destinataire: d.parent, eleve_id: d.eleve_id,
    texte: remplir(texte, { nom_parent: d.parent, nom_eleve: d.eleves.join(' et '), classe: d.classes.join(', '), ecole: p.nom_ecole }),
  }));
  if (req.body.apercu) return res.json(liste);
  res.json(await envoyerMessages(liste, { type: 'annonce', userId: req.user.id, canal: canalDe(req.body) }));
}));

// ---- Historique ----
router.get('/historique', ah(async (req, res) => {
  const { type, statut, du, au, q, lot } = req.query;
  const params = []; const where = [];
  if (type) { params.push(type); where.push(`m.type = $${params.length}`); }
  if (statut) { params.push(statut); where.push(`m.statut = $${params.length}`); }
  if (lot) { params.push(lot); where.push(`m.lot = $${params.length}`); }
  if (du) { params.push(du); where.push(`m.created_at >= $${params.length}::date`); }
  if (au) { params.push(au); where.push(`m.created_at < ($${params.length}::date + 1)`); }
  if (q) { params.push(`%${String(q).toLowerCase()}%`); where.push(`(lower(COALESCE(m.destinataire,'')) LIKE $${params.length} OR m.telephone LIKE $${params.length} OR lower(m.contenu) LIKE $${params.length})`); }
  const rows = await query(
    `SELECT m.*, u.nom_complet AS envoye_par_nom, e.prenom || ' ' || e.nom AS eleve
       FROM messages m LEFT JOIN utilisateurs u ON u.id = m.envoye_par LEFT JOIN eleves e ON e.id = m.eleve_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY m.created_at DESC, m.id DESC LIMIT 500`, params);
  rows.forEach((r) => { r.lien = lienWaMe(r.telephone, r.contenu); });
  res.json(rows);
}));

// Marque un message manuel comme ouvert dans WhatsApp (clic sur le lien).
router.post('/messages/:id/ouvert', ah(async (req, res) => {
  await query(`UPDATE messages SET statut = 'ouvert' WHERE id = $1 AND statut IN ('a_envoyer','echec')`, [req.params.id]);
  res.json({ ok: true });
}));

// Renvoyer un message (par l'API si configurée).
router.post('/messages/:id/renvoyer', ah(async (req, res) => {
  const m = await one('SELECT * FROM messages WHERE id = $1', [req.params.id]);
  if (!m) throw new HttpError(404, 'Message introuvable.');
  const [nouveau] = await envoyerMessages([{ telephone: m.telephone, texte: m.contenu, destinataire: m.destinataire, eleve_id: m.eleve_id }],
    { type: m.type, mois: m.mois, userId: req.user.id, canal: canalDe(req.body) });
  res.json(nouveau);
}));

// Message de test.
router.post('/test', autoriser('directeur'), ah(async (req, res) => {
  const p = await one('SELECT nom_ecole, indicatif_defaut FROM parametres WHERE id = 1');
  const tel = normaliserTel(req.body.telephone, p.indicatif_defaut);
  if (!tel) throw new HttpError(400, 'Numéro invalide.');
  const [m] = await envoyerMessages([{ telephone: tel, texte: `Message de test — ${p.nom_ecole}. La connexion WhatsApp fonctionne.` }], { type: 'test', userId: req.user.id });
  res.json(m);
}));

module.exports = router;
