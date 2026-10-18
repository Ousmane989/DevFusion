'use strict';

// Rappels de paiement WhatsApp (manuels ou automatiques).
//
// Règles (configurables dans Paramètres) :
//   • le jour J (ex. le 25) du mois M : rappel de la mensualité de M ;
//   • date limite : premier « jour limite » (ex. le 5) qui suit la date du rappel ;
//   • second rappel : N jours après la date limite, aux parents encore débiteurs.
// Les exécutions automatiques sont tracées dans `rappels_executions` pour ne
// jamais envoyer deux fois le même rappel, même après un redémarrage.
const { query, one } = require('../db');
const { nomMois, montant, remplir, dateFr, aujourdhui, debutMois, ajouterMois } = require('../utils');
const finance = require('./finance');
const { envoyerMessages } = require('./whatsapp');

const p2 = (n) => String(n).padStart(2, '0');

/** Date du premier rappel pour le mois M (AAAA-MM-01). */
function dateRappel(mois, p) {
  return `${mois.slice(0, 7)}-${p2(p.rappel_jour)}`;
}

/** Date limite de paiement de la mensualité du mois M. */
function dateLimite(mois, p) {
  const memeMois = p.date_limite_jour > p.rappel_jour;
  const m = memeMois ? mois : ajouterMois(mois, 1);
  return `${m.slice(0, 7)}-${p2(p.date_limite_jour)}`;
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
    .filter((s) => s.du > 0 && (!seulementImpayes || s.reste > 0))
    .map((s) => ({
      eleve_id: s.eleve_id,
      destinataire: s.parent,
      telephone: s.whatsapp,
      classe: s.classe,
      eleve: `${s.prenom} ${s.nom}`,
      statut: s.statut,
      montant: s.reste > 0 ? s.reste : s.du,
      texte: remplir(modele, {
        nom_parent: s.parent, mois: nomMois(mois), nom_eleve: `${s.prenom} ${s.nom}`, prenom_eleve: s.prenom,
        classe: s.classe, montant: montant(s.reste > 0 ? s.reste : s.du, p.devise), date_limite: limite, ecole: p.nom_ecole,
      }),
    }));
}

/** Envoie les rappels préparés et renvoie les messages enregistrés. */
async function envoyer(mois, type, opts = {}) {
  const liste = await preparer(mois, type, opts);
  const messages = await envoyerMessages(liste, { type, mois, userId: opts.userId, canal: opts.canal });
  return messages;
}

/**
 * Tâche quotidienne : envoie les rappels dus aujourd'hui (avec rattrapage
 * si le serveur était arrêté le jour prévu, dans la limite de 5 jours).
 * @returns {Promise<Array<{mois, type, nb}>>}
 */
async function tacheQuotidienne(jour = aujourdhui()) {
  const p = await one('SELECT * FROM parametres WHERE id = 1');
  if (!p.rappel_auto) return [];
  const annee = await finance.anneeActive();
  if (!annee) return [];
  const moisAnnee = finance.moisAnnee(annee);
  const faits = [];
  const ecart = (a, b) => Math.round((new Date(`${a}T12:00:00`) - new Date(`${b}T12:00:00`)) / 86400000);

  const candidats = [debutMois(jour), ajouterMois(debutMois(jour), -1), ajouterMois(debutMois(jour), -2)];
  for (const mois of candidats) {
    if (!moisAnnee.includes(mois)) continue;
    const taches = [['rappel', dateRappel(mois, p)]];
    if (p.second_rappel_actif) taches.push(['second_rappel', dateSecondRappel(mois, p)]);
    for (const [type, date] of taches) {
      const retard = ecart(jour, date);
      if (retard < 0 || retard > 5) continue;
      const deja = await one('SELECT 1 FROM rappels_executions WHERE mois = $1 AND type = $2', [mois, type]);
      if (deja) continue;
      // On réserve l'exécution avant l'envoi pour éviter tout doublon concurrent.
      const res = await query(
        'INSERT INTO rappels_executions (mois, type) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING mois', [mois, type]);
      if (!res.length) continue;
      const msgs = await envoyer(mois, type);
      await query('UPDATE rappels_executions SET nb_messages = $1 WHERE mois = $2 AND type = $3', [msgs.length, mois, type]);
      faits.push({ mois, type, nb: msgs.length });
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
