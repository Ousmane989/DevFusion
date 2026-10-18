'use strict';

// Génération des documents PDF : reçus, bulletins, cartes d'élève, listes.
// pdfkit utilise les polices standard (Helvetica) qui gèrent les accents
// français. Chaque fonction renvoie un Buffer.
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { one } = require('../db');
const { dateFr, nomMois, montant, MODES_PAIEMENT } = require('../utils');

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

/** Exécute une fonction de dessin et renvoie le PDF en mémoire. */
function produire(options, dessiner) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 36, ...options, info: { Producer: 'Keur Xalayi', Creator: 'Keur Xalayi' } });
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
  const img = imageDepuisDataUrl(p.logo) || (petit ? EMBLEME_ECOLE : LOGO_ECOLE);
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
    for (const li of lignes) {
      const objet = li.type === 'mensualite' ? `Mensualité de ${nomMois(li.mois)}`
        : li.type === 'inscription' ? 'Frais d\'inscription' : (li.remarque || 'Autre paiement');
      doc.fillColor(li.annule ? COULEURS.gris : COULEURS.texte).font('Helvetica').fontSize(9.5)
        .text(objet + (li.annule ? ' (annulé)' : ''), l + 8, y, { width: largeur - 120 })
        .text(montant(li.montant, p.devise), l, y, { width: largeur - 8, align: 'right' });
      y += 18;
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
          .text(`Rang : ${el.rang}${el.rang === 1 ? 'er' : 'e'} / ${resultats.stats.evalues}`, l, yB + 8, { width: largeur - 12, align: 'right' });
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
      doc.fillColor(COULEURS.texte).font('Helvetica').fontSize(9.5).text(obs || '', l + 10, yO + 22, { width: largeur - 20, height: 34 });
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
    `${p.nom_ecole}|${e.matricule}|${e.prenom} ${e.nom}|${e.classe}|${e.whatsapp}`, { margin: 0, width: 160, errorCorrectionLevel: 'M' })));

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
        .text(`Urgence : ${e.whatsapp}`, xi, y + 109);
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

module.exports = { recu, bulletins, cartes, tableau, enLettres, COULEURS };
