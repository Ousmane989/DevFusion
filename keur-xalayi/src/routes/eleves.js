'use strict';

// Élèves : inscription, fiche, recherche, archivage, réinscription.
const express = require('express');
const { query, one, tx } = require('../db');
const { ah, HttpError, exiger, vide, normaliserTel, aujourdhui } = require('../utils');
const { autoriser, verifierClasse } = require('../auth');
const { soldeInscription } = require('../services/finance');
const pdf = require('../services/pdf');

const router = express.Router();
const gestion = autoriser('directeur'); // inscriptions et modifications : espace directrice

const CHAMPS = ['nom', 'prenom', 'sexe', 'date_naissance', 'lieu_naissance', 'pere_nom', 'mere_nom',
  'tuteur_nom', 'whatsapp', 'telephone2', 'adresse', 'remarques'];

/** Valide et nettoie les champs d'une fiche élève. */
async function nettoyer(body, partiel = false) {
  const p = await one('SELECT indicatif_defaut FROM parametres WHERE id = 1');
  const d = {};
  for (const c of CHAMPS) if (body[c] !== undefined) d[c] = vide(typeof body[c] === 'string' ? body[c].trim() : body[c]);
  // Le numéro WhatsApp du parent est demandé par le formulaire, mais peut rester « à compléter »
  // (élèves repris d'un registre papier) : ils sont alors exclus des envois WhatsApp.
  if (!partiel) exiger(d, ['nom', 'prenom', 'sexe']);
  for (const c of ['nom', 'prenom', 'sexe']) {
    if (c in d && d[c] === null) throw new HttpError(400, 'Le nom, le prénom et le sexe sont obligatoires.');
  }
  if (d.nom) d.nom = d.nom.toUpperCase();
  if (d.sexe && !['M', 'F'].includes(d.sexe)) throw new HttpError(400, 'Sexe invalide.');
  if (d.whatsapp !== undefined && d.whatsapp !== null) {
    const t = normaliserTel(d.whatsapp, p.indicatif_defaut);
    if (!t) throw new HttpError(400, 'Numéro WhatsApp invalide : vérifiez l\'indicatif du pays et le nombre de chiffres (ex. +221 77 123 45 67).');
    d.whatsapp = t;
  }
  if (d.telephone2) {
    const t = normaliserTel(d.telephone2, p.indicatif_defaut);
    if (!t) throw new HttpError(400, 'Second numéro de téléphone invalide.');
    d.telephone2 = t;
  }
  if (body.photo !== undefined) {
    if (body.photo && !/^data:image\/(png|jpe?g);base64,/.test(body.photo)) throw new HttpError(400, 'La photo doit être une image JPEG ou PNG.');
    if (body.photo && body.photo.length > 700000) throw new HttpError(413, 'Photo trop lourde.');
    d.photo = vide(body.photo);
  }
  return d;
}

// ---- Liste / recherche ----
router.get('/', ah(async (req, res) => {
  const { q, classe_id, statut = 'actif', sexe } = req.query;
  const params = [];
  const where = [];
  // Archivés : on montre leur dernière inscription ; actifs : celle de l'année active.
  if (statut !== 'tous') { params.push(statut); where.push(`e.statut = $${params.length}`); }
  if (q) {
    params.push(`%${String(q).trim().toLowerCase()}%`);
    const k = `$${params.length}`;
    where.push(`(lower(e.nom) LIKE ${k} OR lower(e.prenom) LIKE ${k} OR lower(e.nom || ' ' || e.prenom) LIKE ${k}
      OR lower(e.prenom || ' ' || e.nom) LIKE ${k} OR lower(e.matricule) LIKE ${k} OR e.whatsapp LIKE ${k}
      OR lower(COALESCE(e.pere_nom,'') || ' ' || COALESCE(e.mere_nom,'') || ' ' || COALESCE(e.tuteur_nom,'')) LIKE ${k})`);
  }
  if (classe_id) { params.push(classe_id); where.push(`c.id = $${params.length}`); }
  if (sexe) { params.push(sexe); where.push(`e.sexe = $${params.length}`); }
  if (req.user.classes) { params.push(req.user.classes); where.push(`c.id = ANY($${params.length})`); }
  const rows = await query(
    `SELECT e.id, e.matricule, e.nom, e.prenom, e.sexe, e.date_naissance, e.whatsapp, e.telephone2, e.statut,
            e.date_sortie, e.motif_sortie, (e.photo IS NOT NULL) AS a_photo, e.remarques,
            COALESCE(NULLIF(e.tuteur_nom,''), NULLIF(e.pere_nom,''), NULLIF(e.mere_nom,'')) AS parent,
            i.id AS inscription_id, c.id AS classe_id, c.nom AS classe, i.date_inscription, i.mensualite, i.reduction
       FROM eleves e
       LEFT JOIN LATERAL (
         SELECT i.* FROM inscriptions i JOIN annees_scolaires a ON a.id = i.annee_id
          WHERE i.eleve_id = e.id ORDER BY a.active DESC, a.date_debut DESC LIMIT 1) i ON TRUE
       LEFT JOIN classes c ON c.id = i.classe_id
       LEFT JOIN niveaux n ON n.id = c.niveau_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY n.ordre NULLS LAST, c.nom, e.nom, e.prenom
      LIMIT 2000`, params);
  if (req.user.role === 'enseignant') rows.forEach(masquerTarifs);
  res.json(rows);
}));

/** Les enseignants ne voient ni les tarifs ni les réductions (et leur motif) des élèves. */
const TARIFS = ['frais_inscription', 'mensualite', 'reduction', 'reduction_motif'];
function masquerTarifs(ligne) { TARIFS.forEach((k) => delete ligne[k]); return ligne; }

// ---- Fiche complète ----
router.get('/:id', ah(async (req, res) => {
  const e = await one('SELECT * FROM eleves WHERE id = $1', [req.params.id]);
  if (!e) throw new HttpError(404, 'Élève introuvable.');
  const inscriptions = await query(
    `SELECT i.*, c.nom AS classe, a.libelle AS annee, a.active
       FROM inscriptions i JOIN classes c ON c.id = i.classe_id JOIN annees_scolaires a ON a.id = i.annee_id
      WHERE i.eleve_id = $1 ORDER BY a.date_debut DESC`, [e.id]);
  const courante = inscriptions.find((i) => i.active) || null;
  if (req.user.classes) {
    if (!courante) throw new HttpError(403, 'Élève hors de votre classe.');
    verifierClasse(req, courante.classe_id);
  }
  if (req.user.role === 'enseignant') inscriptions.forEach(masquerTarifs);
  const resultat = { eleve: e, inscriptions, inscription: courante };
  if (courante && req.user.role !== 'enseignant') {
    resultat.solde = await soldeInscription(courante.id);
    resultat.paiements = await query(
      `SELECT p.*, u.nom_complet AS encaisse_par_nom FROM paiements p LEFT JOIN utilisateurs u ON u.id = p.encaisse_par
        WHERE p.inscription_id = ANY($1) ORDER BY p.date_paiement DESC, p.id DESC`, [inscriptions.map((i) => i.id)]);
  }
  if (courante) {
    resultat.presences = await one(
      `SELECT COUNT(*) FILTER (WHERE statut = 'present') AS presents, COUNT(*) FILTER (WHERE statut = 'absent') AS absents,
              COUNT(*) FILTER (WHERE statut = 'retard') AS retards, COUNT(*) AS total
         FROM presences WHERE inscription_id = $1`, [courante.id]);
    resultat.dernieresAbsences = await query(
      `SELECT date, statut, remarque FROM presences WHERE inscription_id = $1 AND statut <> 'present' ORDER BY date DESC LIMIT 10`,
      [courante.id]);
  }
  res.json(resultat);
}));

// Photo servie comme image (évite de charger les photos dans les listes).
router.get('/:id/photo', ah(async (req, res) => {
  if (req.user.classes) { // enseignant : seulement les élèves de sa classe
    const i = await one(
      `SELECT i.classe_id FROM inscriptions i JOIN annees_scolaires a ON a.id = i.annee_id WHERE i.eleve_id = $1 AND a.active`,
      [req.params.id]);
    if (!i) throw new HttpError(403, 'Élève hors de votre classe.');
    verifierClasse(req, i.classe_id);
  }
  const e = await one('SELECT photo FROM eleves WHERE id = $1', [req.params.id]);
  if (!e || !e.photo) return res.status(404).end();
  const [, mime, b64] = e.photo.match(/^data:(image\/[a-z]+);base64,(.*)$/) || [];
  if (!mime) return res.status(404).end();
  res.set('Content-Type', mime).set('Cache-Control', 'private, max-age=300').send(Buffer.from(b64, 'base64'));
}));

/** Tarifs effectifs d'une classe (propres à la classe ou ceux du niveau). */
async function tarifClasse(c, classeId) {
  const cl = await c.one(
    `SELECT c.*, COALESCE(c.frais_inscription, n.frais_inscription) AS frais, COALESCE(c.mensualite, n.mensualite) AS mens,
            a.active FROM classes c JOIN niveaux n ON n.id = c.niveau_id JOIN annees_scolaires a ON a.id = c.annee_id WHERE c.id = $1`,
    [classeId]);
  if (!cl) throw new HttpError(404, 'Classe introuvable.');
  return cl;
}

function montantsInscription(body, cl) {
  const frais = vide(body.frais_inscription) !== null ? Number(body.frais_inscription) : cl.frais;
  const mens = vide(body.mensualite) !== null ? Number(body.mensualite) : cl.mens;
  const red = Number(body.reduction || 0);
  if (!(frais >= 0) || !(mens >= 0) || !(red >= 0)) throw new HttpError(400, 'Montants invalides.');
  if (red > mens) throw new HttpError(400, 'La réduction ne peut pas dépasser la mensualité.');
  if (red > 0 && !vide(body.reduction_motif)) throw new HttpError(400, 'Indiquez le motif de la réduction (fratrie, cas social…).');
  return { frais, mens, red, motif: red > 0 ? body.reduction_motif : null };
}

// ---- Facture d'inscription (PDF) : inscription de l'année active, ou ?inscription_id= ----
router.get('/:id/facture-inscription.pdf', gestion, ah(async (req, res) => {
  const insc = req.query.inscription_id
    ? await one('SELECT id FROM inscriptions WHERE id = $1 AND eleve_id = $2', [req.query.inscription_id, req.params.id])
    : await one(`SELECT i.id FROM inscriptions i JOIN annees_scolaires a ON a.id = i.annee_id
                  WHERE i.eleve_id = $1 ORDER BY a.active DESC, a.date_debut DESC LIMIT 1`, [req.params.id]);
  const f = insc && await pdf.factureInscription(insc.id);
  if (!f) throw new HttpError(404, 'Aucune inscription pour cet élève.');
  res.type('application/pdf').set('Content-Disposition', `inline; filename="facture-${f.numero}.pdf"`).send(f.buf);
}));

// ---- Nouvelle inscription ----
router.post('/', gestion, ah(async (req, res) => {
  const d = await nettoyer(req.body);
  exiger(req.body, ['classe_id']);
  const dateInsc = vide(req.body.date_inscription) || aujourdhui();
  const r = await tx(async (c) => {
    const cl = await tarifClasse(c, req.body.classe_id);
    if (!cl.active) throw new HttpError(400, 'Cette classe n\'appartient pas à l\'année active.');
    const m = montantsInscription(req.body, cl);
    const seq = await c.one("SELECT nextval('seq_matricule') AS n");
    const matricule = `KX${String(dateInsc).slice(2, 4)}-${String(seq.n).padStart(4, '0')}`;
    const cols = ['matricule', ...Object.keys(d)];
    const vals = [matricule, ...Object.values(d)];
    const eleve = await c.one(
      `INSERT INTO eleves (${cols.join(',')}) VALUES (${cols.map((_, i) => '$' + (i + 1)).join(',')}) RETURNING id, matricule`, vals);
    const insc = await c.one(
      `INSERT INTO inscriptions (eleve_id, annee_id, classe_id, date_inscription, frais_inscription, mensualite, reduction, reduction_motif)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [eleve.id, cl.annee_id, cl.id, dateInsc, m.frais, m.mens, m.red, m.motif]);
    return { ...eleve, inscription_id: insc.id };
  });
  res.status(201).json(r);
}));

// ---- Modification de la fiche (et de l'inscription courante) ----
router.put('/:id', gestion, ah(async (req, res) => {
  const d = await nettoyer(req.body, true);
  await tx(async (c) => {
    if (Object.keys(d).length) {
      const sets = Object.keys(d).map((k, i) => `${k} = $${i + 1}`);
      await c.query(`UPDATE eleves SET ${sets.join(', ')} WHERE id = $${sets.length + 1}`, [...Object.values(d), req.params.id]);
    }
    const insc = await c.one(
      `SELECT i.* FROM inscriptions i JOIN annees_scolaires a ON a.id = i.annee_id WHERE i.eleve_id = $1 AND a.active`, [req.params.id]);
    if (insc && (req.body.classe_id || req.body.mensualite !== undefined || req.body.reduction !== undefined)) {
      const cl = await tarifClasse(c, req.body.classe_id || insc.classe_id);
      if (!cl.active) throw new HttpError(400, 'Cette classe n\'appartient pas à l\'année active.');
      const m = montantsInscription({
        frais_inscription: req.body.frais_inscription ?? insc.frais_inscription,
        mensualite: req.body.mensualite ?? insc.mensualite,
        reduction: req.body.reduction ?? insc.reduction,
        reduction_motif: req.body.reduction_motif ?? insc.reduction_motif,
      }, cl);
      await c.query(
        `UPDATE inscriptions SET classe_id = $1, frais_inscription = $2, mensualite = $3, reduction = $4, reduction_motif = $5,
                date_inscription = COALESCE($6, date_inscription) WHERE id = $7`,
        [cl.id, m.frais, m.mens, m.red, m.motif, vide(req.body.date_inscription), insc.id]);
    }
  });
  res.json({ ok: true });
}));

// ---- Archivage (élève qui quitte l'école) ----
router.post('/:id/archiver', gestion, ah(async (req, res) => {
  await tx(async (c) => {
    await c.query(`UPDATE eleves SET statut = 'archive', date_sortie = $1, motif_sortie = $2 WHERE id = $3`,
      [vide(req.body.date_sortie) || aujourdhui(), vide(req.body.motif) || 'Départ', req.params.id]);
    await c.query(
      `UPDATE inscriptions i SET decision = 'parti' FROM annees_scolaires a
        WHERE a.id = i.annee_id AND a.active AND i.eleve_id = $1`, [req.params.id]);
  });
  res.json({ ok: true });
}));

// ---- Réinscription (élève archivé qui revient, ou élève non encore inscrit cette année) ----
router.post('/:id/reinscrire', gestion, ah(async (req, res) => {
  exiger(req.body, ['classe_id']);
  await tx(async (c) => {
    const cl = await tarifClasse(c, req.body.classe_id);
    if (!cl.active) throw new HttpError(400, 'Choisissez une classe de l\'année active.');
    const m = montantsInscription(req.body, cl);
    const existe = await c.one('SELECT id FROM inscriptions WHERE eleve_id = $1 AND annee_id = $2', [req.params.id, cl.annee_id]);
    if (existe) {
      await c.query(
        `UPDATE inscriptions SET classe_id = $1, decision = 'en_cours', frais_inscription = $2, mensualite = $3, reduction = $4, reduction_motif = $5 WHERE id = $6`,
        [cl.id, m.frais, m.mens, m.red, m.motif, existe.id]);
    } else {
      await c.query(
        `INSERT INTO inscriptions (eleve_id, annee_id, classe_id, date_inscription, frais_inscription, mensualite, reduction, reduction_motif)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [req.params.id, cl.annee_id, cl.id, vide(req.body.date_inscription) || aujourdhui(), m.frais, m.mens, m.red, m.motif]);
    }
    await c.query(`UPDATE eleves SET statut = 'actif', date_sortie = NULL, motif_sortie = NULL WHERE id = $1`, [req.params.id]);
  });
  res.json({ ok: true });
}));

module.exports = router;
