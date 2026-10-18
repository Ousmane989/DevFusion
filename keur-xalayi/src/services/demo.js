'use strict';

// Données de démonstration (élèves, paiements, présences, notes…) pour
// découvrir la plateforme. Ajoutées seulement si aucun élève n'existe.
// Mot de passe des comptes « secretaire » et « enseignant » : DEMO_MOT_DE_PASSE (défaut demo1234).
const bcrypt = require('bcryptjs');
const { query, one } = require('../db');
const { aujourdhui, moisEntre, debutMois } = require('../utils');

// Données fictives d'une école de Dakar (Sénégal), montants en FCFA.
const PRENOMS_G = ['Moussa', 'Mamadou', 'Cheikh', 'Ibrahima', 'Abdoulaye', 'Babacar', 'Modou', 'Pape', 'Serigne', 'Ousmane', 'Alioune', 'Lamine', 'Omar', 'Assane', 'Saliou', 'Malick'];
const PRENOMS_F = ['Fatou', 'Awa', 'Aminata', 'Khady', 'Ndèye', 'Mariama', 'Astou', 'Adama', 'Bineta', 'Coumba', 'Seynabou', 'Dieynaba', 'Aïssatou', 'Rokhaya', 'Mame Diarra', 'Sokhna'];
const NOMS = ['DIOP', 'NDIAYE', 'FALL', 'SOW', 'BA', 'DIALLO', 'SECK', 'GUEYE', 'FAYE', 'SARR', 'MBAYE', 'DIOUF', 'CISSÉ', 'THIAM', 'NIANG', 'KANE'];
const QUARTIERS = ['Médina', 'Parcelles Assainies', 'Grand Yoff', 'Sicap Liberté', 'HLM', 'Ouakam', 'Pikine', 'Guédiawaye'];
const LIEUX = ['Dakar', 'Dakar', 'Dakar', 'Pikine', 'Rufisque', 'Thiès', 'Kaolack', 'Saint-Louis'];
const TARIFS = { PS: [20000, 15000], MS: [20000, 15000], GS: [20000, 17500], CI: [25000, 17500], CP: [25000, 17500], CE1: [25000, 17500], CE2: [25000, 20000], CM1: [30000, 22500], CM2: [30000, 22500] };

const alea = (t) => t[Math.floor(Math.random() * t.length)];
const tel = () => '+221' + alea(['77', '78', '76', '70', '75']) + String(Math.floor(Math.random() * 1e7)).padStart(7, '0');

async function demo() {
  const n = await one('SELECT COUNT(*) AS n FROM eleves');
  if (n.n > 0) { console.log('  Des élèves existent déjà : données de démonstration ignorées.'); return; }
  // Verrou : si plusieurs instances démarrent en même temps, une seule remplit la base.
  await query('CREATE TABLE IF NOT EXISTS demo_verrou (id INTEGER PRIMARY KEY)');
  const verrou = await query('INSERT INTO demo_verrou VALUES (1) ON CONFLICT DO NOTHING RETURNING id');
  if (!verrou.length) return;
  const annee = await one('SELECT * FROM annees_scolaires WHERE active');

  await query(`UPDATE parametres SET adresse = 'Dakar, Sénégal', telephone = '+221 33 800 00 00', slogan = 'École maternelle et primaire', devise = 'FCFA', indicatif_defaut = '+221' WHERE id = 1`);
  for (const [code, [frais, mens]] of Object.entries(TARIFS)) {
    await query('UPDATE niveaux SET frais_inscription = $1, mensualite = $2 WHERE code = $3', [frais, mens, code]);
  }

  // Personnel : un titulaire par classe + employés.
  const classes = await query(`SELECT c.*, n.code, n.cycle FROM classes c JOIN niveaux n ON n.id = c.niveau_id WHERE c.annee_id = $1 ORDER BY n.ordre`, [annee.id]);
  const profs = [];
  for (const c of classes) {
    const f = Math.random() < 0.6;
    const p = await one(
      `INSERT INTO personnel (nom, prenom, sexe, telephone, poste, salaire_base, date_embauche) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [alea(NOMS), f ? alea(PRENOMS_F) : alea(PRENOMS_G), f ? 'F' : 'M', tel(), c.cycle === 'maternelle' ? 'Enseignante maternelle' : 'Enseignant', c.cycle === 'maternelle' ? 110000 : 130000, '2022-10-01']);
    await query('UPDATE classes SET enseignant_id = $1 WHERE id = $2', [p.id, c.id]);
    profs.push(p);
  }
  await query(`INSERT INTO personnel (nom, prenom, sexe, telephone, poste, salaire_base) VALUES
    ('SY', 'Aminata', 'F', '+221771234567', 'Secrétaire', 100000), ('FALL', 'Moussa', 'M', '+221781234567', 'Gardien', 75000)`);

  // Comptes de démonstration.
  const motDePasseDemo = process.env.DEMO_MOT_DE_PASSE || 'demo1234';
  const hash = await bcrypt.hash(motDePasseDemo, 10);
  await query(`INSERT INTO utilisateurs (identifiant, mot_de_passe, nom_complet, role) VALUES ('secretaire', $1, 'Aminata Sy', 'secretaire') ON CONFLICT DO NOTHING`, [hash]);
  const cp = classes.find((c) => c.code === 'CE1');
  const profCE1 = profs[classes.indexOf(cp)];
  await query(`INSERT INTO utilisateurs (identifiant, mot_de_passe, nom_complet, role, personnel_id) VALUES ('enseignant', $1, $2, 'enseignant', $3) ON CONFLICT DO NOTHING`,
    [hash, `${profCE1.prenom} ${profCE1.nom}`, profCE1.id]);

  // Élèves : 6 à 10 par classe.
  const debut = annee.date_debut;
  const moisEchus = moisEntre(debut, aujourdhui()).filter((m) => m <= debutMois(aujourdhui()));
  const directeur = await one(`SELECT id FROM utilisateurs WHERE role = 'directeur' ORDER BY id LIMIT 1`);
  let nbEleves = 0;
  for (const c of classes) {
    const [frais, mens] = TARIFS[c.code];
    const ageBase = { PS: 3, MS: 4, GS: 5, CI: 6, CP: 7, CE1: 8, CE2: 9, CM1: 10, CM2: 11 }[c.code];
    const nb = 6 + Math.floor(Math.random() * 5);
    for (let k = 0; k < nb; k++) {
      const garcon = Math.random() < 0.5;
      const nom = alea(NOMS);
      const seq = await one("SELECT nextval('seq_matricule') AS n");
      const naissance = `${Number(debut.slice(0, 4)) - ageBase}-${String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')}-${String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')}`;
      const e = await one(
        `INSERT INTO eleves (matricule, nom, prenom, sexe, date_naissance, lieu_naissance, pere_nom, mere_nom, whatsapp, adresse, remarques)
         VALUES ($1,$2,$3,$4,$5,$11,$6,$7,$8,$9,$10) RETURNING id`,
        [`KX${debut.slice(2, 4)}-${String(seq.n).padStart(4, '0')}`, nom, garcon ? alea(PRENOMS_G) : alea(PRENOMS_F), garcon ? 'M' : 'F', naissance,
          `${alea(PRENOMS_G)} ${nom}`, `${alea(PRENOMS_F)} ${alea(NOMS)}`, tel(), alea(QUARTIERS),
          Math.random() < 0.08 ? alea(['Allergie aux arachides', 'Asthme : ventoline dans le cartable', 'Ne pas laisser partir seul']) : null, alea(LIEUX)]);
      const reduction = Math.random() < 0.12 ? Math.round((mens * 0.25) / 500) * 500 : 0; // fratrie / cas social
      const insc = await one(
        `INSERT INTO inscriptions (eleve_id, annee_id, classe_id, date_inscription, frais_inscription, mensualite, reduction, reduction_motif)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [e.id, annee.id, c.id, debut, frais, mens, reduction, reduction ? alea(['Fratrie', 'Cas social']) : null]);
      nbEleves++;

      // Paiements : frais d'inscription + mensualités échues (certaines impayées ou partielles).
      const enregistrer = async (type, mois, montant, date) => {
        const s = await one("SELECT nextval('seq_recu') AS n");
        await query(
          `INSERT INTO paiements (inscription_id, type, mois, montant, date_paiement, mode, numero_recu, encaisse_par) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [insc.id, type, mois, montant, date, alea(['especes', 'especes', 'wave', 'wave', 'orange_money', 'free_money']), `R${date.slice(2, 4)}${date.slice(5, 7)}-${String(s.n).padStart(5, '0')}`, directeur.id]);
      };
      await enregistrer('inscription', null, frais, debut);
      for (const m of moisEchus) {
        const r = Math.random();
        const jour = `${m.slice(0, 8)}${String(2 + Math.floor(Math.random() * 12)).padStart(2, '0')}`;
        const date = jour > aujourdhui() ? aujourdhui() : jour;
        if (r < 0.65) await enregistrer('mensualite', m, mens - reduction, date);
        else if (r < 0.8) await enregistrer('mensualite', m, Math.round((mens - reduction) / 2), date);
      }

      // Présences des jours ouvrés écoulés.
      for (let d = new Date(`${debut}T12:00:00`); d <= new Date(); d.setDate(d.getDate() + 1)) {
        if (d.getDay() === 0 || d.getDay() === 6) continue;
        const r = Math.random();
        await query(`INSERT INTO presences (inscription_id, date, statut) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [insc.id, aujourdhui(d), r < 0.9 ? 'present' : r < 0.96 ? 'absent' : 'retard']);
      }

      // Quelques notes du 1er trimestre (primaire) ou appréciations (maternelle).
      if (c.cycle === 'primaire') {
        const mats = await query('SELECT * FROM matieres WHERE $1 = ANY(niveaux)', [c.code]);
        const niveauEleve = 4 + Math.random() * 5;
        for (const m of mats) {
          const note = Math.max(0, Math.min(m.bareme, Math.round((niveauEleve + (Math.random() * 3 - 1.5)) * (m.bareme / 10) * 2) / 2));
          await query('INSERT INTO notes (inscription_id, matiere_id, periode, note) VALUES ($1,$2,1,$3)', [insc.id, m.id, note]);
        }
      } else {
        const comps = await query('SELECT id FROM competences');
        for (const cpt of comps) {
          await query('INSERT INTO appreciations (inscription_id, competence_id, periode, niveau) VALUES ($1,$2,1,$3)', [insc.id, cpt.id, alea(['A', 'A', 'EC', 'EC', 'NA'])]);
        }
      }
    }
  }

  // Dépenses, salaires et calendrier.
  const m0 = debut.slice(0, 8);
  await query(`INSERT INTO depenses (date, categorie, libelle, montant, saisi_par) VALUES
    ($1::date + 2, 'Loyer', 'Loyer du bâtiment — octobre', 350000, $2),
    ($1::date + 5, 'Fournitures', 'Craies, cahiers, feutres', 45000, $2),
    ($1::date + 9, 'Électricité', 'Facture SENELEC', 38000, $2),
    ($1::date + 10, 'Eau', 'Facture SEN''EAU', 12000, $2),
    ($1::date + 12, 'Entretien / Réparations', 'Réparation des tables CP', 25000, $2)`, [`${m0}01`, directeur.id]);
  for (const p of await query('SELECT * FROM personnel WHERE actif')) {
    await query('INSERT INTO salaires (personnel_id, mois, montant, date_paiement, saisi_par) VALUES ($1,$2,$3,$4,$5)', [p.id, `${m0}01`, p.salaire_base, `${m0}05`, directeur.id]);
  }
  const a = Number(debut.slice(0, 4));
  await query(`INSERT INTO evenements (titre, type, date_debut, date_fin, description) VALUES
    ('Rentrée scolaire', 'evenement', $1, $1, 'Accueil des élèves et des parents'),
    ('Réunion des parents', 'reunion', $2, $2, 'Présentation de l''année'),
    ('Compositions du 1er trimestre', 'examen', $4, $5, NULL),
    ('Vacances de Noël', 'vacances', $6, $7, NULL),
    ('Fête de l''Indépendance du Sénégal', 'ferie', $3, $3, '4 avril'),
    ('Examen du CFEE (CM2)', 'examen', $8, $8, 'Date à confirmer selon le calendrier officiel')`,
  [`${a}-10-01`, `${a}-10-24`, `${a + 1}-04-04`, `${a}-12-15`, `${a}-12-19`, `${a}-12-22`, `${a + 1}-01-04`, `${a + 1}-06-22`]);

  // Emploi du temps type pour toutes les classes.
  for (const c of classes) {
    const cours = c.cycle === 'maternelle'
      ? [['08:00', '09:00', 'Accueil et langage'], ['09:00', '10:00', 'Graphisme'], ['10:00', '10:30', 'Récréation'], ['10:30', '12:00', 'Jeux éducatifs']]
      : [['08:00', '10:00', 'Français'], ['10:00', '10:30', 'Récréation'], ['10:30', '12:00', 'Mathématiques'], ['15:00', '16:30', 'Arabe']];
    for (let j = 1; j <= 5; j++) for (const [d, f, m] of cours) await query('INSERT INTO emploi_du_temps (classe_id, jour, heure_debut, heure_fin, matiere) VALUES ($1,$2,$3,$4,$5)', [c.id, j, d, f, m]);
  }
  console.log(`  ✔ Démonstration : ${nbEleves} élèves, ${profs.length} enseignants. Comptes : secretaire / enseignant.`);
}

module.exports = { demo };
