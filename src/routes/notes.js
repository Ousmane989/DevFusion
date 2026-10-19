'use strict';

// Notes (primaire), appréciations par compétence (maternelle), résultats,
// classement et bulletins PDF.
const express = require('express');
const { query, one, tx } = require('../db');
const { ah, HttpError, exiger, remplir } = require('../utils');
const { autoriser, verifierClasse } = require('../auth');
const { resultatsClasse, infosClasse, elevesClasse } = require('../services/notes');
const pdf = require('../services/pdf');
const { envoyerMessages } = require('../services/whatsapp');
const { signer, baseUrl } = require('../services/liens');

const router = express.Router();

async function verifierPeriode(periode, annuelAutorise = false) {
  const p = await one('SELECT nb_periodes FROM parametres WHERE id = 1');
  const n = Number(periode);
  if (!Number.isInteger(n) || n < (annuelAutorise ? 0 : 1) || n > p.nb_periodes) throw new HttpError(400, 'Période invalide.');
  return n;
}

async function observationsDe(inscriptionIds, periode) {
  const rows = await query('SELECT * FROM observations WHERE inscription_id = ANY($1) AND periode = $2', [inscriptionIds, periode]);
  return Object.fromEntries(rows.map((r) => [r.inscription_id, r.texte]));
}

// ---- Grille de saisie ----
router.get('/saisie', ah(async (req, res) => {
  exiger(req.query, ['classe_id', 'periode']);
  verifierClasse(req, req.query.classe_id);
  const periode = await verifierPeriode(req.query.periode);
  const classe = await infosClasse(req.query.classe_id);
  if (!classe) throw new HttpError(404, 'Classe introuvable.');
  const eleves = await elevesClasse(classe.id);
  const ids = eleves.map((e) => e.inscription_id);
  const observations = await observationsDe(ids, periode);
  if (classe.cycle === 'maternelle') {
    const competences = await query('SELECT * FROM competences ORDER BY ordre, domaine, libelle');
    const valeurs = await query('SELECT inscription_id, competence_id, niveau FROM appreciations WHERE periode = $1 AND inscription_id = ANY($2)', [periode, ids]);
    return res.json({ classe, periode, cycle: 'maternelle', competences, eleves, valeurs, observations });
  }
  const matieres = await query('SELECT * FROM matieres WHERE $1 = ANY(niveaux) ORDER BY ordre, nom', [classe.niveau_code]);
  const valeurs = await query('SELECT inscription_id, matiere_id, note FROM notes WHERE periode = $1 AND inscription_id = ANY($2)', [periode, ids]);
  res.json({ classe, periode, cycle: 'primaire', matieres, eleves, valeurs, observations });
}));

router.post('/saisie', autoriser('directeur', 'enseignant'), ah(async (req, res) => {
  exiger(req.body, ['classe_id', 'periode']);
  verifierClasse(req, req.body.classe_id);
  const periode = await verifierPeriode(req.body.periode);
  const valides = new Set((await elevesClasse(req.body.classe_id)).map((e) => e.inscription_id));
  const baremes = Object.fromEntries((await query('SELECT id, bareme FROM matieres')).map((m) => [m.id, m.bareme]));
  await tx(async (c) => {
    for (const n of req.body.notes || []) {
      if (!valides.has(Number(n.inscription_id)) || !baremes[n.matiere_id]) continue;
      if (n.note === null || n.note === '' || n.note === undefined) {
        await c.query('DELETE FROM notes WHERE inscription_id = $1 AND matiere_id = $2 AND periode = $3', [n.inscription_id, n.matiere_id, periode]);
        continue;
      }
      const v = Number(String(n.note).replace(',', '.'));
      if (!(v >= 0 && v <= baremes[n.matiere_id])) throw new HttpError(400, `Note invalide (${n.note}) : elle doit être entre 0 et ${baremes[n.matiere_id]}.`);
      await c.query(
        `INSERT INTO notes (inscription_id, matiere_id, periode, note, saisi_par) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (inscription_id, matiere_id, periode) DO UPDATE SET note = EXCLUDED.note, saisi_par = EXCLUDED.saisi_par, updated_at = now()`,
        [n.inscription_id, n.matiere_id, periode, v, req.user.id]);
    }
    for (const a of req.body.appreciations || []) {
      if (!valides.has(Number(a.inscription_id))) continue;
      if (!a.niveau) {
        await c.query('DELETE FROM appreciations WHERE inscription_id = $1 AND competence_id = $2 AND periode = $3', [a.inscription_id, a.competence_id, periode]);
        continue;
      }
      if (!['A', 'EC', 'NA'].includes(a.niveau)) throw new HttpError(400, 'Appréciation invalide.');
      await c.query(
        `INSERT INTO appreciations (inscription_id, competence_id, periode, niveau, saisi_par) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (inscription_id, competence_id, periode) DO UPDATE SET niveau = EXCLUDED.niveau, saisi_par = EXCLUDED.saisi_par, updated_at = now()`,
        [a.inscription_id, a.competence_id, periode, a.niveau, req.user.id]);
    }
    for (const o of req.body.observations || []) {
      if (!valides.has(Number(o.inscription_id))) continue;
      if (!o.texte) await c.query('DELETE FROM observations WHERE inscription_id = $1 AND periode = $2', [o.inscription_id, periode]);
      else {
        await c.query(
          `INSERT INTO observations (inscription_id, periode, texte) VALUES ($1,$2,$3)
           ON CONFLICT (inscription_id, periode) DO UPDATE SET texte = EXCLUDED.texte`, [o.inscription_id, periode, o.texte]);
      }
    }
  });
  res.json({ ok: true });
}));

// ---- Résultats, moyennes et classement ----
router.get('/resultats', ah(async (req, res) => {
  exiger(req.query, ['classe_id', 'periode']);
  verifierClasse(req, req.query.classe_id);
  const periode = await verifierPeriode(req.query.periode, true);
  const r = await resultatsClasse(req.query.classe_id, periode);
  if (!r) throw new HttpError(404, 'Classe introuvable.');
  res.json(r);
}));

// ---- Bulletins PDF (toute la classe ou un élève) ----
router.get('/bulletins.pdf', ah(async (req, res) => {
  exiger(req.query, ['classe_id', 'periode']);
  verifierClasse(req, req.query.classe_id);
  const periode = await verifierPeriode(req.query.periode, true);
  const r = await resultatsClasse(req.query.classe_id, periode);
  if (!r) throw new HttpError(404, 'Classe introuvable.');
  const ids = req.query.inscription_id ? [Number(req.query.inscription_id)] : null;
  const obs = periode > 0 ? await observationsDe(r.lignes.map((l) => l.inscription_id), periode) : {};
  const buf = await pdf.bulletins(r, ids, obs);
  res.type('application/pdf').set('Content-Disposition', `inline; filename="bulletins-${r.classe.nom}-P${periode}.pdf"`).send(buf);
}));

// ---- Envoi des résultats aux parents par WhatsApp ----
router.post('/bulletins/envoyer', autoriser('directeur'), ah(async (req, res) => {
  exiger(req.body, ['classe_id', 'periode']);
  const periode = await verifierPeriode(req.body.periode, true);
  const r = await resultatsClasse(req.body.classe_id, periode);
  if (!r) throw new HttpError(404, 'Classe introuvable.');
  const p = await one('SELECT * FROM parametres WHERE id = 1');
  const libPeriode = periode > 0 ? `${p.libelle_periode.toLowerCase()} ${periode}` : 'bilan annuel';
  const cibles = r.lignes.filter((l) => !req.body.inscription_ids || req.body.inscription_ids.includes(l.inscription_id));
  const liste = cibles.map((l) => {
    const cle = `bulletin:${l.inscription_id}:${periode}`;
    const lien = `${baseUrl(req)}/bulletin/${l.inscription_id}/${periode}?s=${signer(cle)}`;
    return {
      telephone: l.whatsapp, destinataire: l.parent, eleve_id: l.eleve_id,
      texte: remplir(p.modele_bulletin, {
        nom_parent: l.parent, nom_eleve: `${l.prenom} ${l.nom}`, classe: r.classe.nom, periode: libPeriode,
        moyenne: l.moyenne === null || l.moyenne === undefined ? '—' : `${l.moyenne}/10`, rang: l.rang || '—',
        effectif: r.stats ? r.stats.evalues : r.lignes.length, ecole: p.nom_ecole,
      }),
      document: { link: lien, filename: `bulletin-${l.nom}-${l.prenom}.pdf` },
    };
  });
  res.json(await envoyerMessages(liste, { type: 'bulletin', userId: req.user.id, canal: req.body.manuel ? 'manuel' : undefined }));
}));

module.exports = router;
module.exports.observationsDe = observationsDe;
