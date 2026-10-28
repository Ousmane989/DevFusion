'use strict';

// Rappels de paiement WhatsApp (manuels ou automatiques).
//
// Règles (configurables dans Paramètres) :
//   • la mensualité du mois M est à payer avant le « jour limite » de M (ex. avant le 5 novembre) ;
//   • rappel le jour J (ex. le 25) qui précède cette date limite (le 25 octobre pour novembre) ;
//   • second rappel : N jours après la date limite, aux parents encore débiteurs.
// Les exécutions automatiques sont tracées dans `rappels_executions` pour ne
// jamais envoyer deux fois le même rappel, même après un redémarrage.
const { query, one } = require('../db');
const { nomMois, deMois, montant, remplir, dateFr, aujourdhui, debutMois, ajouterMois } = require('../utils');
const finance = require('./finance');
const { envoyerMessages } = require('./whatsapp');

const p2 = (n) => String(n).padStart(2, '0');

/** Date limite de paiement de la mensualité du mois M : le « jour limite » de M (ex. 05/11 pour novembre). */
function dateLimite(mois, p) {
  return `${mois.slice(0, 7)}-${p2(p.date_limite_jour)}`;
}

/** Date du premier rappel pour le mois M : le jour du rappel qui précède la date limite. */
function dateRappel(mois, p) {
  const m = p.rappel_jour < p.date_limite_jour ? mois : ajouterMois(mois, -1);
  return `${m.slice(0, 7)}-${p2(p.rappel_jour)}`;
}

/** Date du second rappel. */
function dateSecondRappel(mois, p) {
  const d = new Date(`${dateLimite(mois, p)}T12:00:00`);
  d.setDate(d.getDate() + p.second_rappel_delai);
  return aujourdhui(d);
}

/**
 * Prépare la liste des messages de rappel (sans envoyer).
 * @param {string} mois AAAA-MM-01
 * @param {'rappel'|'second_rappel'} type
 */
async function preparer(mois, type, { impayesSeulement, classeId } = {}) {
  const p = await one('SELECT * FROM parametres WHERE id = 1');
  const seulementImpayes = type === 'second_rappel' ? true : (impayesSeulement ?? p.rappel_impayes_seulement);
  const situation = await finance.situationMois(mois, { classeId });
  const modele = type === 'second_rappel' ? p.modele_second_rappel : p.modele_rappel;
  const limite = dateFr(dateLimite(mois, p));
  return situation
    .filter((s) => s.whatsapp && s.du > 0 && (!seulementImpayes || s.reste > 0)) // sans numéro : pas de rappel possible
    .map((s) => ({
      eleve_id: s.eleve_id,
      destinataire: s.parent,
      telephone: s.whatsapp,
      classe: s.classe,
      eleve: `${s.prenom} ${s.nom}`,
      statut: s.statut,
      montant: s.reste > 0 ? s.reste : s.du,
      // « de {mois} » devient « d'octobre » / « de novembre » selon le mois.
      texte: remplir(modele.replace(/\bde \{mois\}/g, '{de_mois}'), {
        de_mois: deMois(mois), nom_parent: s.parent, mois: nomMois(mois), nom_eleve: `${s.prenom} ${s.nom}`, prenom_eleve: s.prenom,
        classe: s.classe, montant: montant(s.reste > 0 ? s.reste : s.du, p.devise), date_limite: limite, ecole: p.nom_ecole,
      }),
    }));
}

/** Envoie les rappels préparés et renvoie les messages enregistrés. */
async function envoyer(mois, type, opts = {}) {
  let liste = await preparer(mois, type, opts);
  if (opts.sansDoublon) {
    // Envoi automatique : on saute les familles déjà prévenues pour ce mois (envoi
    // manuel de la directrice, ou passage précédent interrompu).
    const deja = await query('SELECT DISTINCT eleve_id FROM messages WHERE type = $1 AND mois = $2 AND eleve_id IS NOT NULL', [type, mois]);
    const prevenus = new Set(deja.map((d) => d.eleve_id));
    liste = liste.filter((m) => !prevenus.has(m.eleve_id));
  }
  return envoyerMessages(liste, { type, mois, userId: opts.userId, canal: opts.canal, avant: opts.avant });
}

/**
 * Tâche quotidienne : envoie les rappels dus aujourd'hui (avec rattrapage
 * si le serveur était arrêté le jour prévu, dans la limite de 5 jours).
 * Un envoi interrompu (limite de temps de l'hébergeur) reprend au passage suivant,
 * sans renvoyer aux familles déjà prévenues.
 * @returns {Promise<Array<{mois, type, nb, termine}>>}
 */
async function tacheQuotidienne(jour = aujourdhui(), { dureeMax = 40000 } = {}) {
  const p = await one('SELECT * FROM parametres WHERE id = 1');
  if (!p.rappel_auto) return [];
  const annee = await finance.anneeActive();
  if (!annee) return [];
  const moisAnnee = finance.moisAnnee(annee);
  const faits = [];
  const avant = Date.now() + dureeMax;
  const ecart = (a, b) => Math.round((new Date(`${a}T12:00:00`) - new Date(`${b}T12:00:00`)) / 86400000);

  // Le rappel du mois suivant tombe dans le mois en cours (ex. 25 octobre pour novembre).
  const candidats = [ajouterMois(debutMois(jour), 1), debutMois(jour), ajouterMois(debutMois(jour), -1), ajouterMois(debutMois(jour), -2)];
  for (const mois of candidats) {
    if (!moisAnnee.includes(mois)) continue;
    const taches = [['rappel', dateRappel(mois, p)]];
    if (p.second_rappel_actif) taches.push(['second_rappel', dateSecondRappel(mois, p)]);
    for (const [type, date] of taches) {
      const retard = ecart(jour, date);
      if (retard < 0 || retard > 10) continue;
      const exec = await one('SELECT termine FROM rappels_executions WHERE mois = $1 AND type = $2', [mois, type]);
      if (exec ? exec.termine : retard > 5) continue; // rattrapage : 5 jours ; reprise d'un envoi inachevé : 10 jours
      // Réservation (nouvelle tâche, ou reprise d'une tâche inachevée dont le verrou a expiré).
      await query(
        'INSERT INTO rappels_executions (mois, type, termine) VALUES ($1,$2,FALSE) ON CONFLICT DO NOTHING', [mois, type]);
      const prise = await query(
        `UPDATE rappels_executions SET verrou = now() WHERE mois = $1 AND type = $2 AND NOT termine
            AND (verrou IS NULL OR verrou < now() - interval '3 minutes') RETURNING mois`, [mois, type]);
      if (!prise.length) continue;
      const msgs = await envoyer(mois, type, { sansDoublon: true, avant });
      const termine = !msgs.incomplet;
      await query(
        `UPDATE rappels_executions SET nb_messages = nb_messages + $1, termine = $2, verrou = NULL, execute_le = now()
          WHERE mois = $3 AND type = $4`, [msgs.length, termine, mois, type]);
      faits.push({ mois, type, nb: msgs.length, termine });
    }
  }
  return faits;
}

/** Calendrier des prochains rappels (affiché dans l'interface). */
async function calendrier() {
  const p = await one('SELECT * FROM parametres WHERE id = 1');
  const annee = await finance.anneeActive();
  if (!annee) return [];
  const execs = await query('SELECT * FROM rappels_executions');
  const fait = (m, t) => execs.find((e) => e.mois === m && e.type === t);
  return finance.moisAnnee(annee).map((m) => ({
    mois: m,
    rappel: dateRappel(m, p),
    date_limite: dateLimite(m, p),
    second_rappel: p.second_rappel_actif ? dateSecondRappel(m, p) : null,
    rappel_fait: fait(m, 'rappel') || null,
    second_fait: fait(m, 'second_rappel') || null,
  }));
}

module.exports = { preparer, envoyer, tacheQuotidienne, calendrier, dateLimite, dateRappel, dateSecondRappel };
