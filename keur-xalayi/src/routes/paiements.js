'use strict';

// Paiements : encaissement, journal, statut par mois, impayés, reçus.
const express = require('express');
const { query, one, tx } = require('../db');
const { ah, HttpError, exiger, vide, aujourdhui, debutMois, nomMois, deMois, montant, remplir, MODES_PAIEMENT, FRAIS_ANNEXES, objetPaiement } = require('../utils');
const { autoriser } = require('../auth');
const finance = require('../services/finance');
const pdf = require('../services/pdf');
const { envoyerMessages } = require('../services/whatsapp');
const { lienRecu } = require('../services/liens');

const router = express.Router();
router.use(autoriser('directeur'));

// ---- Journal des paiements ----
router.get('/', ah(async (req, res) => {
  const { du, au, mode, classe_id, q, type } = req.query;
  const params = []; const where = [];
  if (du) { params.push(du); where.push(`p.date_paiement >= $${params.length}`); }
  if (au) { params.push(au); where.push(`p.date_paiement <= $${params.length}`); }
  if (mode) { params.push(mode); where.push(`p.mode = $${params.length}`); }
  if (type) { params.push(type); where.push(`p.type = $${params.length}`); }
  if (classe_id) { params.push(classe_id); where.push(`i.classe_id = $${params.length}`); }
  if (q) {
    params.push(`%${String(q).toLowerCase()}%`);
    where.push(`(lower(e.nom || ' ' || e.prenom) LIKE $${params.length} OR lower(e.matricule) LIKE $${params.length} OR lower(p.numero_recu) LIKE $${params.length})`);
  }
  const rows = await query(
    `SELECT p.*, e.id AS eleve_id, e.matricule, e.nom, e.prenom, c.nom AS classe, u.nom_complet AS encaisse_par_nom
       FROM paiements p JOIN inscriptions i ON i.id = p.inscription_id JOIN eleves e ON e.id = i.eleve_id
       JOIN classes c ON c.id = i.classe_id LEFT JOIN utilisateurs u ON u.id = p.encaisse_par
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY p.date_paiement DESC, p.id DESC LIMIT 1000`, params);
  const total = rows.filter((r) => !r.annule).reduce((s, r) => s + r.montant, 0);
  res.json({ paiements: rows, total });
}));

// ---- Statut de tous les élèves pour un mois ----
router.get('/statut', ah(async (req, res) => {
  const annee = await finance.anneeActiveRequise();
  const mois = req.query.mois || finance.moisEchus(annee).slice(-1)[0] || finance.moisAnnee(annee)[0];
  const liste = await finance.situationMois(mois, { classeId: req.query.classe_id });
  res.json({ mois, liste, resume: await finance.resumeMois(mois, { classeId: req.query.classe_id }) });
}));

// ---- Grille élèves × mois d'une classe ----
router.get('/grille', ah(async (req, res) => {
  exiger(req.query, ['classe_id']);
  const annee = await finance.anneeActiveRequise();
  const mois = finance.moisAnnee(annee);
  const parEleve = {};
  for (const m of mois) {
    for (const s of await finance.situationMois(m, { classeId: req.query.classe_id })) {
      parEleve[s.inscription_id] = parEleve[s.inscription_id] || { ...s, mois: {} };
      parEleve[s.inscription_id].mois[m] = { statut: s.statut, verse: s.verse, du: s.du };
    }
  }
  res.json({ mois, echus: finance.moisEchus(annee), eleves: Object.values(parEleve).sort((a, b) => a.nom.localeCompare(b.nom)) });
}));

// ---- Impayés ----
router.get('/impayes', ah(async (req, res) => {
  const liste = await finance.impayes({ mois: vide(req.query.mois), classeId: vide(req.query.classe_id) });
  res.json({ liste, total: liste.reduce((s, x) => s + x.reste, 0) });
}));

// ---- Mois disponibles de l'année active ----
router.get('/mois', ah(async (req, res) => {
  const annee = await finance.anneeActiveRequise();
  res.json({ mois: finance.moisAnnee(annee), echus: finance.moisEchus(annee) });
}));

/**
 * Encaissement. Corps :
 *  { inscription_id, type: 'mensualite'|'inscription'|'autre', mois: ['2026-10-01', …],
 *    montant, mode, reference, date_paiement, remarque }
 * Pour plusieurs mois, le montant est réparti dans l'ordre (en soldant chaque mois).
 * Un seul numéro de reçu couvre toutes les lignes.
 */
router.post('/', ah(async (req, res) => {
  exiger(req.body, ['inscription_id', 'montant', 'mode']);
  const { inscription_id, type = 'mensualite', mode, reference, remarque } = req.body;
  const total = Number(req.body.montant);
  if (!(total > 0) || !Number.isFinite(total) || total > 1e9) throw new HttpError(400, 'Montant invalide.');
  if (!MODES_PAIEMENT[mode]) throw new HttpError(400, 'Mode de paiement invalide.');
  if (!['mensualite', 'inscription', 'autre', ...Object.keys(FRAIS_ANNEXES)].includes(type)) throw new HttpError(400, 'Type de paiement invalide.');
  const datePaiement = vide(req.body.date_paiement) || aujourdhui();
  if (typeof datePaiement !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(datePaiement)) throw new HttpError(400, 'Date de paiement invalide.');
  // Mois ramenés au 1er du mois, sans doublon (« 2026-11-15 » = novembre 2026).
  const moisListe = [...new Set((Array.isArray(req.body.mois) ? req.body.mois : [req.body.mois])
    .filter((m) => typeof m === 'string' && /^\d{4}-\d{2}/.test(m)).map(debutMois))].sort();
  const centimes = (x) => Math.round(Number(x) * 100); // calculs en centimes : pas d'erreur d'arrondi

  const numero = await tx(async (c) => {
    const insc = await c.one('SELECT * FROM inscriptions WHERE id = $1 FOR UPDATE', [inscription_id]);
    if (!insc) throw new HttpError(404, 'Inscription introuvable.');
    const seq = await c.one("SELECT nextval('seq_recu') AS n");
    const num = `R${datePaiement.slice(2, 4)}${datePaiement.slice(5, 7)}-${String(seq.n).padStart(5, '0')}`;
    const inserer = (t, m, montantLigne) => c.query(
      `INSERT INTO paiements (inscription_id, type, mois, montant, date_paiement, mode, reference, numero_recu, remarque, encaisse_par)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [insc.id, t, m, montantLigne, datePaiement, mode, vide(reference), num, vide(remarque), req.user.id]);

    if (type === 'mensualite') {
      if (!moisListe.length) throw new HttpError(400, 'Choisissez le ou les mois payés.');
      const annee = await c.one('SELECT date_debut, date_fin FROM annees_scolaires WHERE id = $1', [insc.annee_id]);
      const moisValides = finance.moisAnnee(annee);
      const horsAnnee = moisListe.find((m) => !moisValides.includes(m));
      if (horsAnnee) throw new HttpError(400, `${nomMois(horsAnnee)} ne fait pas partie de l'année scolaire de cette inscription.`);
      const du = centimes(insc.mensualite - insc.reduction);
      let restant = centimes(total);
      for (let k = 0; k < moisListe.length; k++) {
        const m = moisListe[k];
        const deja = await c.one(
          `SELECT COALESCE(SUM(montant),0) AS v FROM paiements WHERE inscription_id = $1 AND type = 'mensualite' AND mois = $2 AND NOT annule`,
          [insc.id, m]);
        const reste = Math.max(0, du - centimes(deja.v));
        const derniere = k === moisListe.length - 1;
        if (reste === 0 && !derniere) continue;
        const part = derniere ? restant : Math.min(restant, reste);
        if (derniere && part > reste) {
          throw new HttpError(400, `Le montant dépasse le reste dû (${montant(reste / 100)} pour ${nomMois(m)}). Ajoutez un mois ou corrigez le montant.`);
        }
        if (part > 0) await inserer('mensualite', m, part / 100);
        restant -= part;
        if (restant <= 0) break;
      }
      if (restant > 0) throw new HttpError(400, 'Le montant dépasse le total dû pour les mois choisis.');
    } else {
      if (FRAIS_ANNEXES[type]) {
        // Reliquat, fournitures, uniforme : pas plus que ce qui reste dû.
        const a = (await finance.fraisAnnexes([insc.id])).get(insc.id)[type];
        if (centimes(total) > centimes(a.reste)) {
          throw new HttpError(400, `Le montant dépasse ce qui reste dû pour ${a.libelle.toLowerCase()} (${montant(a.reste)}).`);
        }
      }
      await inserer(type, null, total);
    }
    return num;
  });
  res.status(201).json({ numero_recu: numero, lien_recu: lienRecu(req, numero) });
}));

// ---- Annulation (directeur) ----
router.post('/:id/annuler', autoriser('directeur'), ah(async (req, res) => {
  exiger(req.body, ['motif']);
  const p = await one('UPDATE paiements SET annule = TRUE, motif_annulation = $1 WHERE id = $2 AND NOT annule RETURNING id',
    [req.body.motif, req.params.id]);
  if (!p) throw new HttpError(404, 'Paiement introuvable ou déjà annulé.');
  res.json({ ok: true });
}));

// ---- Factures de mensualité d'un mois (toute l'école, une classe ou un élève) ----
function filtresFactures(req) {
  const mois = String(req.query.mois || '');
  if (!/^\d{4}-\d{2}-01$/.test(mois)) throw new HttpError(400, 'Choisissez le mois.');
  // Mois en retard cochés (« aucun » = aucun) ; absent = tous les mois précédents impayés
  const r = req.query.retard;
  const moisRetard = r === undefined ? undefined : String(r).split(',').filter((x) => /^\d{4}-\d{2}-01$/.test(x));
  return [mois, { classeId: vide(req.query.classe_id), eleveId: vide(req.query.eleve_id), impayesSeulement: req.query.impayes === '1', moisRetard }];
}
router.get('/factures', ah(async (req, res) => {
  const [mois, opts] = filtresFactures(req);
  const liste = await finance.facturesMois(mois, opts);
  res.json({
    mois, nb: liste.length, total: liste.reduce((t, x) => t + x.total, 0),
    sans_mensualite: liste.filter((x) => x.du + x.reduction <= 0).length, // tarif encore à 0
    liste: liste.map(({ eleve_id, matricule, parents: parent, prenom, nom, classe, du, verse, total_arrieres, total_autres, total, modifiee }) => ({ eleve_id, matricule, parent, prenom, nom, classe, du, verse, total_arrieres, total_autres, total, modifiee: !!modifiee })),
  });
}));
router.get('/factures.pdf', ah(async (req, res) => {
  const [mois, opts] = filtresFactures(req);
  const liste = await finance.facturesMois(mois, opts);
  if (!liste.length) throw new HttpError(404, 'Aucune facture pour ces critères.');
  const buf = await pdf.facturesMensualite(liste, mois);
  res.type('application/pdf').set('Content-Disposition', `inline; filename="factures-${mois.slice(0, 7)}.pdf"`).send(buf);
}));

// ---- Modifier la facture du mois d'un élève (une par une) ----
router.get('/factures/edition', ah(async (req, res) => {
  const mois = String(req.query.mois || '');
  if (!/^\d{4}-\d{2}-01$/.test(mois)) throw new HttpError(400, 'Choisissez le mois.');
  const [f] = await finance.facturesMois(mois, { eleveId: req.query.eleve_id });
  if (!f) throw new HttpError(404, 'Pas de facture ce mois-ci pour cet élève (pas encore inscrit, parti ou archivé).');
  const p = await one('SELECT * FROM parametres WHERE id = 1');
  const { limiteFacture } = require('../services/rappels');
  res.json({
    mois, inscription_id: f.inscription_id, eleve_id: f.eleve_id, prenom: f.prenom, nom: f.nom, classe: f.classe,
    auto: finance.lignesFacture(f, mois), date_limite_defaut: limiteFacture(mois, p).limite, modifiee: f.modifiee || null, total: f.total,
  });
}));

router.put('/factures/edition', ah(async (req, res) => {
  const { mois, inscription_id: insc } = req.body;
  if (!/^\d{4}-\d{2}-01$/.test(String(mois || ''))) throw new HttpError(400, 'Choisissez le mois.');
  if (!(await one('SELECT 1 FROM inscriptions WHERE id = $1', [insc]))) throw new HttpError(404, 'Inscription introuvable.');
  const brut = Array.isArray(req.body.lignes) ? req.body.lignes : [];
  if (!brut.length) throw new HttpError(400, 'La facture doit avoir au moins une ligne.');
  if (brut.length > 10) throw new HttpError(400, 'Dix lignes au plus par facture (elle doit tenir sur une demi-feuille).');
  const lignes = brut.map((l) => {
    const libelle = String(l.libelle || '').trim().slice(0, 120);
    const m = Number(l.montant); const v = Number(l.verse || 0);
    if (!libelle) throw new HttpError(400, 'Chaque ligne doit avoir une désignation.');
    if (!Number.isFinite(m) || m < 0 || m > 1e9 || !Number.isFinite(v) || v < 0 || v > m) throw new HttpError(400, `Montant invalide sur la ligne « ${libelle} ».`);
    const cle = /^(mois|arr:\d{4}-\d{2}-01|annexe:[a-z]+)$/.test(String(l.cle || '')) ? l.cle : null;
    return cle ? { cle, libelle, montant: m } : { cle: null, libelle, montant: m, verse: v };
  });
  const dl = vide(req.body.date_limite);
  if (dl && !/^\d{4}-\d{2}-\d{2}$/.test(dl)) throw new HttpError(400, 'Date limite invalide.');
  const note = vide(String(req.body.note || '').trim()); const motif = vide(String(req.body.motif || '').trim());
  if ((note && note.length > 200) || (motif && motif.length > 300)) throw new HttpError(400, 'Note ou motif trop long.');
  await query(
    `INSERT INTO factures_modifiees (inscription_id, mois, lignes, note, date_limite, motif, utilisateur_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (inscription_id, mois) DO UPDATE SET lignes = EXCLUDED.lignes, note = EXCLUDED.note, date_limite = EXCLUDED.date_limite,
       motif = EXCLUDED.motif, utilisateur_id = EXCLUDED.utilisateur_id, updated_at = now()`,
    [insc, mois, JSON.stringify(lignes), note, dl, motif, req.user.id]);
  res.json({ ok: true });
}));

// Rétablir la facture calculée automatiquement
router.delete('/factures/edition', ah(async (req, res) => {
  await query('DELETE FROM factures_modifiees WHERE inscription_id = $1 AND mois = $2', [req.query.inscription_id, req.query.mois]);
  res.json({ ok: true });
}));

// ---- Reçu PDF ----
router.get('/recu/:numero.pdf', ah(async (req, res) => {
  const buf = await pdf.recu(req.params.numero);
  if (!buf) throw new HttpError(404, 'Reçu introuvable.');
  res.type('application/pdf').set('Content-Disposition', `inline; filename="recu-${req.params.numero}.pdf"`).send(buf);
}));

/** Message WhatsApp de confirmation avec lien vers le reçu PDF. */
async function messageRecu(req, numero) {
  const p = await one('SELECT * FROM parametres WHERE id = 1');
  const lignes = await query(
    `SELECT pa.*, e.id AS eleve_id, e.nom, e.prenom, e.whatsapp, c.nom AS classe,
            COALESCE(NULLIF(e.tuteur_nom,''), NULLIF(e.pere_nom,''), NULLIF(e.mere_nom,''), 'Parent') AS parent
       FROM paiements pa JOIN inscriptions i ON i.id = pa.inscription_id JOIN eleves e ON e.id = i.eleve_id
       JOIN classes c ON c.id = i.classe_id WHERE pa.numero_recu = $1 AND NOT pa.annule ORDER BY pa.mois`, [numero]);
  if (!lignes.length) throw new HttpError(404, 'Reçu introuvable.');
  const l = lignes[0];
  const objet = lignes.map((x) => objetPaiement(x.type, x.mois, x.remarque).toLowerCase()).join(', ');
  const texte = remplir(p.modele_recu, {
    nom_parent: l.parent, nom_eleve: `${l.prenom} ${l.nom}`, classe: l.classe,
    montant: montant(lignes.reduce((s, x) => s + x.montant, 0), p.devise), objet, numero, ecole: p.nom_ecole,
  });
  return { l, texte, lien: lienRecu(req, numero) };
}

router.post('/recu/:numero/whatsapp', ah(async (req, res) => {
  const { l, texte, lien } = await messageRecu(req, req.params.numero);
  if (!l.whatsapp) throw new HttpError(400, 'Le numéro WhatsApp du parent n\'est pas renseigné : complétez-le sur la fiche de l\'élève.');
  const [m] = await envoyerMessages([{
    telephone: l.whatsapp, destinataire: l.parent, eleve_id: l.eleve_id, texte,
    document: { link: lien, filename: `recu-${req.params.numero}.pdf` },
  }], { type: 'recu', userId: req.user.id, canal: req.body.manuel ? 'manuel' : undefined });
  res.json(m);
}));

module.exports = router;
