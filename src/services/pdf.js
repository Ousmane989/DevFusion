'use strict';

// Génération des documents PDF : reçus, bulletins, cartes d'élève, listes.
// pdfkit utilise les polices standard (Helvetica) qui gèrent les accents
// français. Chaque fonction renvoie un Buffer.
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { one } = require('../db');
const { dateFr, nomMois, deMois, montant, MODES_PAIEMENT, objetPaiement, aujourdhui } = require('../utils');
const { lignesFacture } = require('./finance');

const COULEURS = {
  primaire: '#2E3192', // bleu du logo de l'école
  secondaire: '#23266F', // bleu foncé (en-têtes de tableaux)
  accent: '#9294DC', // bleu clair
  texte: '#1F2133',
  gris: '#5F6380',
  clair: '#EEF0FA',
  ligne: '#DDE0F0',
  zebre: '#F7F8FD',
};

// Logo officiel, utilisé tant qu'aucun autre logo n'est choisi dans les Paramètres.
const LOGO_ECOLE = (() => {
  try { return require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'public', 'img', 'logo.png')); } catch { return null; }
})();
const EMBLEME_ECOLE = (() => {
  try { return require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'public', 'img', 'embleme.png')); } catch { return null; }
})();

// Les polices standard des PDF (Helvetica) ne connaissent que l'alphabet latin
// courant (WinAnsi). Les autres caractères (signe −, emoji, lettres wolof/peules
// comme ŋ ou ɗ…) sortiraient illisibles : on les remplace par un équivalent proche.
const WINANSI_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
const EQUIVALENTS = { '−': '-', 'Ŋ': 'N', 'ŋ': 'n', 'Ɓ': 'B', 'ɓ': 'b', 'Ɗ': 'D', 'ɗ': 'd', 'Ƴ': 'Y', 'ƴ': 'y', '\u00a0': ' ', '\u202f': ' ' };
function texteImprimable(t) {
  if (typeof t !== 'string') return t;
  return [...t].map((ch) => {
    if (EQUIVALENTS[ch]) return EQUIVALENTS[ch];
    const c = ch.codePointAt(0);
    if (c === 10 || (c >= 32 && c <= 126) || (c >= 160 && c <= 255) || WINANSI_EXTRA.includes(ch)) return ch;
    const base = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // lettre accentuée rare -> lettre simple
    return /^[\x20-\x7e]$/.test(base) ? base : '';
  }).join('');
}

/** Exécute une fonction de dessin et renvoie le PDF en mémoire. */
function produire(options, dessiner) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 36, ...options, info: { Producer: 'Keur Xaleyi', Creator: 'Keur Xaleyi' } });
    // Tout texte passe par ici : caractères remplacés, et texte sur une seule ligne
    // (lineBreak: false + ellipsis) raccourci avec « … » s'il dépasse la largeur.
    const texteOrigine = doc.text.bind(doc);
    doc.text = (t, ...args) => {
      let texte = texteImprimable(t);
      const opts = args.find((a) => a && typeof a === 'object');
      if (typeof texte === 'string' && opts && opts.lineBreak === false && opts.ellipsis && opts.width) {
        if (doc.widthOfString(texte) > opts.width) {
          while (texte.length > 1 && doc.widthOfString(texte + '…') > opts.width) texte = texte.slice(0, -1);
          texte = texte.trimEnd() + '…';
        }
      }
      return texteOrigine(texte, ...args);
    };
    const largeurOrigine = doc.widthOfString.bind(doc);
    doc.widthOfString = (t, ...args) => largeurOrigine(texteImprimable(t), ...args);
    const morceaux = [];
    doc.on('data', (c) => morceaux.push(c));
    doc.on('end', () => resolve(Buffer.concat(morceaux)));
    doc.on('error', reject);
    Promise.resolve(dessiner(doc)).then(() => doc.end()).catch(reject);
  });
}

function imageDepuisDataUrl(dataUrl) {
  const m = /^data:image\/(png|jpe?g);base64,(.*)$/.exec(dataUrl || '');
  return m ? Buffer.from(m[2], 'base64') : null;
}

async function parametres() {
  return one('SELECT * FROM parametres WHERE id = 1');
}

/** Logo choisi dans les Paramètres, sinon logo officiel, sinon pastille « KX ». */
function dessinerLogo(doc, p, x, y, taille, { petit = false } = {}) {
  const cle = petit ? 'embleme' : 'logo';
  doc._kxImages = doc._kxImages || {};
  if (!(cle in doc._kxImages)) {
    // Image chargée une seule fois par document puis réutilisée sur chaque page
    // (sinon elle est recopiée à chaque facture/certificat : PDF de plusieurs dizaines de Mo).
    const brut = imageDepuisDataUrl(p.logo) || (petit ? EMBLEME_ECOLE : LOGO_ECOLE);
    try { doc._kxImages[cle] = brut ? doc.openImage(brut) : null; } catch { doc._kxImages[cle] = null; } // image illisible
  }
  const img = doc._kxImages[cle];
  if (img) {
    try { doc.image(img, x, y, { fit: [taille, taille], align: 'center', valign: 'center' }); return; } catch { /* image illisible */ }
  }
  doc.save().circle(x + taille / 2, y + taille / 2, taille / 2).fill(COULEURS.primaire);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(taille * 0.38)
    .text('KX', x, y + taille * 0.3, { width: taille, align: 'center' });
  doc.restore();
}

/** En-tête commun : logo, nom, coordonnées, titre du document. */
function entete(doc, p, titre, sousTitre) {
  const l = doc.page.margins.left;
  const largeur = doc.page.width - l - doc.page.margins.right;
  const y0 = doc.page.margins.top;
  dessinerLogo(doc, p, l, y0, 54);
  doc.fillColor(COULEURS.secondaire).font('Helvetica-Bold').fontSize(16).text(p.nom_ecole, l + 66, y0 + 2, { width: largeur - 66 });
  doc.fillColor(COULEURS.gris).font('Helvetica').fontSize(8.5);
  const coord = [p.slogan, p.adresse, [p.telephone && `Tél. ${p.telephone}`, p.email].filter(Boolean).join(' · ')].filter(Boolean);
  doc.text(coord.join('\n'), l + 66, doc.y + 1, { width: largeur - 66 });
  const yBande = Math.max(doc.y, y0 + 54) + 8;
  doc.rect(l, yBande, largeur, 3).fill(COULEURS.primaire);
  doc.rect(l + largeur * 0.7, yBande, largeur * 0.3, 3).fill(COULEURS.accent); // filet bleu clair
  doc.fillColor(COULEURS.texte).font('Helvetica-Bold').fontSize(14).text(titre, l, yBande + 12, { width: largeur, align: 'center' });
  if (sousTitre) doc.font('Helvetica').fontSize(9.5).fillColor(COULEURS.gris).text(sousTitre, { width: largeur, align: 'center' });
  doc.moveDown(0.8);
  doc.fillColor(COULEURS.texte);
}

function piedDePage(doc, p) {
  const l = doc.page.margins.left;
  const largeur = doc.page.width - l - doc.page.margins.right;
  const y = doc.page.height - doc.page.margins.bottom - 12;
  doc.font('Helvetica').fontSize(7.5).fillColor(COULEURS.gris)
    .text(`${p.nom_ecole} — document généré le ${dateFr(new Date().toISOString())}`, l, y, { width: largeur, align: 'center', lineBreak: false });
}

// ------------------------------------------------------------------
// Montant en lettres (reçus)
// ------------------------------------------------------------------
const U = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
const D = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

function moins100(n) {
  if (n < 17) return U[n];
  if (n < 20) return 'dix-' + U[n - 10];
  const d = Math.floor(n / 10); const u = n % 10;
  if (d === 7 || d === 9) {
    const r = n - (d === 7 ? 60 : 80);
    return D[d] + (r === 11 && d === 7 ? ' et onze' : '-' + moins100(r));
  }
  if (u === 0) return d === 8 ? 'quatre-vingts' : D[d];
  if (u === 1 && d !== 8) return D[d] + ' et un';
  return D[d] + '-' + U[u];
}

function moins1000(n, devantMille = false) {
  const c = Math.floor(n / 100); const r = n % 100;
  let s;
  if (c === 0) s = moins100(r);
  else {
    const prefixe = c === 1 ? 'cent' : U[c] + ' cent';
    s = r === 0 ? (c > 1 && !devantMille ? prefixe + 's' : prefixe) : prefixe + ' ' + moins100(r);
  }
  if (devantMille) s = s.replace(/quatre-vingts$/, 'quatre-vingt');
  return s;
}

function enLettres(nombre) {
  let n = Math.floor(Math.abs(nombre));
  if (n === 0) return 'zéro';
  const parties = [];
  const milliards = Math.floor(n / 1e9); n %= 1e9;
  const millions = Math.floor(n / 1e6); n %= 1e6;
  const milliers = Math.floor(n / 1000); n %= 1000;
  if (milliards) parties.push(moins1000(milliards) + (milliards > 1 ? ' milliards' : ' milliard'));
  if (millions) parties.push(moins1000(millions) + (millions > 1 ? ' millions' : ' million'));
  if (milliers) parties.push(milliers === 1 ? 'mille' : moins1000(milliers, true) + ' mille');
  if (n) parties.push(moins1000(n));
  return parties.join(' ');
}

// ------------------------------------------------------------------
// Reçu de paiement (format A5)
// ------------------------------------------------------------------
async function recu(numero) {
  const p = await parametres();
  const { query } = require('../db');
  const lignes = await query(
    `SELECT pa.*, e.matricule, e.nom, e.prenom, c.nom AS classe, a.libelle AS annee, u.nom_complet AS caissier,
            COALESCE(NULLIF(e.tuteur_nom,''), NULLIF(e.pere_nom,''), NULLIF(e.mere_nom,'')) AS parent
       FROM paiements pa JOIN inscriptions i ON i.id = pa.inscription_id JOIN eleves e ON e.id = i.eleve_id
       JOIN classes c ON c.id = i.classe_id JOIN annees_scolaires a ON a.id = i.annee_id
       LEFT JOIN utilisateurs u ON u.id = pa.encaisse_par
      WHERE pa.numero_recu = $1 ORDER BY pa.mois NULLS FIRST, pa.id`, [numero]);
  if (!lignes.length) return null;
  const r0 = lignes[0];
  const annule = lignes.every((l) => l.annule);
  const total = lignes.filter((l) => !l.annule).reduce((s, l) => s + l.montant, 0);

  return produire({ size: 'A5', margin: 30 }, (doc) => {
    entete(doc, p, 'REÇU DE PAIEMENT', `N° ${numero} — Année scolaire ${r0.annee}`);
    const l = doc.page.margins.left;
    const largeur = doc.page.width - l * 2;

    // Bloc élève
    const yBloc = doc.y;
    doc.roundedRect(l, yBloc, largeur, 70, 6).fill(COULEURS.clair);
    doc.fillColor(COULEURS.texte).font('Helvetica').fontSize(9.5);
    const info = [
      ['Élève', `${r0.prenom} ${r0.nom}`], ['Matricule', r0.matricule], ['Classe', r0.classe],
      ['Parent', r0.parent || '—'], ['Date', dateFr(r0.date_paiement)],
      ['Mode', MODES_PAIEMENT[r0.mode] + (r0.reference ? ` (réf. ${r0.reference})` : '')],
    ];
    info.forEach(([k, v], i) => {
      const col = i % 2; const lig = Math.floor(i / 2);
      const x = l + 10 + col * (largeur / 2); const y = yBloc + 8 + lig * 20;
      doc.font('Helvetica').fillColor(COULEURS.gris).fontSize(8).text(k, x, y);
      doc.font('Helvetica-Bold').fillColor(COULEURS.texte).fontSize(9.5).text(v, x, y + 9, { width: largeur / 2 - 16, lineBreak: false, ellipsis: true });
    });
    doc.y = yBloc + 82;

    // Détail
    const yT = doc.y;
    doc.rect(l, yT, largeur, 20).fill(COULEURS.secondaire);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9)
      .text('Désignation', l + 8, yT + 6).text('Montant', l, yT + 6, { width: largeur - 8, align: 'right' });
    let y = yT + 24;
    const pas = lignes.length > 8 ? 15 : 18; // lignes resserrées quand l'année entière est payée d'un coup
    for (const li of lignes) {
      const objet = objetPaiement(li.type, li.mois, li.remarque);
      const libelle = objet + (li.annule ? ' (annulé)' : '');
      doc.fillColor(li.annule ? COULEURS.gris : COULEURS.texte).font('Helvetica').fontSize(9.5);
      const hauteur = doc.heightOfString(texteImprimable(libelle), { width: largeur - 120 });
      doc.text(libelle, l + 8, y, { width: largeur - 120 })
        .text(montant(li.montant, p.devise), l, y, { width: largeur - 8, align: 'right' });
      y += Math.max(pas, hauteur + pas - 11);
      doc.moveTo(l, y - 4).lineTo(l + largeur, y - 4).lineWidth(0.5).strokeColor(COULEURS.ligne).stroke();
    }
    doc.rect(l, y, largeur, 24).fill(COULEURS.clair);
    doc.fillColor(COULEURS.primaire).font('Helvetica-Bold').fontSize(12)
      .text('TOTAL PAYÉ', l + 8, y + 7).text(montant(total, p.devise), l, y + 7, { width: largeur - 8, align: 'right' });
    y += 32;
    doc.fillColor(COULEURS.texte).font('Helvetica-Oblique').fontSize(9)
      .text(`Arrêté le présent reçu à la somme de : ${enLettres(total)} ${p.devise === 'FCFA' ? 'francs CFA' : 'ouguiyas'}.`, l, y, { width: largeur });

    if (annule) {
      doc.save().rotate(-25, { origin: [doc.page.width / 2, doc.page.height / 2] })
        .font('Helvetica-Bold').fontSize(60).fillColor('#C0392B').opacity(0.25)
        .text('ANNULÉ', 0, doc.page.height / 2 - 30, { width: doc.page.width, align: 'center' }).restore();
    }

    // Signatures
    const ySig = doc.page.height - doc.page.margins.bottom - 70;
    doc.opacity(1).font('Helvetica').fontSize(8.5).fillColor(COULEURS.gris)
      .text(`Encaissé par : ${r0.caissier || '—'}`, l, ySig)
      .text('Cachet et signature', l, ySig, { width: largeur, align: 'right' });
    doc.fontSize(7.5).text('Merci de conserver ce reçu. Aucun remboursement sans présentation du reçu.', l, ySig + 40, { width: largeur, align: 'center' });
    piedDePage(doc, p);
  });
}

// ------------------------------------------------------------------
// Facture d'inscription (format A5), remise au parent à l'inscription
// ------------------------------------------------------------------
/** Numéro de facture : FI + 2 chiffres de l'année scolaire + n° de l'inscription. */
function numeroFacture(insc) {
  return `FI${String(insc.date_debut).slice(2, 4)}-${String(insc.id).padStart(4, '0')}`;
}

async function factureInscription(inscriptionId) {
  const p = await parametres();
  const insc = await one(
    `SELECT i.*, e.matricule, e.nom, e.prenom, e.whatsapp, c.nom AS classe, a.libelle AS annee, a.date_debut,
            COALESCE(NULLIF(e.tuteur_nom,''), NULLIF(e.pere_nom,''), NULLIF(e.mere_nom,'')) AS parent,
            (SELECT COALESCE(SUM(montant),0) FROM paiements pa
              WHERE pa.inscription_id = i.id AND pa.type = 'inscription' AND NOT pa.annule) AS verse
       FROM inscriptions i JOIN eleves e ON e.id = i.eleve_id JOIN classes c ON c.id = i.classe_id
       JOIN annees_scolaires a ON a.id = i.annee_id WHERE i.id = $1`, [inscriptionId]);
  if (!insc) return null;
  const numero = numeroFacture(insc);
  const total = insc.frais_inscription;
  const verse = Math.min(insc.verse, total);
  const reste = Math.max(0, total - verse);
  const mensuel = insc.mensualite - insc.reduction;
  const devise = p.devise === 'FCFA' ? 'francs CFA' : 'ouguiyas';

  const buf = await produire({ size: 'A5', margin: 30 }, (doc) => {
    entete(doc, p, 'FACTURE D\'INSCRIPTION', `N° ${numero} — Année scolaire ${insc.annee}`);
    const l = doc.page.margins.left;
    const largeur = doc.page.width - l * 2;

    // Bloc élève
    const yBloc = doc.y;
    doc.roundedRect(l, yBloc, largeur, 70, 6).fill(COULEURS.clair);
    const info = [
      ['Élève', `${insc.prenom} ${insc.nom}`], ['Matricule', insc.matricule], ['Classe', insc.classe],
      ['Parent', insc.parent || '—'], ['Date d\'inscription', dateFr(insc.date_inscription)], ['WhatsApp', insc.whatsapp || '—'],
    ];
    info.forEach(([k, v], i) => {
      const col = i % 2; const lig = Math.floor(i / 2);
      const x = l + 10 + col * (largeur / 2); const y = yBloc + 8 + lig * 20;
      doc.font('Helvetica').fillColor(COULEURS.gris).fontSize(8).text(k, x, y);
      doc.font('Helvetica-Bold').fillColor(COULEURS.texte).fontSize(9.5).text(v, x, y + 9, { width: largeur / 2 - 16, lineBreak: false, ellipsis: true });
    });
    doc.y = yBloc + 82;

    // Détail
    const yT = doc.y;
    doc.rect(l, yT, largeur, 20).fill(COULEURS.secondaire);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9)
      .text('Désignation', l + 8, yT + 6).text('Montant', l, yT + 6, { width: largeur - 8, align: 'right' });
    let y = yT + 24;
    const ligne = (objet, valeur, { gras = false, couleur = COULEURS.texte } = {}) => {
      doc.fillColor(couleur).font(gras ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5)
        .text(objet, l + 8, y, { width: largeur - 120 })
        .text(valeur, l, y, { width: largeur - 8, align: 'right' });
      y += 18;
      doc.moveTo(l, y - 4).lineTo(l + largeur, y - 4).lineWidth(0.5).strokeColor(COULEURS.ligne).stroke();
    };
    ligne(`Frais d'inscription — ${insc.classe}`, montant(total, p.devise));
    ligne('Déjà versé', verse ? `- ${montant(verse, p.devise)}` : montant(0, p.devise), { couleur: COULEURS.gris });
    doc.rect(l, y, largeur, 24).fill(COULEURS.clair);
    doc.fillColor(COULEURS.primaire).font('Helvetica-Bold').fontSize(12)
      .text('RESTE À PAYER', l + 8, y + 7).text(montant(reste, p.devise), l, y + 7, { width: largeur - 8, align: 'right' });
    y += 32;
    doc.fillColor(COULEURS.texte).font('Helvetica-Oblique').fontSize(9)
      .text(`Arrêtée la présente facture à la somme de : ${enLettres(total)} ${devise}.`, l, y, { width: largeur });
    y = doc.y + 10;

    // Rappel des conditions de la scolarité
    const conditions = [
      `Mensualité : ${montant(mensuel, p.devise)} par mois`
        + (insc.reduction > 0 ? ` (au lieu de ${montant(insc.mensualite, p.devise)}, réduction : ${insc.reduction_motif || '—'})` : ''),
      // Même règle que les rappels et les factures du mois : avant le jour limite du mois concerné.
      `Chaque mensualité (d'octobre à juillet) est à payer avant le ${String(p.date_limite_jour).padStart(2, '0')} de chaque mois.`,
    ];
    doc.roundedRect(l, y, largeur, 40, 6).lineWidth(0.8).strokeColor(COULEURS.accent).stroke();
    doc.fillColor(COULEURS.texte).font('Helvetica').fontSize(8.5).text(conditions.join('\n'), l + 10, y + 8, { width: largeur - 20 });

    // Tampon « PAYÉE » quand les frais sont entièrement réglés
    if (total > 0 && reste === 0) {
      doc.save().rotate(-18, { origin: [doc.page.width / 2, doc.page.height / 2] })
        .font('Helvetica-Bold').fontSize(54).fillColor('#1E8E5A').opacity(0.22)
        .text('PAYÉE', 0, doc.page.height / 2 - 30, { width: doc.page.width, align: 'center' }).restore();
    }

    // Signatures
    const ySig = doc.page.height - doc.page.margins.bottom - 70;
    doc.opacity(1).font('Helvetica').fontSize(8.5).fillColor(COULEURS.gris)
      .text(`Fait le ${dateFr(new Date().toISOString())}`, l, ySig)
      .text('La Directrice — cachet et signature', l, ySig, { width: largeur, align: 'right' });
    doc.fontSize(7.5).text('Chaque versement donne lieu à un reçu. Merci de conserver vos reçus.', l, ySig + 40, { width: largeur, align: 'center' });
    piedDePage(doc, p);
  });
  return { numero, buf };
}

// ------------------------------------------------------------------
// Bulletin scolaire (une page A4 par élève)
// ------------------------------------------------------------------
const NIVEAUX_APP = { A: 'Acquis', EC: 'En cours', NA: 'Non acquis' };

async function bulletins(resultats, inscriptionIds, observations = {}) {
  const p = await parametres();
  const { classe, periode } = resultats;
  const libPeriode = periode > 0 ? `${p.libelle_periode} ${periode}` : 'Bilan annuel';
  const lignes = resultats.lignes.filter((l) => !inscriptionIds || inscriptionIds.includes(l.inscription_id));

  return produire({ size: 'A4', margin: 40, autoFirstPage: false }, (doc) => {
    for (const el of lignes) {
      doc.addPage();
      entete(doc, p, 'BULLETIN DE NOTES', `${libPeriode} — Année scolaire ${classe.annee}`);
      const l = doc.page.margins.left;
      const largeur = doc.page.width - l * 2;

      const yB = doc.y;
      doc.roundedRect(l, yB, largeur, 46, 6).fill(COULEURS.clair);
      doc.fillColor(COULEURS.texte).font('Helvetica-Bold').fontSize(12).text(`${el.prenom} ${el.nom}`, l + 12, yB + 8);
      doc.font('Helvetica').fontSize(9).fillColor(COULEURS.gris)
        .text(`Matricule : ${el.matricule}   ·   Classe : ${classe.nom}   ·   Enseignant(e) : ${classe.enseignant || '—'}`, l + 12, yB + 26);
      if (resultats.cycle === 'primaire' && el.rang) {
        doc.font('Helvetica-Bold').fontSize(11).fillColor(COULEURS.primaire)
          .text(`Rang : ${el.rang}${el.rang === 1 ? 'er' : 'e'} / ${resultats.stats.classes ?? resultats.stats.evalues}`, l, yB + 8, { width: largeur - 12, align: 'right' });
      } else if (resultats.cycle === 'primaire' && el.moyenne !== null && el.notes_manquantes) {
        doc.font('Helvetica-Oblique').fontSize(9).fillColor(COULEURS.gris)
          .text(`Non classé(e) : ${el.notes_manquantes} note(s) manquante(s)`, l, yB + 10, { width: largeur - 12, align: 'right' });
      }
      doc.y = yB + 58;

      if (resultats.cycle === 'primaire') {
        const cols = periode > 0
          ? [['Matière', 0.42], ['Coef.', 0.1], ['Note', 0.16], ['Sur 10', 0.14], ['Points', 0.18]]
          : [['Période', 0.5], ['Moyenne / 10', 0.5]];
        let y = doc.y;
        doc.rect(l, y, largeur, 20).fill(COULEURS.secondaire);
        let x = l;
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
        for (const [t, w] of cols) { doc.text(t, x + 6, y + 6, { width: largeur * w - 12, align: t === cols[0][0] ? 'left' : 'center' }); x += largeur * w; }
        y += 20;
        const rows = periode > 0
          ? el.notes.map((n) => [n.matiere, String(n.coefficient), n.note === null ? '—' : `${n.note} / ${n.bareme}`,
            n.note === null ? '—' : (n.note / n.bareme * 10).toFixed(2), n.note === null ? '—' : (n.note / n.bareme * 10 * n.coefficient).toFixed(2)])
          : el.moyennes_periodes.map((m, i) => [`${p.libelle_periode} ${i + 1}`, m === null ? '—' : m.toFixed(2)]);
        rows.forEach((r, i) => {
          if (i % 2) doc.rect(l, y, largeur, 18).fill(COULEURS.zebre);
          let xx = l;
          doc.fillColor(COULEURS.texte).font('Helvetica').fontSize(9.5);
          r.forEach((v, j) => { doc.text(v, xx + 6, y + 5, { width: largeur * cols[j][1] - 12, align: j === 0 ? 'left' : 'center' }); xx += largeur * cols[j][1]; });
          y += 18;
        });
        doc.rect(l, y, largeur, 26).fill(COULEURS.clair);
        doc.fillColor(COULEURS.primaire).font('Helvetica-Bold').fontSize(12)
          .text(`MOYENNE GÉNÉRALE : ${el.moyenne === null ? '—' : el.moyenne.toFixed(2) + ' / 10'}`, l + 10, y + 8)
          .text(el.appreciation || '', l, y + 8, { width: largeur - 10, align: 'right' });
        y += 36;
        const s = resultats.stats;
        doc.fillColor(COULEURS.gris).font('Helvetica').fontSize(9)
          .text(`Moyenne de la classe : ${s.moyenne_classe ?? '—'}   ·   Plus forte : ${s.plus_forte ?? '—'}   ·   Plus faible : ${s.plus_faible ?? '—'}   ·   Effectif : ${s.effectif}`, l, y, { width: largeur, align: 'center' });
        doc.y = y + 22;
      } else {
        // Maternelle : appréciations par compétence, regroupées par domaine.
        let y = doc.y;
        let domaine = null;
        resultats.competences.forEach((c, i) => {
          if (c.domaine !== domaine) {
            domaine = c.domaine;
            doc.rect(l, y, largeur, 18).fill(COULEURS.secondaire);
            doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9.5).text(domaine, l + 8, y + 5);
            ['Acquis', 'En cours', 'Non acquis'].forEach((t, k) => doc.text(t, l + largeur * (0.58 + k * 0.14), y + 5, { width: largeur * 0.14, align: 'center' }));
            y += 18;
          }
          const niv = el.appreciations[i].niveau;
          doc.fillColor(COULEURS.texte).font('Helvetica').fontSize(9.5).text(c.libelle, l + 8, y + 5, { width: largeur * 0.56 });
          ['A', 'EC', 'NA'].forEach((code, k) => {
            const cx = l + largeur * (0.58 + k * 0.14) + largeur * 0.07;
            doc.circle(cx, y + 9, 5).lineWidth(0.8).strokeColor(COULEURS.ligne).stroke();
            if (niv === code) doc.circle(cx, y + 9, 3.5).fill(code === 'A' ? '#2E8B57' : code === 'EC' ? COULEURS.accent : '#C0392B');
          });
          y += 18;
          doc.moveTo(l, y).lineTo(l + largeur, y).lineWidth(0.4).strokeColor(COULEURS.ligne).stroke();
        });
        doc.y = y + 10;
        doc.fillColor(COULEURS.gris).font('Helvetica').fontSize(8.5)
          .text(`Légende : ${Object.values(NIVEAUX_APP).join(' · ')}`, l, doc.y, { width: largeur, align: 'center' });
        doc.moveDown(1);
      }

      // Observation et signatures
      const obs = observations[el.inscription_id];
      const yO = doc.y + 6;
      doc.roundedRect(l, yO, largeur, 60, 6).lineWidth(0.8).strokeColor(COULEURS.ligne).stroke();
      doc.fillColor(COULEURS.gris).font('Helvetica-Bold').fontSize(9).text('Observation de l\'enseignant(e)', l + 10, yO + 8);
      doc.fillColor(COULEURS.texte).font('Helvetica').fontSize(9.5).text(obs || '', l + 10, yO + 22, { width: largeur - 20, height: 34, ellipsis: true });
      const ySig = yO + 80;
      doc.fillColor(COULEURS.gris).fontSize(9)
        .text('L\'enseignant(e)', l, ySig, { width: largeur / 3, align: 'center' })
        .text('La Direction', l + largeur / 3, ySig, { width: largeur / 3, align: 'center' })
        .text('Le parent', l + (2 * largeur) / 3, ySig, { width: largeur / 3, align: 'center' });
      piedDePage(doc, p);
    }
    if (!lignes.length) { doc.addPage(); doc.text('Aucun élève.'); }
  });
}

// ------------------------------------------------------------------
// Cartes d'élève avec photo et QR code (8 cartes par page A4)
// ------------------------------------------------------------------
async function cartes(eleves, annee) {
  const p = await parametres();
  const W = 243; const H = 153; // 85,6 × 54 mm (format carte bancaire)
  const qrs = await Promise.all(eleves.map((e) => QRCode.toBuffer(
    `${p.nom_ecole}|${e.matricule}|${e.prenom} ${e.nom}|${e.classe}|${e.whatsapp || ''}`, { margin: 0, width: 160, errorCorrectionLevel: 'M' })));

  return produire({ size: 'A4', margin: 40 }, (doc) => {
    const x0 = 40 + (doc.page.width - 80 - 2 * W - 20) / 2;
    eleves.forEach((e, i) => {
      const k = i % 8;
      if (i > 0 && k === 0) doc.addPage();
      const x = x0 + (k % 2) * (W + 20);
      const y = 40 + Math.floor(k / 2) * (H + 34);
      doc.save();
      doc.roundedRect(x, y, W, H, 10).lineWidth(0.6).strokeColor('#BBBBBB').stroke();
      doc.roundedRect(x, y, W, 34, 10).clip().rect(x, y, W, 34).fill(COULEURS.primaire);
      doc.restore();
      doc.rect(x, y + 34, W, 3).fill(COULEURS.accent);
      doc.circle(x + 20, y + 17, 13).fill('#FFFFFF');
      dessinerLogo(doc, p, x + 9, y + 6, 22, { petit: true });
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10.5).text(p.nom_ecole.toUpperCase(), x + 38, y + 7, { width: W - 46, lineBreak: false, ellipsis: true });
      doc.font('Helvetica').fontSize(7).text(`Carte scolaire ${annee || ''}`, x + 38, y + 21);
      // Photo
      const photo = imageDepuisDataUrl(e.photo);
      doc.roundedRect(x + 10, y + 44, 62, 76, 4).lineWidth(0.6).strokeColor(COULEURS.ligne).stroke();
      if (photo) { try { doc.image(photo, x + 11, y + 45, { fit: [60, 74], align: 'center', valign: 'center' }); } catch { /* ignorée */ } }
      else doc.fillColor(COULEURS.gris).fontSize(7).text('Photo', x + 10, y + 78, { width: 62, align: 'center' });
      // Identité
      const xi = x + 80;
      doc.fillColor(COULEURS.secondaire).font('Helvetica-Bold').fontSize(10).text(e.nom, xi, y + 46, { width: 100, lineBreak: false, ellipsis: true });
      doc.fillColor(COULEURS.texte).font('Helvetica').fontSize(9).text(e.prenom, xi, y + 59, { width: 100, lineBreak: false, ellipsis: true });
      doc.fontSize(7.5).fillColor(COULEURS.gris)
        .text(`Classe : ${e.classe}`, xi, y + 76)
        .text(`Matricule : ${e.matricule}`, xi, y + 87)
        .text(`Né(e) le : ${dateFr(e.date_naissance) || '—'}`, xi, y + 98)
        .text(`Urgence : ${e.whatsapp || '—'}`, xi, y + 109);
      doc.image(qrs[i], x + W - 58, y + 46, { width: 48 });
      doc.fillColor(COULEURS.gris).fontSize(6).text(p.telephone ? `École : ${p.telephone}` : '', x + 10, y + H - 16, { width: W - 20, align: 'center' });
    });
    if (!eleves.length) doc.text('Aucun élève sélectionné.');
  });
}

// ------------------------------------------------------------------
// Tableau générique (listes, exports)
// colonnes : [{ titre, cle, largeur (relative), align }]
// ------------------------------------------------------------------
async function tableau(titre, sousTitre, colonnes, lignes, { paysage = false, total } = {}) {
  const p = await parametres();
  return produire({ size: 'A4', layout: paysage ? 'landscape' : 'portrait', margin: 32 }, (doc) => {
    entete(doc, p, titre, sousTitre);
    const l = doc.page.margins.left;
    const largeur = doc.page.width - l * 2;
    const somme = colonnes.reduce((s, c) => s + (c.largeur || 1), 0);
    const W = colonnes.map((c) => ((c.largeur || 1) / somme) * largeur);
    const basPage = () => doc.page.height - doc.page.margins.bottom - 24;

    const enteteTableau = (y) => {
      doc.rect(l, y, largeur, 18).fill(COULEURS.secondaire);
      let x = l;
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5);
      colonnes.forEach((c, i) => { doc.text(c.titre, x + 4, y + 5, { width: W[i] - 8, align: c.align || 'left', lineBreak: false, ellipsis: true }); x += W[i]; });
      return y + 18;
    };

    let y = enteteTableau(doc.y);
    lignes.forEach((ligne, n) => {
      doc.font('Helvetica').fontSize(8.5);
      const h = Math.max(16, ...colonnes.map((c, i) => doc.heightOfString(String(ligne[c.cle] ?? ''), { width: W[i] - 8 }) + 6));
      if (y + h > basPage()) { piedDePage(doc, p); doc.addPage(); y = enteteTableau(doc.page.margins.top); }
      if (n % 2) doc.rect(l, y, largeur, h).fill(COULEURS.zebre);
      let x = l;
      doc.fillColor(COULEURS.texte).font('Helvetica').fontSize(8.5);
      colonnes.forEach((c, i) => { doc.text(String(ligne[c.cle] ?? ''), x + 4, y + 4, { width: W[i] - 8, align: c.align || 'left' }); x += W[i]; });
      y += h;
    });
    if (!lignes.length) { doc.fillColor(COULEURS.gris).fontSize(10).text('Aucune donnée.', l, y + 10, { width: largeur, align: 'center' }); y += 30; }
    doc.moveTo(l, y).lineTo(l + largeur, y).lineWidth(0.5).strokeColor(COULEURS.ligne).stroke();
    doc.fillColor(COULEURS.gris).font('Helvetica').fontSize(8.5)
      .text(`${lignes.length} ligne(s)${total ? '   ·   ' + total : ''}`, l, y + 6, { width: largeur, align: 'right' });
    piedDePage(doc, p);
  });
}

// ------------------------------------------------------------------
// Certificats de scolarité : 2 par page A4 (haut / bas), à découper.
// Chaque certificat : { eleve, naissance, sexe, filiation, classe, annee, date }
// ou null pour un certificat vierge à remplir à la main.
// ------------------------------------------------------------------
const DEMI_PAGE = 841.89 / 2;

function enteteCertificat(p) {
  const lignes = String(p.entete_certificat || '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (lignes.length) return lignes;
  return [p.nom_ecole.toUpperCase(), p.adresse].filter(Boolean);
}

function dessinerCertificat(doc, p, c, y0) {
  const x = 48; const xFin = 547;
  const noir = '#111111';
  // En-tête : lignes à gauche, logo à droite, téléphone centré.
  let y = y0 + 26;
  doc.fillColor(noir).font('Helvetica-Bold').fontSize(9.5);
  for (const l of enteteCertificat(p)) { doc.text(l, x, y, { width: 330, lineBreak: false, ellipsis: true }); y += 15; }
  dessinerLogo(doc, p, 445, y0 + 18, 72);
  if (p.telephone) {
    doc.font('Helvetica-Bold').fontSize(9.5).text(`Tél : ${p.telephone}`, x, Math.max(y + 2, y0 + 98), { width: xFin - x, align: 'center' });
  }
  // Titre souligné
  const yTitre = y0 + 122;
  doc.font('Helvetica-Bold').fontSize(17).text('CERTIFICAT DE SCOLARITÉ', x, yTitre, { width: xFin - x, align: 'center', underline: true });

  // Ligne « libellé ..... valeur ..... » : valeur en gras sur pointillés.
  const ligne = (libelle, valeur, yy, { fin = xFin } = {}) => {
    doc.font('Helvetica').fontSize(10.5).fillColor(noir);
    doc.text(libelle, x, yy, { lineBreak: false });
    let xv = x + doc.widthOfString(libelle) + 5;
    if (valeur) {
      let taille = 11;
      doc.font('Helvetica-Bold').fontSize(taille);
      while (doc.widthOfString(valeur) > fin - xv - 6 && taille > 7.5) { taille -= 0.5; doc.fontSize(taille); }
      doc.text(valeur, xv, yy - (taille - 10.5) / 2, { lineBreak: false });
      xv += doc.widthOfString(valeur) + 6;
    }
    if (fin - xv > 8) {
      doc.save().moveTo(xv, yy + 10).lineTo(fin, yy + 10).dash(1, { space: 2.2 }).lineWidth(0.7).strokeColor('#555555').stroke().restore();
    }
  };

  const nomEcole = `« ${p.nom_ecole.toUpperCase()} »`;
  let yy = y0 + 160;
  const pas = 25;
  // Première phrase : la directrice
  doc.font('Helvetica').fontSize(10.5).fillColor(noir);
  if (p.directrice_nom) {
    doc.text(`Je soussignée, ${p.directrice_nom}, Directrice Générale de l'école `, x, yy, { continued: true, lineBreak: false })
      .font('Helvetica-Bold').text(nomEcole, { lineBreak: false });
  } else {
    ligne('Je soussignée,', '', yy, { fin: 300 });
    doc.font('Helvetica').fontSize(10.5).text(', Directrice Générale de l\'école ', 302, yy, { continued: true, lineBreak: false })
      .font('Helvetica-Bold').text(nomEcole, { lineBreak: false });
  }
  yy += pas;
  ligne('Certifie que l\'élève', c && c.eleve, yy); yy += pas;
  ligne('Date et lieu de naissance', c && c.naissance, yy); yy += pas;
  const fil = !c ? 'Fils ou Fille de' : c.sexe === 'M' ? 'Fils de' : c.sexe === 'F' ? 'Fille de' : 'Fils ou Fille de';
  ligne(fil, c && c.filiation, yy); yy += pas;
  ligne('Est inscrit(e) dans mon établissement et fréquente', c && c.classe, yy); yy += pas;
  ligne('Année scolaire :', c && c.annee, yy, { fin: 330 }); yy += pas + 12;

  // Lieu et date, puis signature
  doc.font('Helvetica').fontSize(10.5);
  const ville = p.ville || '';
  const libFait = ville ? `Fait à ${ville} le` : 'Fait à';
  const xFait = 230;
  if (ville) ligne(libFait, c && c.date, yy, { fin: 470 });
  else {
    doc.text('Fait à', xFait, yy, { lineBreak: false });
    doc.save().moveTo(xFait + 32, yy + 10).lineTo(xFait + 130, yy + 10).dash(1, { space: 2.2 }).lineWidth(0.7).strokeColor('#555555').stroke().restore();
    doc.text('le', xFait + 136, yy, { lineBreak: false });
    if (c && c.date) doc.font('Helvetica-Bold').text(c.date, xFait + 150, yy, { lineBreak: false });
    else doc.save().moveTo(xFait + 150, yy + 10).lineTo(470, yy + 10).dash(1, { space: 2.2 }).lineWidth(0.7).strokeColor('#555555').stroke().restore();
  }
  doc.font('Helvetica-Bold').fontSize(11.5).fillColor(noir).text('LA DIRECTION', 400, yy + 30, { width: 140, align: 'center', underline: true });
}

async function certificats(liste) {
  const p = await parametres();
  const items = liste.length ? liste : [null, null];
  return produire({ size: 'A4', margin: 0, autoFirstPage: false }, (doc) => {
    for (let i = 0; i < items.length; i += 2) {
      doc.addPage();
      dessinerCertificat(doc, p, items[i], 0);
      if (i + 1 < items.length) {
        // Ligne de découpe au milieu de la page
        doc.save().moveTo(18, DEMI_PAGE).lineTo(577, DEMI_PAGE).dash(4, { space: 3 }).lineWidth(0.6).strokeColor('#888888').stroke().restore();
        doc.rect(262, DEMI_PAGE - 6, 72, 12).fill('#FFFFFF');
        doc.fillColor('#888888').font('Helvetica').fontSize(7).text('couper ici', 262, DEMI_PAGE - 3.5, { width: 72, align: 'center', lineBreak: false });
        dessinerCertificat(doc, p, items[i + 1], DEMI_PAGE);
      }
    }
  });
}

// ------------------------------------------------------------------
// Factures de mensualité : 2 par feuille A4 (à couper en deux)
// ------------------------------------------------------------------
/** Numéro de facture du mois : FM + année/mois + n° de l'inscription (ex. FM2611-0042). */
const numeroFactureMois = (mois, inscriptionId) => `FM${mois.slice(2, 4)}${mois.slice(5, 7)}-${String(inscriptionId).padStart(4, '0')}`;

// Chaque facture occupe une demi-feuille A4 (hauteur = 421 pt) ; la signature est en bas de sa partie.
function dessinerFactureMois(doc, p, f, y0, { mois, annee, limite, enRetard, hauteur }) {
  const l = 36; const largeur = 595.28 - 72;
  // En-tête : logo, école, coordonnées / titre et numéro
  dessinerLogo(doc, p, l, y0 + 16, 38);
  doc.fillColor(COULEURS.secondaire).font('Helvetica-Bold').fontSize(13).text(p.nom_ecole, l + 46, y0 + 19, { width: 280, lineBreak: false, ellipsis: true });
  doc.fillColor(COULEURS.gris).font('Helvetica').fontSize(7.5)
    .text([p.adresse, p.telephone && `Tél. ${p.telephone}`].filter(Boolean).join(' · '), l + 46, y0 + 35, { width: 280, lineBreak: false, ellipsis: true });
  doc.fillColor(COULEURS.primaire).font('Helvetica-Bold').fontSize(12)
    .text('FACTURE — MENSUALITÉ', l, y0 + 18, { width: largeur, align: 'right', lineBreak: false });
  doc.fillColor(COULEURS.gris).font('Helvetica').fontSize(7.5)
    .text(`N° ${numeroFactureMois(mois, f.inscription_id)} · Année ${annee}`, l, y0 + 35, { width: largeur, align: 'right', lineBreak: false });
  doc.rect(l, y0 + 58, largeur, 2).fill(COULEURS.primaire);

  // Élève (une seule ligne de 4 informations)
  const yI = y0 + 65;
  doc.roundedRect(l, yI, largeur, 28, 4).fill(COULEURS.clair);
  const infos = [['Élève', `${f.prenom} ${f.nom}`, 0.34], ['Classe', f.classe, 0.16], ['Matricule', f.matricule, 0.18], ['Parent', f.parent || '—', 0.32]];
  let x = l + 8;
  for (const [k, v, part] of infos) {
    const w = largeur * part - 8;
    doc.font('Helvetica').fillColor(COULEURS.gris).fontSize(6.8).text(k, x, yI + 4, { lineBreak: false });
    doc.font('Helvetica-Bold').fillColor(COULEURS.texte).fontSize(8.8).text(v, x, yI + 14, { width: w, lineBreak: false, ellipsis: true });
    x += largeur * part;
  }

  // Détail : montant, avance déjà versée, reste à payer (les parents paient souvent en plusieurs fois)
  let y = yI + 34;
  const cM = largeur - 250; const cV = largeur - 165; const cR = largeur - 80; // positions des colonnes chiffrées
  doc.rect(l, y, largeur, 14).fill(COULEURS.secondaire);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8)
    .text('Désignation', l + 8, y + 3.5, { lineBreak: false })
    .text('Montant', l + cM, y + 3.5, { width: 78, align: 'right', lineBreak: false })
    .text('Avance versée', l + cV, y + 3.5, { width: 78, align: 'right', lineBreak: false })
    .text('Reste à payer', l + cR, y + 3.5, { width: 72, align: 'right', lineBreak: false });
  y += 17;
  const ligne = (texte, du, verse, reste) => {
    doc.fillColor(COULEURS.texte).font('Helvetica').fontSize(8.5)
      .text(texte, l + 8, y, { width: cM - 12, lineBreak: false, ellipsis: true })
      .text(montant(du, p.devise), l + cM, y, { width: 78, align: 'right', lineBreak: false });
    doc.fillColor(verse > 0 ? '#1E8E5A' : COULEURS.gris).text(verse > 0 ? montant(verse, p.devise) : '—', l + cV, y, { width: 78, align: 'right', lineBreak: false });
    doc.fillColor(COULEURS.texte).font('Helvetica-Bold').text(montant(reste, p.devise), l + cR, y, { width: 72, align: 'right', lineBreak: false });
    y += 13;
    doc.moveTo(l, y - 2.5).lineTo(l + largeur, y - 2.5).lineWidth(0.4).strokeColor(COULEURS.ligne).stroke();
  };
  // Lignes calculées, ou celles modifiées à la main par la directrice pour cet élève
  const lignes = f.modifiee ? f.modifiee.lignes : lignesFacture(f, mois, (n) => montant(n, p.devise));
  for (const x of lignes) ligne(x.libelle, x.montant, x.verse, Math.max(0, x.montant - x.verse));
  const totalDu = lignes.reduce((t, x) => t + x.montant, 0);
  const totalVerse = lignes.reduce((t, x) => t + x.verse, 0);
  doc.rect(l, y, largeur, 19).fill(COULEURS.clair);
  doc.fillColor(COULEURS.primaire).font('Helvetica-Bold').fontSize(9)
    .text('TOTAL', l + 8, y + 5.5, { lineBreak: false })
    .text(montant(totalDu, p.devise), l + cM, y + 5.5, { width: 78, align: 'right', lineBreak: false })
    .text(montant(totalVerse, p.devise), l + cV, y + 5.5, { width: 78, align: 'right', lineBreak: false });
  doc.fontSize(10.5).text(montant(f.total, p.devise), l + cR - 10, y + 4.5, { width: 82, align: 'right', lineBreak: false });
  y += 23;
  doc.fillColor(COULEURS.primaire).font('Helvetica-Bold').fontSize(10)
    .text(f.total > 0 ? `RESTE À PAYER : ${montant(f.total, p.devise)}` : '', l, y, { width: largeur, align: 'right', lineBreak: false });
  // Date choisie à la main (facture modifiée), tant qu'elle n'est pas dépassée
  const dateMain = f.modifiee && f.modifiee.date_limite >= aujourdhui() ? f.modifiee.date_limite : null;
  const retard = f.total > 0 && !dateMain && enRetard;
  doc.fillColor(retard ? '#C0392B' : COULEURS.texte).font('Helvetica-Bold').fontSize(9)
    .text(f.total > 0 ? `${retard ? 'EN RETARD — à payer avant le' : 'À payer avant le'} ${dateMain ? jourMois(dateMain) : limite}`
      : totalDu <= 0 ? 'Montant de la mensualité non encore fixé.' : f.modifiee ? 'Facture réglée. Merci !' : 'Mensualité réglée. Merci !',
    l, y, { width: largeur / 2, lineBreak: false });
  doc.font('Helvetica').fontSize(7.5).fillColor(COULEURS.gris)
    .text('Un reçu est remis à chaque versement. Les avances sont déduites du reste à payer.', l, y + 13, { width: largeur, lineBreak: false });
  if (f.modifiee && f.modifiee.note) {
    doc.font('Helvetica-Oblique').fontSize(8).fillColor(COULEURS.texte)
      .text(`Note : ${f.modifiee.note}`, l, y + 25, { width: largeur, height: 22, ellipsis: true });
  }

  if (f.total === 0 && totalDu > 0) {
    doc.save().rotate(-12, { origin: [l + largeur / 2, y0 + 140] })
      .font('Helvetica-Bold').fontSize(40).fillColor('#1E8E5A').opacity(0.2)
      .text('PAYÉE', l, y0 + 122, { width: largeur, align: 'center', lineBreak: false }).restore();
  }
  // Pied : date et signature
  const yS = y0 + hauteur - 30;
  doc.opacity(1).fillColor(COULEURS.gris).font('Helvetica').fontSize(7.5)
    .text(`Fait le ${dateFr(new Date().toISOString())}`, l, yS, { lineBreak: false })
    .text('La Direction', l, yS, { width: largeur, align: 'right', lineBreak: false });
}

/** Ligne pointillée « couper ici » à la hauteur y. */
function ligneDecoupe(doc, y) {
  doc.save().moveTo(18, y).lineTo(577, y).dash(4, { space: 3 }).lineWidth(0.6).strokeColor('#888888').stroke().restore();
  doc.rect(262, y - 6, 72, 12).fill('#FFFFFF');
  doc.fillColor('#888888').font('Helvetica').fontSize(7).text('couper ici', 262, y - 3.5, { width: 72, align: 'center', lineBreak: false });
}

/** « 2026-11-05 » → « 05 novembre 2026 » */
const jourMois = (iso) => `${String(iso).slice(8, 10)} ${nomMois(String(iso))}`;

/** PDF des factures de mensualité d'un mois : 2 factures par feuille A4, à couper en deux. */
const FACTURES_PAR_FEUILLE = 2;
async function facturesMensualite(liste, mois) {
  const p = await parametres();
  const a = await one('SELECT libelle FROM annees_scolaires WHERE active');
  const { limiteFacture } = require('./rappels');
  const hauteur = 841.89 / FACTURES_PAR_FEUILLE;
  const lim = limiteFacture(mois, p); // mois passé : prochaine date limite, mention « en retard »
  const ctx = { mois, annee: a ? a.libelle : '', limite: jourMois(lim.limite), enRetard: lim.enRetard, hauteur };
  return produire({ size: 'A4', margin: 0, autoFirstPage: false }, (doc) => {
    for (let i = 0; i < liste.length; i += FACTURES_PAR_FEUILLE) {
      doc.addPage();
      for (let k = 0; k < FACTURES_PAR_FEUILLE && i + k < liste.length; k++) {
        if (k > 0) ligneDecoupe(doc, hauteur * k);
        // La facture commence un peu plus bas : marge haute plus confortable sur une demi-feuille.
        dessinerFactureMois(doc, p, liste[i + k], hauteur * k + 14, { ...ctx, hauteur: hauteur - 14 });
      }
    }
  });
}

module.exports = { texteImprimable, recu, facturesMensualite, factureInscription, bulletins, cartes, tableau, certificats, enLettres, COULEURS };
