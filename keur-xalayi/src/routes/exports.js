'use strict';

// Exports Excel (.xlsx) et PDF de toutes les listes, liste de classe et
// cartes d'élève. Chaque liste est décrite une seule fois (colonnes + données)
// puis rendue au format demandé.
const express = require('express');
const { query, one } = require('../db');
const { ah, HttpError, dateFr, nomMois, montant, MODES_PAIEMENT } = require('../utils');
const { autoriser, verifierClasse } = require('../auth');
const finance = require('../services/finance');
const pdf = require('../services/pdf');
const { classeur } = require('../services/excel');

const router = express.Router();
const STATUTS = { paye: 'Payé', partiel: 'Partiel', impaye: 'Impayé' };
const gestion = ['directeur'];

/** Définitions des listes exportables. */
const LISTES = {
  async eleves(req, p) {
    const params = []; let filtre = "WHERE e.statut = 'actif'";
    if (req.query.statut === 'archive') filtre = "WHERE e.statut = 'archive'";
    if (req.query.classe_id) { verifierClasse(req, req.query.classe_id); params.push(req.query.classe_id); filtre += ` AND c.id = $${params.length}`; }
    if (req.user.classes) { params.push(req.user.classes); filtre += ` AND c.id = ANY($${params.length})`; }
    const lignes = await query(
      `SELECT e.*, c.nom AS classe, i.mensualite, i.reduction, i.reduction_motif, i.date_inscription,
              COALESCE(NULLIF(e.tuteur_nom,''), NULLIF(e.pere_nom,''), NULLIF(e.mere_nom,'')) AS parent
         FROM eleves e
         LEFT JOIN LATERAL (SELECT i.* FROM inscriptions i JOIN annees_scolaires a ON a.id = i.annee_id
                             WHERE i.eleve_id = e.id ORDER BY a.active DESC, a.date_debut DESC LIMIT 1) i ON TRUE
         LEFT JOIN classes c ON c.id = i.classe_id LEFT JOIN niveaux n ON n.id = c.niveau_id
        ${filtre} ORDER BY n.ordre, c.nom, e.nom, e.prenom`, params);
    lignes.forEach((l, k) => { l.n = k + 1; l.sexe_l = l.sexe === 'M' ? 'G' : 'F'; l.naissance = [dateFr(l.date_naissance), l.lieu_naissance].filter(Boolean).join(' à '); });
    return {
      titre: req.query.statut === 'archive' ? 'Élèves archivés' : 'Liste des élèves',
      paysage: true,
      colonnes: [
        { titre: 'N°', cle: 'n', largeur: 0.4 }, { titre: 'Matricule', cle: 'matricule', largeur: 1 },
        { titre: 'Nom', cle: 'nom', largeur: 1.3 }, { titre: 'Prénom', cle: 'prenom', largeur: 1.3 },
        { titre: 'Sexe', cle: 'sexe_l', largeur: 0.5 }, { titre: 'Naissance', cle: 'naissance', largeur: 1.6 },
        { titre: 'Classe', cle: 'classe', largeur: 0.9 }, { titre: 'Parent', cle: 'parent', largeur: 1.5 },
        { titre: 'WhatsApp', cle: 'whatsapp', largeur: 1.2 }, { titre: 'Tél. 2', cle: 'telephone2', largeur: 1.1 },
        { titre: 'Adresse', cle: 'adresse', largeur: 1.3 },
        ...(req.user.role !== 'enseignant' ? [{ titre: 'Mensualité', cle: 'mensualite', format: 'montant', largeur: 0.9, align: 'right' }] : []),
      ],
      lignes,
    };
  },

  async classe(req) {
    if (!req.query.classe_id) throw new HttpError(400, 'Classe manquante.');
    verifierClasse(req, req.query.classe_id);
    const c = await one('SELECT c.*, p.nom || \' \' || p.prenom AS enseignant FROM classes c LEFT JOIN personnel p ON p.id = c.enseignant_id WHERE c.id = $1', [req.query.classe_id]);
    const lignes = await query(
      `SELECT e.matricule, e.nom, e.prenom, e.sexe, e.date_naissance, e.remarques,
              COALESCE(NULLIF(e.tuteur_nom,''), NULLIF(e.pere_nom,''), NULLIF(e.mere_nom,'')) AS parent
         FROM inscriptions i JOIN eleves e ON e.id = i.eleve_id
        WHERE i.classe_id = $1 AND e.statut = 'actif' AND i.decision <> 'parti' ORDER BY e.nom, e.prenom`, [req.query.classe_id]);
    lignes.forEach((l, k) => { l.n = k + 1; l.sexe_l = l.sexe === 'M' ? 'G' : 'F'; l.naissance = dateFr(l.date_naissance); });
    const g = lignes.filter((l) => l.sexe === 'M').length;
    return {
      titre: `Liste de la classe ${c.nom}`,
      sousTitre: `Enseignant(e) : ${c.enseignant || '—'} · Effectif : ${lignes.length} (${g} garçons, ${lignes.length - g} filles)`,
      colonnes: [
        { titre: 'N°', cle: 'n', largeur: 0.4 }, { titre: 'Matricule', cle: 'matricule', largeur: 1 },
        { titre: 'Nom', cle: 'nom', largeur: 1.3 }, { titre: 'Prénom', cle: 'prenom', largeur: 1.4 },
        { titre: 'Sexe', cle: 'sexe_l', largeur: 0.5 }, { titre: 'Né(e) le', cle: 'naissance', largeur: 0.9 },
        { titre: 'Parent', cle: 'parent', largeur: 1.6 }, // sans numéro de téléphone
        { titre: 'Remarques', cle: 'remarques', largeur: 1.8 },
      ],
      lignes,
    };
  },

  async impayes(req, p) {
    if (!gestion.includes(req.user.role)) throw new HttpError(403, 'Accès refusé.');
    const liste = await finance.impayes({ mois: req.query.mois || undefined, classeId: req.query.classe_id || undefined });
    liste.forEach((l) => { l.eleve = `${l.prenom} ${l.nom}`; l.mois_l = nomMois(l.mois); l.statut_l = STATUTS[l.statut]; });
    const total = liste.reduce((s, x) => s + x.reste, 0);
    return {
      titre: 'Liste des impayés',
      sousTitre: req.query.mois ? `Mois de ${nomMois(req.query.mois)}` : 'Tous les mois échus',
      paysage: true,
      total: `Total restant dû : ${montant(total, p.devise)}`,
      colonnes: [
        { titre: 'Classe', cle: 'classe', largeur: 0.9 }, { titre: 'Matricule', cle: 'matricule', largeur: 1 },
        { titre: 'Élève', cle: 'eleve', largeur: 1.8 }, { titre: 'Parent', cle: 'parent', largeur: 1.6 },
        { titre: 'WhatsApp', cle: 'whatsapp', largeur: 1.2 }, { titre: 'Mois', cle: 'mois_l', largeur: 1.1 },
        { titre: 'Dû', cle: 'du', format: 'montant', largeur: 0.9, align: 'right' },
        { titre: 'Versé', cle: 'verse', format: 'montant', largeur: 0.9, align: 'right' },
        { titre: 'Reste', cle: 'reste', format: 'montant', largeur: 0.9, align: 'right' },
        { titre: 'Statut', cle: 'statut_l', largeur: 0.7 },
      ],
      lignes: liste,
    };
  },

  async paiements(req, p) {
    if (!gestion.includes(req.user.role)) throw new HttpError(403, 'Accès refusé.');
    const params = []; const where = ['NOT p.annule'];
    if (req.query.du) { params.push(req.query.du); where.push(`p.date_paiement >= $${params.length}`); }
    if (req.query.au) { params.push(req.query.au); where.push(`p.date_paiement <= $${params.length}`); }
    if (req.query.classe_id) { params.push(req.query.classe_id); where.push(`i.classe_id = $${params.length}`); }
    if (req.query.mode) { params.push(req.query.mode); where.push(`p.mode = $${params.length}`); }
    const lignes = await query(
      `SELECT p.*, e.matricule, e.prenom || ' ' || e.nom AS eleve, c.nom AS classe
         FROM paiements p JOIN inscriptions i ON i.id = p.inscription_id JOIN eleves e ON e.id = i.eleve_id
         JOIN classes c ON c.id = i.classe_id WHERE ${where.join(' AND ')} ORDER BY p.date_paiement, p.id`, params);
    lignes.forEach((l) => {
      l.date_l = dateFr(l.date_paiement); l.mode_l = MODES_PAIEMENT[l.mode];
      l.objet = l.type === 'mensualite' ? `Mensualité ${nomMois(l.mois)}` : l.type === 'inscription' ? 'Inscription' : (l.remarque || 'Autre');
    });
    const total = lignes.reduce((s, x) => s + x.montant, 0);
    return {
      titre: 'Journal des paiements',
      sousTitre: [req.query.du && `du ${dateFr(req.query.du)}`, req.query.au && `au ${dateFr(req.query.au)}`].filter(Boolean).join(' '),
      paysage: true,
      total: `Total encaissé : ${montant(total, p.devise)}`,
      colonnes: [
        { titre: 'Date', cle: 'date_l', largeur: 0.8 }, { titre: 'Reçu', cle: 'numero_recu', largeur: 1 },
        { titre: 'Élève', cle: 'eleve', largeur: 1.7 }, { titre: 'Classe', cle: 'classe', largeur: 0.8 },
        { titre: 'Objet', cle: 'objet', largeur: 1.6 }, { titre: 'Mode', cle: 'mode_l', largeur: 0.9 },
        { titre: 'Référence', cle: 'reference', largeur: 1 },
        { titre: 'Montant', cle: 'montant', format: 'montant', largeur: 0.9, align: 'right' },
      ],
      lignes,
    };
  },

  async personnel(req) {
    if (req.user.role !== 'directeur') throw new HttpError(403, 'Accès refusé.');
    const lignes = await query(
      `SELECT p.*, (SELECT string_agg(c.nom, ', ') FROM classes c JOIN annees_scolaires a ON a.id = c.annee_id AND a.active WHERE c.enseignant_id = p.id) AS classes
         FROM personnel p WHERE p.actif ORDER BY p.poste, p.nom`);
    lignes.forEach((l) => { l.nom_complet = `${l.nom} ${l.prenom}`; l.embauche = dateFr(l.date_embauche); });
    return {
      titre: 'Liste du personnel',
      colonnes: [
        { titre: 'Nom', cle: 'nom_complet', largeur: 1.8 }, { titre: 'Poste', cle: 'poste', largeur: 1.2 },
        { titre: 'Téléphone', cle: 'telephone', largeur: 1.2 }, { titre: 'Classe(s)', cle: 'classes', largeur: 1.1 },
        { titre: 'Embauche', cle: 'embauche', largeur: 0.9 },
        { titre: 'Salaire', cle: 'salaire_base', format: 'montant', largeur: 0.9, align: 'right' },
      ],
      lignes,
    };
  },

  async depenses(req, p) {
    if (!gestion.includes(req.user.role)) throw new HttpError(403, 'Accès refusé.');
    const params = []; const where = [];
    if (req.query.du) { params.push(req.query.du); where.push(`date >= $${params.length}`); }
    if (req.query.au) { params.push(req.query.au); where.push(`date <= $${params.length}`); }
    const lignes = await query(`SELECT * FROM depenses ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY date`, params);
    lignes.forEach((l) => { l.date_l = dateFr(l.date); l.mode_l = MODES_PAIEMENT[l.mode] || l.mode; });
    return {
      titre: 'Dépenses',
      total: `Total : ${montant(lignes.reduce((s, x) => s + x.montant, 0), p.devise)}`,
      colonnes: [
        { titre: 'Date', cle: 'date_l', largeur: 0.8 }, { titre: 'Catégorie', cle: 'categorie', largeur: 1.2 },
        { titre: 'Libellé', cle: 'libelle', largeur: 2.4 }, { titre: 'Mode', cle: 'mode_l', largeur: 0.9 },
        { titre: 'Montant', cle: 'montant', format: 'montant', largeur: 0.9, align: 'right' },
      ],
      lignes,
    };
  },

  async statut(req, p) {
    if (!gestion.includes(req.user.role)) throw new HttpError(403, 'Accès refusé.');
    const annee = await finance.anneeActiveRequise();
    const mois = req.query.mois || finance.moisEchus(annee).slice(-1)[0] || finance.moisAnnee(annee)[0];
    const liste = await finance.situationMois(mois, { classeId: req.query.classe_id || undefined });
    liste.forEach((l) => { l.eleve = `${l.prenom} ${l.nom}`; l.statut_l = STATUTS[l.statut]; });
    return {
      titre: `Situation des mensualités — ${nomMois(mois)}`,
      paysage: true,
      colonnes: [
        { titre: 'Classe', cle: 'classe', largeur: 0.9 }, { titre: 'Matricule', cle: 'matricule', largeur: 1 },
        { titre: 'Élève', cle: 'eleve', largeur: 1.8 }, { titre: 'Parent', cle: 'parent', largeur: 1.5 },
        { titre: 'WhatsApp', cle: 'whatsapp', largeur: 1.2 },
        { titre: 'Dû', cle: 'du', format: 'montant', largeur: 0.9, align: 'right' },
        { titre: 'Versé', cle: 'verse', format: 'montant', largeur: 0.9, align: 'right' },
        { titre: 'Reste', cle: 'reste', format: 'montant', largeur: 0.9, align: 'right' },
        { titre: 'Statut', cle: 'statut_l', largeur: 0.7 },
      ],
      lignes: liste,
    };
  },

  async presences(req) {
    const r = await query(
      `SELECT e.prenom || ' ' || e.nom AS eleve, c.nom AS classe,
              COUNT(pr.id) AS jours, COUNT(pr.id) FILTER (WHERE pr.statut='present') AS presents,
              COUNT(pr.id) FILTER (WHERE pr.statut='absent') AS absents, COUNT(pr.id) FILTER (WHERE pr.statut='retard') AS retards
         FROM inscriptions i JOIN eleves e ON e.id = i.eleve_id JOIN classes c ON c.id = i.classe_id
         JOIN annees_scolaires a ON a.id = i.annee_id AND a.active JOIN niveaux n ON n.id = c.niveau_id
         LEFT JOIN presences pr ON pr.inscription_id = i.id
        WHERE e.statut = 'actif' ${req.query.classe_id ? 'AND c.id = $1' : ''} ${req.user.classes ? `AND c.id = ANY($${req.query.classe_id ? 2 : 1})` : ''}
        GROUP BY e.id, c.id, n.ordre ORDER BY n.ordre, c.nom, e.nom`,
      [...(req.query.classe_id ? [req.query.classe_id] : []), ...(req.user.classes ? [req.user.classes] : [])]);
    r.forEach((x) => { x.taux = x.jours ? `${Math.round(((x.presents + x.retards) / x.jours) * 100)} %` : '—'; });
    return {
      titre: 'Assiduité des élèves',
      colonnes: [
        { titre: 'Classe', cle: 'classe', largeur: 0.9 }, { titre: 'Élève', cle: 'eleve', largeur: 2 },
        { titre: 'Jours', cle: 'jours', largeur: 0.6, align: 'right' }, { titre: 'Présent', cle: 'presents', largeur: 0.7, align: 'right' },
        { titre: 'Absent', cle: 'absents', largeur: 0.7, align: 'right' }, { titre: 'Retard', cle: 'retards', largeur: 0.7, align: 'right' },
        { titre: 'Assiduité', cle: 'taux', largeur: 0.8, align: 'right' },
      ],
      lignes: r,
    };
  },
};

router.get('/:fichier', ah(async (req, res, next) => {
  const [, liste, format] = /^(\w+)\.(xlsx|pdf)$/.exec(req.params.fichier) || [];
  const def = liste && Object.hasOwn(LISTES, liste) && LISTES[liste];
  if (!def) return next(); // ex. cartes.pdf, traité plus bas
  req.params.liste = liste;
  req.params.format = format;
  const p = await one('SELECT * FROM parametres WHERE id = 1');
  const l = await def(req, p);
  const nomFichier = `${req.params.liste}-${new Date().toISOString().slice(0, 10)}`;
  if (req.params.format === 'xlsx') {
    const buf = await classeur(l.titre, l.colonnes, l.lignes, { ecole: p.nom_ecole, devise: p.devise });
    return res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .set('Content-Disposition', `attachment; filename="${nomFichier}.xlsx"`).send(Buffer.from(buf));
  }
  // PDF : montants formatés en texte.
  const lignes = l.lignes.map((x) => {
    const y = { ...x };
    l.colonnes.filter((c) => c.format === 'montant').forEach((c) => { y[c.cle] = montant(x[c.cle], p.devise); });
    return y;
  });
  const buf = await pdf.tableau(l.titre, l.sousTitre, l.colonnes, lignes, { paysage: l.paysage, total: l.total });
  res.type('application/pdf').set('Content-Disposition', `inline; filename="${nomFichier}.pdf"`).send(buf);
}));

// ---- Cartes d'élève (classe entière ou sélection) ----
router.get('/cartes.pdf', ah(async (req, res) => {
  const params = []; let filtre = '';
  if (req.query.classe_id) { verifierClasse(req, req.query.classe_id); params.push(req.query.classe_id); filtre += ` AND c.id = $${params.length}`; }
  if (req.query.eleve_ids) { params.push(String(req.query.eleve_ids).split(',').map(Number)); filtre += ` AND e.id = ANY($${params.length})`; }
  if (req.user.classes) { params.push(req.user.classes); filtre += ` AND c.id = ANY($${params.length})`; }
  if (!req.query.classe_id && !req.query.eleve_ids && req.user.role !== 'directeur') throw new HttpError(400, 'Choisissez une classe.');
  const eleves = await query(
    `SELECT e.*, c.nom AS classe FROM eleves e JOIN inscriptions i ON i.eleve_id = e.id
       JOIN annees_scolaires a ON a.id = i.annee_id AND a.active JOIN classes c ON c.id = i.classe_id JOIN niveaux n ON n.id = c.niveau_id
      WHERE e.statut = 'actif' ${filtre} ORDER BY n.ordre, c.nom, e.nom, e.prenom`, params);
  const annee = await finance.anneeActive();
  const buf = await pdf.cartes(eleves, annee && annee.libelle);
  res.type('application/pdf').set('Content-Disposition', 'inline; filename="cartes-eleves.pdf"').send(buf);
}));

module.exports = router;
