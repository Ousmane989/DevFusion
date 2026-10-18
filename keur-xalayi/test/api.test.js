'use strict';

// Tests de bout en bout de l'API (nécessitent une base PostgreSQL accessible
// via DATABASE_URL, initialisée avec `npm run db:demo`).
//   npm test
const { test, before, after } = require('node:test');
const assert = require('node:assert');
process.env.CRON_INTERNE = 'false';
const app = require('../src/app');
const { migrer, pool } = require('../src/db');
const { amorcer } = require('../src/services/amorcage');
const config = require('../src/config');

let serveur; let base;
const sessions = {};

async function appel(qui, chemin, { methode = 'GET', corps } = {}) {
  const r = await fetch(base + chemin, {
    method: methode,
    headers: { ...(corps ? { 'Content-Type': 'application/json' } : {}), ...(sessions[qui] ? { Cookie: sessions[qui] } : {}) },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const type = r.headers.get('content-type') || '';
  const donnees = type.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer());
  return { statut: r.status, donnees, type };
}

async function connecter(qui, identifiant, mdp) {
  const r = await fetch(base + '/api/auth/connexion', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifiant, mot_de_passe: mdp }),
  });
  assert.strictEqual(r.status, 200, `connexion ${identifiant}`);
  sessions[qui] = r.headers.get('set-cookie').split(';')[0];
}

before(async () => {
  await migrer();
  await amorcer();
  serveur = app.listen(0);
  base = `http://127.0.0.1:${serveur.address().port}`;
  await connecter('dir', config.admin.identifiant, config.admin.motDePasse);
});

after(async () => { serveur.close(); await pool.end(); });

test('refuse l\'accès sans connexion et avec un mauvais mot de passe', async () => {
  assert.strictEqual((await appel(null, '/api/eleves')).statut, 401);
  const r = await appel(null, '/api/auth/connexion', { methode: 'POST', corps: { identifiant: 'directeur', mot_de_passe: 'faux' } });
  assert.strictEqual(r.statut, 401);
});

test('toutes les pages de consultation répondent', async () => {
  const chemins = ['/api/auth/moi', '/api/tableau-de-bord', '/api/parametres', '/api/parametres/niveaux', '/api/classes', '/api/eleves',
    '/api/paiements', '/api/paiements/statut', '/api/paiements/impayes', '/api/paiements/mois', '/api/whatsapp/rappels/calendrier',
    '/api/whatsapp/historique', '/api/presences/jour', '/api/presences/stats', '/api/personnel', '/api/personnel/salaires',
    '/api/finances/depenses', '/api/finances/bilan', '/api/calendrier', '/api/annees', '/api/utilisateurs', '/api/parametres/sauvegardes'];
  for (const c of chemins) {
    const r = await appel('dir', c);
    assert.strictEqual(r.statut, 200, `${c} -> ${r.statut} ${JSON.stringify(r.donnees).slice(0, 200)}`);
  }
});

let eleveId; let inscriptionId; let classe;

test('inscription d\'un élève avec matricule automatique et contrôle du WhatsApp', async () => {
  classe = (await appel('dir', '/api/classes')).donnees.find((c) => c.niveau_code === 'CE2');
  const mauvais = await appel('dir', '/api/eleves', { methode: 'POST', corps: { nom: 'Test', prenom: 'Élève', sexe: 'F', whatsapp: '12', classe_id: classe.id } });
  assert.strictEqual(mauvais.statut, 400);
  const r = await appel('dir', '/api/eleves', {
    methode: 'POST',
    corps: { nom: 'Test', prenom: 'Élève', sexe: 'F', whatsapp: '77 123 45 67', classe_id: classe.id, reduction: 500, reduction_motif: 'Fratrie' },
  });
  assert.strictEqual(r.statut, 201, JSON.stringify(r.donnees));
  assert.match(r.donnees.matricule, /^KX\d{2}-\d{4}$/);
  eleveId = r.donnees.id; inscriptionId = r.donnees.inscription_id;
  const fiche = (await appel('dir', `/api/eleves/${eleveId}`)).donnees;
  assert.strictEqual(fiche.eleve.whatsapp, '+221771234567');
  assert.strictEqual(fiche.eleve.nom, 'TEST');
  assert.strictEqual(fiche.inscription.mensualite, classe.mensualite_effective);
  const recherche = (await appel('dir', '/api/eleves?q=test')).donnees;
  assert.ok(recherche.some((e) => e.id === eleveId));
});

test('paiement sur plusieurs mois, statuts payé / partiel et reçu PDF', async () => {
  const mois = (await appel('dir', '/api/paiements/mois')).donnees.mois;
  const fiche = (await appel('dir', `/api/eleves/${eleveId}`)).donnees;
  const du = fiche.inscription.mensualite - fiche.inscription.reduction;
  const r = await appel('dir', '/api/paiements', {
    methode: 'POST', corps: { inscription_id: inscriptionId, type: 'mensualite', mois: [mois[0], mois[1]], montant: du + du / 2, mode: 'wave', reference: 'TX1' },
  });
  assert.strictEqual(r.statut, 201, JSON.stringify(r.donnees));
  const solde = (await appel('dir', `/api/eleves/${eleveId}`)).donnees.solde;
  assert.strictEqual(solde.mois[0].statut, 'paye');
  assert.strictEqual(solde.mois[1].statut, 'partiel');
  const trop = await appel('dir', '/api/paiements', { methode: 'POST', corps: { inscription_id: inscriptionId, mois: [mois[0]], montant: 10, mode: 'especes' } });
  assert.strictEqual(trop.statut, 400, 'pas de paiement au-delà du dû');
  const pdf = await appel('dir', `/api/paiements/recu/${r.donnees.numero_recu}.pdf`);
  assert.strictEqual(pdf.statut, 200);
  assert.strictEqual(pdf.donnees.subarray(0, 4).toString(), '%PDF');
  // Lien public signé
  const lien = new URL(r.donnees.lien_recu);
  assert.strictEqual((await fetch(base + lien.pathname + lien.search)).status, 200);
  assert.strictEqual((await fetch(base + lien.pathname + '?s=faux')).status, 403);
  const wa = await appel('dir', `/api/paiements/recu/${r.donnees.numero_recu}/whatsapp`, { methode: 'POST', corps: {} });
  assert.strictEqual(wa.statut, 200);
  assert.match(wa.donnees.lien, /^https:\/\/wa\.me\/221771234567\?text=/);
});

test('rappels WhatsApp : aperçu, envoi manuel et historique', async () => {
  const mois = (await appel('dir', '/api/paiements/mois')).donnees.mois[0];
  const ap = await appel('dir', '/api/whatsapp/rappels/apercu', { methode: 'POST', corps: { mois, impayes_seulement: true } });
  assert.strictEqual(ap.statut, 200);
  assert.ok(ap.donnees.every((m) => m.texte.includes('Keur Xalayi')));
  assert.ok(!ap.donnees.some((m) => m.eleve_id === eleveId), 'un élève à jour ne reçoit pas de rappel');
  const env = await appel('dir', '/api/whatsapp/rappels/envoyer', { methode: 'POST', corps: { mois, classe_id: classe.id, manuel: true } });
  assert.strictEqual(env.statut, 200);
  assert.ok(env.donnees.every((m) => m.statut === 'a_envoyer' && m.lien.startsWith('https://wa.me/')));
  const ann = await appel('dir', '/api/whatsapp/annonce', { methode: 'POST', corps: { cible: 'classe', classe_id: classe.id, texte: 'Bonjour {nom_parent}, réunion pour {nom_eleve}.', apercu: true } });
  assert.strictEqual(ann.statut, 200);
  assert.ok(ann.donnees.length >= 1);
});

test('rappel automatique : exécuté une seule fois par mois', async () => {
  const rappels = require('../src/services/rappels');
  const { query } = require('../src/db');
  const mois = (await appel('dir', '/api/paiements/mois')).donnees.mois[0];
  await query('DELETE FROM rappels_executions WHERE mois = $1', [mois]);
  const p = (await appel('dir', '/api/parametres')).donnees;
  const jour = rappels.dateRappel(mois, p);
  const a = await rappels.tacheQuotidienne(jour);
  const b = await rappels.tacheQuotidienne(jour);
  assert.strictEqual(a.length, 1);
  assert.strictEqual(b.length, 0);
  assert.ok(rappels.dateLimite(mois, p) > jour);
  // Nettoyage : laisse le vrai rappel du mois se déclencher normalement.
  await query('DELETE FROM rappels_executions WHERE mois = $1', [mois]);
  await query("DELETE FROM messages WHERE mois = $1 AND envoye_par IS NULL", [mois]);
});

test('appel, notes, bulletins, exports et cartes', async () => {
  const appelJour = (await appel('dir', `/api/presences/appel?classe_id=${classe.id}`)).donnees;
  // On remet tout le monde présent, puis on marque un absent : il doit être notifié une fois.
  const tousPresents = appelJour.eleves.map((x) => ({ inscription_id: x.inscription_id, statut: 'present' }));
  await appel('dir', '/api/presences/appel', { methode: 'POST', corps: { classe_id: classe.id, presences: tousPresents } });
  const presences = appelJour.eleves.map((x, i) => ({ inscription_id: x.inscription_id, statut: i === 0 ? 'absent' : 'present' }));
  const r = await appel('dir', '/api/presences/appel', { methode: 'POST', corps: { classe_id: classe.id, presences, notifier: true } });
  assert.strictEqual(r.statut, 200);
  assert.strictEqual(r.donnees.messages.length, 1);
  const r2 = await appel('dir', '/api/presences/appel', { methode: 'POST', corps: { classe_id: classe.id, presences, notifier: true } });
  assert.strictEqual(r2.donnees.messages.length, 0, 'pas de seconde notification pour la même absence');

  const saisie = (await appel('dir', `/api/notes/saisie?classe_id=${classe.id}&periode=2`)).donnees;
  const notes = saisie.eleves.flatMap((x, i) => saisie.matieres.map((m) => ({ inscription_id: x.inscription_id, matiere_id: m.id, note: (i % 10) })));
  assert.strictEqual((await appel('dir', '/api/notes/saisie', { methode: 'POST', corps: { classe_id: classe.id, periode: 2, notes } })).statut, 200);
  const res = (await appel('dir', `/api/notes/resultats?classe_id=${classe.id}&periode=2`)).donnees;
  assert.ok(res.lignes.every((l) => l.rang >= 1));
  const hors = await appel('dir', '/api/notes/saisie', { methode: 'POST', corps: { classe_id: classe.id, periode: 2, notes: [{ ...notes[0], note: 99 }] } });
  assert.strictEqual(hors.statut, 400);

  for (const c of [`/api/notes/bulletins.pdf?classe_id=${classe.id}&periode=2`, `/api/notes/bulletins.pdf?classe_id=${classe.id}&periode=0`,
    '/api/exports/eleves.xlsx', '/api/exports/eleves.pdf', '/api/exports/impayes.pdf', '/api/exports/impayes.xlsx', '/api/exports/paiements.xlsx',
    '/api/exports/depenses.pdf', '/api/exports/personnel.xlsx', '/api/exports/presences.pdf', '/api/exports/statut.pdf',
    `/api/exports/classe.pdf?classe_id=${classe.id}`, `/api/exports/cartes.pdf?classe_id=${classe.id}`]) {
    const x = await appel('dir', c);
    assert.strictEqual(x.statut, 200, `${c} -> ${x.statut} ${x.type.includes('json') ? JSON.stringify(x.donnees) : ''}`);
  }
  const mat = (await appel('dir', '/api/classes')).donnees.find((c) => c.cycle === 'maternelle');
  assert.strictEqual((await appel('dir', `/api/notes/bulletins.pdf?classe_id=${mat.id}&periode=1`)).statut, 200);
});

test('rôles : l\'enseignant ne voit que sa classe, la secrétaire n\'a pas accès aux salaires', async () => {
  await connecter('ens', 'enseignant', 'demo1234');
  await connecter('sec', 'secretaire', 'demo1234');
  const classesEns = (await appel('ens', '/api/classes')).donnees;
  assert.strictEqual(classesEns.length, 1);
  assert.strictEqual((await appel('ens', '/api/paiements')).statut, 403);
  assert.strictEqual((await appel('ens', `/api/classes/${classe.id}`)).statut, 403);
  const eleves = (await appel('ens', '/api/eleves')).donnees;
  assert.ok(eleves.every((e) => e.classe_id === classesEns[0].id));
  assert.strictEqual((await appel('sec', '/api/personnel/salaires')).statut, 403);
  assert.strictEqual((await appel('sec', '/api/paiements')).statut, 200);
  assert.strictEqual((await appel('sec', '/api/finances/bilan')).statut, 403);
});

test('archivage puis réinscription', async () => {
  assert.strictEqual((await appel('dir', `/api/eleves/${eleveId}/archiver`, { methode: 'POST', corps: { motif: 'Déménagement' } })).statut, 200);
  const archives = (await appel('dir', '/api/eleves?statut=archive')).donnees;
  assert.ok(archives.some((e) => e.id === eleveId));
  assert.strictEqual((await appel('dir', `/api/eleves/${eleveId}/reinscrire`, { methode: 'POST', corps: { classe_id: classe.id } })).statut, 200);
  const fiche = (await appel('dir', `/api/eleves/${eleveId}`)).donnees;
  assert.strictEqual(fiche.eleve.statut, 'actif');
  // Nettoyage
  const { query } = require('../src/db');
  await query('DELETE FROM messages WHERE eleve_id = $1', [eleveId]);
  await query('DELETE FROM eleves WHERE id = $1', [eleveId]);
});

test('passage en classe supérieure (aperçu)', async () => {
  const annees = (await appel('dir', '/api/annees')).donnees;
  const active = annees.find((a) => a.active);
  let suivante = annees.find((a) => a.date_debut > active.date_debut);
  if (!suivante) {
    const a = Number(active.libelle.slice(0, 4)) + 1;
    suivante = (await appel('dir', '/api/annees', { methode: 'POST', corps: { libelle: `${a}-${a + 1}`, date_debut: `${a}-10-01`, date_fin: `${a + 1}-07-31` } })).donnees;
  }
  const ap = (await appel('dir', `/api/annees/${suivante.id}/passage/apercu`, { methode: 'POST', corps: {} })).donnees;
  const cm2 = ap.plan.filter((p) => p.classe.startsWith('CM2') && p.decision === 'admis');
  assert.ok(cm2.every((p) => p.action === 'fin_cycle'));
  const ps = ap.plan.find((p) => p.classe.startsWith('Petite') && p.action === 'passe');
  if (ps) assert.strictEqual(ps.niveau_cible, 'Moyenne Section');
});
