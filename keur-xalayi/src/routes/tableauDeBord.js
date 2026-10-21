'use strict';

// Tableau de bord : chiffres clés selon le rôle de l'utilisateur.
const express = require('express');
const { query, one } = require('../db');
const { ah, aujourdhui, debutMois } = require('../utils');
const finance = require('../services/finance');
const { listeClasses } = require('./classes');

const router = express.Router();

router.get('/', ah(async (req, res) => {
  const annee = await finance.anneeActive();
  const jour = aujourdhui();
  const classes = await listeClasses(null, req.user.classes);
  const effectifs = {
    total: classes.reduce((s, c) => s + c.effectif, 0),
    garcons: classes.reduce((s, c) => s + c.garcons, 0),
    filles: classes.reduce((s, c) => s + c.filles, 0),
    par_classe: classes.map((c) => ({ id: c.id, nom: c.nom, effectif: c.effectif, garcons: c.garcons, filles: c.filles, enseignant: c.enseignant })),
  };

  const filtreClasses = req.user.classes ? 'AND i.classe_id = ANY($2)' : '';
  const pAbs = req.user.classes ? [jour, req.user.classes] : [jour];
  const absences = await query(
    `SELECT e.id AS eleve_id, e.prenom, e.nom, c.nom AS classe, pr.statut
       FROM presences pr JOIN inscriptions i ON i.id = pr.inscription_id JOIN eleves e ON e.id = i.eleve_id
       JOIN classes c ON c.id = i.classe_id WHERE pr.date = $1 AND pr.statut <> 'present' ${filtreClasses}
      ORDER BY c.nom, e.nom`, pAbs);
  const appelsFaits = await query(
    `SELECT DISTINCT i.classe_id FROM presences pr JOIN inscriptions i ON i.id = pr.inscription_id WHERE pr.date = $1 ${filtreClasses}`, pAbs);

  const evenements = await query(
    'SELECT * FROM evenements WHERE date_fin >= $1 ORDER BY date_debut LIMIT 5', [jour]);

  const resultat = {
    annee, jour, effectifs, evenements,
    absences: { liste: absences, absents: absences.filter((a) => a.statut === 'absent').length, retards: absences.filter((a) => a.statut === 'retard').length },
    appels: { faits: appelsFaits.length, total: classes.length, classes_sans_appel: classes.filter((c) => !appelsFaits.some((a) => a.classe_id === c.id)).map((c) => c.nom) },
  };

  if (req.user.role !== 'enseignant' && annee) {
    // Mois de référence : le mois courant s'il fait partie de l'année, sinon le plus proche.
    const moisAnnee = finance.moisAnnee(annee);
    const courant = debutMois(jour);
    const mois = moisAnnee.includes(courant) ? courant : (courant < moisAnnee[0] ? moisAnnee[0] : moisAnnee[moisAnnee.length - 1]);
    const resume = await finance.resumeMois(mois);
    const encaisseMois = await one(
      `SELECT COALESCE(SUM(montant),0) AS total FROM paiements WHERE NOT annule AND date_trunc('month', date_paiement)::date = $1`, [mois]);
    const impayes = await finance.impayes();
    // Frais d'inscription de l'année : attendus, encaissés, reste, et encaissés ce mois.
    const ins = await one(
      `SELECT COALESCE(SUM(i.frais_inscription),0) AS attendu,
              COALESCE(SUM(LEAST(v.verse, i.frais_inscription)),0) AS encaisse,
              COUNT(*) FILTER (WHERE v.verse < i.frais_inscription) AS nb_a_regler
         FROM inscriptions i JOIN eleves e ON e.id = i.eleve_id
         CROSS JOIN LATERAL (SELECT COALESCE(SUM(montant),0) AS verse FROM paiements p
                              WHERE p.inscription_id = i.id AND p.type = 'inscription' AND NOT p.annule) v
        WHERE i.annee_id = $1 AND e.statut = 'actif' AND i.decision <> 'parti'`, [annee.id]);
    const insMois = await one(
      `SELECT COALESCE(SUM(montant),0) AS total FROM paiements
        WHERE NOT annule AND type = 'inscription' AND date_trunc('month', date_paiement)::date = $1`, [mois]);
    const evolution = [];
    for (const m of finance.moisEchus(annee)) {
      const r = await finance.resumeMois(m);
      evolution.push({ mois: m, attendu: r.attendu, encaisse: r.encaisse, taux: r.taux });
    }
    resultat.finances = {
      mois,
      encaisse_mois: encaisseMois.total, // tout ce qui a été encaissé ce mois (tous types)
      attendu_mois: resume.attendu, // mensualités dues pour ce mois
      encaisse_mensualites: resume.encaisse,
      taux_recouvrement: resume.taux,
      statuts: { payes: resume.nbPayes, partiels: resume.nbPartiels, impayes: resume.nbImpayes },
      inscriptions: {
        attendu: ins.attendu, encaisse: ins.encaisse, reste: ins.attendu - ins.encaisse,
        nb_a_regler: ins.nb_a_regler, encaisse_mois: insMois.total,
      },
      total_impayes: impayes.reduce((s, x) => s + x.reste, 0),
      nb_eleves_impayes: new Set(impayes.map((x) => x.eleve_id)).size,
      evolution,
    };
    resultat.derniers_paiements = await query(
      `SELECT p.id, p.numero_recu, p.montant, p.date_paiement, p.mode, p.type, p.mois, e.id AS eleve_id, e.prenom, e.nom, c.nom AS classe
         FROM paiements p JOIN inscriptions i ON i.id = p.inscription_id JOIN eleves e ON e.id = i.eleve_id JOIN classes c ON c.id = i.classe_id
        WHERE NOT p.annule ORDER BY p.created_at DESC LIMIT 8`);
    resultat.dernieres_inscriptions = await query(
      `SELECT e.id, e.prenom, e.nom, e.matricule, e.sexe, c.nom AS classe, i.date_inscription
         FROM inscriptions i JOIN eleves e ON e.id = i.eleve_id JOIN classes c ON c.id = i.classe_id
        WHERE i.annee_id = $1 ORDER BY i.created_at DESC LIMIT 8`, [annee.id]);
    const aEnvoyer = await one(`SELECT COUNT(*) AS n FROM messages WHERE statut = 'a_envoyer' AND created_at > now() - interval '15 days'`);
    resultat.messages_a_envoyer = aEnvoyer.n;
    const demandes = await one('SELECT COUNT(*) AS n FROM utilisateurs WHERE en_attente');
    resultat.demandes_comptes = demandes.n; // comptes enseignants à valider
  }
  res.json(resultat);
}));

module.exports = router;
